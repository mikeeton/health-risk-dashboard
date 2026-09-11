"""Withings OAuth and webhook ingestion.

Webhook fields are never treated as measurements. They only identify the
connected Withings user and time window; measurements are fetched from the
authenticated Withings Data API before validation and persistence.
"""

from datetime import datetime, timedelta, timezone
import json
import logging
from urllib.parse import parse_qs, urlencode

from cryptography.fernet import Fernet, InvalidToken
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.responses import RedirectResponse
import httpx
from sqlalchemy.orm import Session

import models
from access_control import get_accessible_patient, require_roles
from auth_utils import create_access_token, decode_access_token, get_current_user
from config import get_settings
from database import get_db
from live_updates import publish
from measurement_ingestion import PatientUpdate, ingest_vital
from routes.audit import write_audit_log
from routes.live_simulator import calculate_risk_score, get_risk_level


router = APIRouter(prefix="/integrations/withings", tags=["Withings"])
settings = get_settings()
WITHINGS_API = "https://wbsapi.withings.net"
WITHINGS_AUTHORIZE = "https://account.withings.com/oauth2_user/authorize2"
logger = logging.getLogger(__name__)

WITHINGS_VITAL_MEASURE_TYPES = {
    "heart_rate": 11,
    "spo2": 54,
    "systolic_bp": 10,
    "diastolic_bp": 9,
}
WIDE_VITAL_FIELDS = (
    "heart_rate",
    "spo2",
    "systolic_bp",
    "diastolic_bp",
    "steps",
    "sleep_hours",
    "active_minutes",
    "calories",
)


def utc_now_naive():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def integration_configured() -> bool:
    return all(
        (
            settings.withings_client_id,
            settings.withings_client_secret,
            settings.withings_redirect_uri,
            settings.withings_webhook_url,
            settings.integration_encryption_key,
        )
    )


def cipher() -> Fernet:
    try:
        return Fernet(settings.integration_encryption_key.encode())
    except (ValueError, TypeError) as error:
        raise HTTPException(
            status_code=503,
            detail="Withings encryption is not configured correctly",
        ) from error


def encrypt_token(value: str) -> str:
    return cipher().encrypt(value.encode()).decode()


def decrypt_token(value: str) -> str:
    try:
        return cipher().decrypt(value.encode()).decode()
    except InvalidToken as error:
        raise HTTPException(
            status_code=503,
            detail="Stored Withings authorization cannot be decrypted",
        ) from error


async def withings_post(
    path: str,
    data: dict,
    *,
    access_token: str | None = None,
) -> dict:
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            response = await client.post(
                f"{WITHINGS_API}{path}",
                data=data,
                headers=headers,
            )
            response.raise_for_status()
            payload = response.json()
    except (httpx.HTTPError, ValueError) as error:
        raise HTTPException(
            status_code=502,
            detail="Withings service is temporarily unavailable",
        ) from error
    if payload.get("status") != 0:
        raise HTTPException(
            status_code=502,
            detail=f"Withings rejected the request (status {payload.get('status')})",
        )
    return payload.get("body", {})


async def valid_access_token(connection: models.WithingsConnection, db: Session):
    if connection.token_expires_at > utc_now_naive() + timedelta(minutes=2):
        return decrypt_token(connection.access_token_encrypted)

    body = await withings_post(
        "/v2/oauth2",
        {
            "action": "requesttoken",
            "grant_type": "refresh_token",
            "client_id": settings.withings_client_id,
            "client_secret": settings.withings_client_secret,
            "refresh_token": decrypt_token(connection.refresh_token_encrypted),
        },
    )
    connection.access_token_encrypted = encrypt_token(body["access_token"])
    connection.refresh_token_encrypted = encrypt_token(body["refresh_token"])
    connection.token_expires_at = utc_now_naive() + timedelta(
        seconds=int(body.get("expires_in", 10800))
    )
    connection.updated_at = utc_now_naive()
    db.commit()
    return body["access_token"]


@router.get("/configuration")
def configuration(
    current_user: models.User = Depends(get_current_user),
):
    return {
        "configured": integration_configured(),
        "webhook_url": settings.withings_webhook_url if integration_configured() else None,
    }


@router.get("/connect/{patient_id}")
def connect(
    patient_id: int,
    demo: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not integration_configured():
        raise HTTPException(status_code=503, detail="Withings is not configured")
    require_roles(current_user, {"doctor", "nurse", "patient"})
    get_accessible_patient(db, patient_id, current_user)
    state = create_access_token(
        {
            "token_type": "withings_oauth",
            "patient_id": patient_id,
            "connected_by_user_id": current_user.id,
        }
    )
    parameters = {
        "response_type": "code",
        "client_id": settings.withings_client_id,
        "scope": "user.info,user.metrics,user.activity",
        "redirect_uri": settings.withings_redirect_uri,
        "state": state,
    }
    if demo:
        parameters["mode"] = "demo"
    return {"authorization_url": f"{WITHINGS_AUTHORIZE}?{urlencode(parameters)}"}


@router.get("/callback")
async def callback(
    code: str,
    state: str,
    db: Session = Depends(get_db),
):
    payload = decode_access_token(state)
    if not payload or payload.get("token_type") != "withings_oauth":
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")
    patient_id = int(payload["patient_id"])
    connected_by_user_id = int(payload["connected_by_user_id"])
    if not db.query(models.Patient).filter(models.Patient.id == patient_id).first():
        raise HTTPException(status_code=404, detail="Patient not found")

    body = await withings_post(
        "/v2/oauth2",
        {
            "action": "requesttoken",
            "grant_type": "authorization_code",
            "client_id": settings.withings_client_id,
            "client_secret": settings.withings_client_secret,
            "code": code,
            "redirect_uri": settings.withings_redirect_uri,
        },
    )
    connection = (
        db.query(models.WithingsConnection)
        .filter(models.WithingsConnection.patient_id == patient_id)
        .first()
    )
    if not connection:
        connection = models.WithingsConnection(
            patient_id=patient_id,
            connected_by_user_id=connected_by_user_id,
            withings_userid=str(body["userid"]),
            access_token_encrypted="",
            refresh_token_encrypted="",
            token_expires_at=utc_now_naive(),
        )
        db.add(connection)
    connection.withings_userid = str(body["userid"])
    connection.access_token_encrypted = encrypt_token(body["access_token"])
    connection.refresh_token_encrypted = encrypt_token(body["refresh_token"])
    connection.token_expires_at = utc_now_naive() + timedelta(
        seconds=int(body.get("expires_in", 10800))
    )
    connection.scopes = body.get("scope")
    connection.updated_at = utc_now_naive()
    db.commit()

    await withings_post(
        "",
        {
            "action": "subscribe",
            "callbackurl": settings.withings_webhook_url,
            "appli": 4,
            "comment": "Health Risk Dashboard BP, HR and SpO2",
        },
        access_token=body["access_token"],
    )
    write_audit_log(
        db=db,
        action="WITHINGS_CONNECTED",
        entity="Patient",
        entity_id=str(patient_id),
        user_email=(
            db.query(models.User.email)
            .filter(models.User.id == connected_by_user_id)
            .scalar()
        ),
    )
    return RedirectResponse(
        f"{settings.frontend_url}/?withings=connected",
        status_code=303,
    )


@router.head("/webhook", status_code=204)
def webhook_verification():
    return Response(status_code=204)


def measurement_values(group: dict) -> dict[int, float]:
    values = {}
    for item in group.get("measures", []):
        try:
            values[int(item["type"])] = float(item["value"]) * (
                10 ** int(item.get("unit", 0))
            )
        except (KeyError, TypeError, ValueError):
            continue
    return values


def map_withings_vital(values: dict[int, float]) -> tuple[dict, list[str]]:
    """Map only values actually supplied by Withings; never synthesize gaps."""
    mapped = {
        field: values[measure_type]
        for field, measure_type in WITHINGS_VITAL_MEASURE_TYPES.items()
        if measure_type in values
    }
    if "heart_rate" in mapped:
        mapped["heart_rate"] = round(mapped["heart_rate"])
    if "spo2" in mapped:
        mapped["spo2"] = round(mapped["spo2"], 1)
    if "systolic_bp" in mapped:
        mapped["systolic_bp"] = round(mapped["systolic_bp"])
    if "diastolic_bp" in mapped:
        mapped["diastolic_bp"] = round(mapped["diastolic_bp"])
    missing = [field for field in WIDE_VITAL_FIELDS if field not in mapped]
    return mapped, missing


@router.post("/webhook", status_code=204)
async def webhook(request: Request, db: Session = Depends(get_db)):
    parsed = parse_qs((await request.body()).decode("utf-8", errors="ignore"))
    userid = (parsed.get("userid") or [""])[0]
    appli = (parsed.get("appli") or [""])[0]
    startdate = (parsed.get("startdate") or [""])[0]
    enddate = (parsed.get("enddate") or [""])[0]
    if not userid or appli != "4" or not startdate or not enddate:
        return Response(status_code=204)

    connection = (
        db.query(models.WithingsConnection)
        .filter(models.WithingsConnection.withings_userid == userid)
        .first()
    )
    if not connection:
        return Response(status_code=204)

    token = await valid_access_token(connection, db)
    body = await withings_post(
        "/measure",
        {
            "action": "getmeas",
            "startdate": startdate,
            "enddate": enddate,
        },
        access_token=token,
    )
    for group in body.get("measuregrps", []):
        external_id = f"withings:{userid}:{group.get('grpid')}"
        values = measurement_values(group)
        mapped, missing = map_withings_vital(values)
        if missing:
            logger.warning(
                "Skipping incomplete Withings measurement",
                extra={
                    "patient_id": connection.patient_id,
                    "external_id": external_id,
                    "missing_fields": missing,
                },
            )
            continue
        risk_score = calculate_risk_score(
            mapped["heart_rate"],
            mapped["spo2"],
            mapped["systolic_bp"],
            mapped["diastolic_bp"],
            mapped["sleep_hours"],
        )
        measured_at = datetime.fromtimestamp(
            int(group.get("date", enddate)), tz=timezone.utc
        ).isoformat()
        last_checkup = datetime.now(timezone.utc).date().isoformat()
        connection.last_sync_at = utc_now_naive()
        result = ingest_vital(
            db,
            {
                "patient_id": connection.patient_id,
                "timestamp": measured_at,
                **mapped,
                "risk_score": risk_score,
                "activity_state": "withings_device",
            },
            source="withings",
            external_id=external_id,
            patient_update=PatientUpdate(
                risk_level=get_risk_level(risk_score),
                last_checkup=last_checkup,
            ),
            post_ingest_hook=lambda vital: publish(
                connection.patient_id,
                {
                    "id": str(vital.id),
                    "patientId": connection.patient_id,
                    "timestamp": vital.timestamp,
                    "heartRate": vital.heart_rate,
                    "spo2": vital.spo2,
                    "systolicBP": vital.systolic_bp,
                    "diastolicBP": vital.diastolic_bp,
                    "steps": vital.steps,
                    "sleepHours": vital.sleep_hours,
                    "activeMinutes": vital.active_minutes,
                    "calories": vital.calories,
                    "riskScore": vital.risk_score,
                    "activityState": vital.activity_state,
                    "source": vital.source,
                    "persisted": True,
                },
            ),
        )
        if not result.created:
            continue
        await result.hook_result
    return Response(status_code=204)


@router.get("/status/{patient_id}")
def connection_status(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_accessible_patient(db, patient_id, current_user)
    connection = (
        db.query(models.WithingsConnection)
        .filter(models.WithingsConnection.patient_id == patient_id)
        .first()
    )
    return {
        "configured": integration_configured(),
        "connected": bool(connection),
        "last_sync_at": connection.last_sync_at if connection else None,
    }


@router.delete("/connection/{patient_id}", status_code=204)
def disconnect(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_roles(current_user, {"doctor", "patient"})
    get_accessible_patient(db, patient_id, current_user)
    connection = (
        db.query(models.WithingsConnection)
        .filter(models.WithingsConnection.patient_id == patient_id)
        .first()
    )
    if connection:
        db.delete(connection)
        db.commit()
        write_audit_log(
            db=db,
            action="WITHINGS_DISCONNECTED",
            entity="Patient",
            entity_id=str(patient_id),
            user_email=current_user.email,
        )
