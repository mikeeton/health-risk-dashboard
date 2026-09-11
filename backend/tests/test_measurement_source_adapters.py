import asyncio
from datetime import datetime
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import models
import schemas
from database import Base
from measurement_ingestion import IngestionResult
from routes import integrations_withings, live_simulator, role_actions, vitals, wearables


def vital_payload(*, source="manual"):
    return schemas.VitalCreate(
        patient_id=42,
        timestamp="2026-09-11T10:00:00+00:00",
        heart_rate=72,
        spo2=98,
        systolic_bp=120,
        diastolic_bp=80,
        steps=4000,
        sleep_hours=7.5,
        active_minutes=35,
        calories=1800,
        risk_score=2,
        activity_state="resting",
        source=source,
    )


def user(role="doctor"):
    return SimpleNamespace(id=7, email=f"{role}@example.com", role=role)


def allow_access(monkeypatch, module, patient=None):
    monkeypatch.setattr(module, "require_roles", lambda *_: None)
    monkeypatch.setattr(
        module,
        "get_accessible_patient",
        lambda *_: patient or SimpleNamespace(id=42),
    )


def test_manual_api_delegates_legacy_dedup_and_audit(monkeypatch):
    allow_access(monkeypatch, vitals)
    captured = {}
    stored = SimpleNamespace(id=10)

    def fake_ingest(db, payload, **kwargs):
        captured.update(payload=payload, **kwargs)
        return IngestionResult(vital=stored, created=True)

    monkeypatch.setattr(vitals, "ingest_vital", fake_ingest)
    payload = vital_payload()

    assert vitals.create_vital(payload, db=object(), current_user=user()) is stored
    assert captured["payload"] is payload
    assert captured["source"] == "manual"
    assert captured["deduplication"] == "patient_timestamp"
    assert captured["audit"].action == "CREATE_VITAL"


def test_csv_uses_manual_endpoint_but_preserves_csv_source(monkeypatch):
    allow_access(monkeypatch, vitals)
    captured = {}

    def fake_ingest(db, payload, **kwargs):
        captured.update(kwargs)
        return IngestionResult(vital=SimpleNamespace(id=11), created=True)

    monkeypatch.setattr(vitals, "ingest_vital", fake_ingest)

    vitals.create_vital(vital_payload(source="csv_upload"), object(), user())

    assert captured["source"] == "csv_upload"


def test_manual_duplicate_remains_http_409(monkeypatch):
    allow_access(monkeypatch, vitals)
    monkeypatch.setattr(
        vitals,
        "ingest_vital",
        lambda *_args, **_kwargs: IngestionResult(
            vital=SimpleNamespace(id=10), created=False
        ),
    )

    with pytest.raises(HTTPException) as exc:
        vitals.create_vital(vital_payload(), object(), user())

    assert exc.value.status_code == 409


def test_nurse_workflow_delegates_audit_to_ingestion(monkeypatch):
    allow_access(monkeypatch, role_actions)
    captured = {}
    stored = SimpleNamespace(id=12)

    def fake_ingest(db, payload, **kwargs):
        captured.update(payload=payload, **kwargs)
        return IngestionResult(vital=stored, created=True)

    monkeypatch.setattr(role_actions, "ingest_vital", fake_ingest)
    payload = vital_payload()

    assert role_actions.nurse_record_vitals(
        payload, object(), user("nurse")
    ) is stored
    assert captured["source"] == "manual"
    assert captured["audit"].action == "NURSE_RECORD_VITALS"


def test_wearable_adapter_maps_defaults_and_source(monkeypatch):
    allow_access(monkeypatch, wearables)
    captured = {}

    def fake_ingest(db, payload, **kwargs):
        captured.update(payload=payload, **kwargs)
        return IngestionResult(vital=SimpleNamespace(id=13), created=True)

    monkeypatch.setattr(wearables, "ingest_vital", fake_ingest)
    payload = schemas.WearableVitalCreate(
        patient_id=42,
        device_name="Test Watch",
        heart_rate=75,
        spo2=97,
        steps=5000,
        sleep_hours=7,
        timestamp="2026-09-11T10:00:00+00:00",
    )

    response = wearables.receive_watch_data(payload, object(), user())

    assert response == {"message": "Watch data received successfully"}
    assert captured["source"] == "wearable"
    assert captured["payload"]["activity_state"] == "watch_sync"
    assert captured["payload"]["systolic_bp"] == 120


def test_simulator_adapter_delegates_patient_update_and_audit(monkeypatch):
    patient = SimpleNamespace(
        id=42,
        name="Simulation Patient",
        condition="General monitoring",
    )
    allow_access(monkeypatch, live_simulator, patient)
    generated = vital_payload().model_dump(
        exclude={"patient_id", "timestamp", "source"}
    )
    monkeypatch.setattr(live_simulator, "generate_vitals", lambda _: generated)
    captured = {}
    stored = SimpleNamespace(id=14)

    def fake_ingest(db, payload, **kwargs):
        captured.update(payload=payload, **kwargs)
        return IngestionResult(vital=stored, created=True)

    monkeypatch.setattr(live_simulator, "ingest_vital", fake_ingest)

    response = live_simulator.generate_live_vital(42, object(), user())

    assert response["vital"] is stored
    assert captured["source"] == "simulator"
    assert captured["patient_update"].last_checkup is not None
    assert captured["audit"].action == "CONDITION_BASED_SIMULATOR_GENERATE_VITAL"


def test_withings_adapter_preserves_external_id_and_live_hook(monkeypatch):
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    db = sessionmaker(bind=engine)()
    patient = models.Patient(
        name="Withings Patient",
        age=60,
        condition="General monitoring",
        risk_level="Low",
        last_checkup="2026-09-01",
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    patient_id = patient.id
    connection = models.WithingsConnection(
        patient_id=patient_id,
        connected_by_user_id=1,
        withings_userid="provider-user-1",
        access_token_encrypted="access",
        refresh_token_encrypted="refresh",
        token_expires_at=datetime(2026, 9, 12),
        scopes="user.metrics",
    )
    db.add(connection)
    db.commit()

    async def access_token(*_args):
        return "token"

    async def measurements(*_args, **_kwargs):
        return {
            "measuregrps": [
                {
                    "grpid": 456,
                    "date": 1789120800,
                    "measures": [
                        {"type": 11, "value": 74, "unit": 0},
                        {"type": 54, "value": 98, "unit": 0},
                    ],
                }
            ]
        }

    published = []

    async def publish(patient_id, payload):
        published.append((patient_id, payload))

    captured = {}

    def fake_ingest(db_arg, payload, **kwargs):
        captured.update(payload=payload, **kwargs)
        stored = SimpleNamespace(
            id=99,
            timestamp=payload["timestamp"],
            heart_rate=payload["heart_rate"],
            spo2=payload["spo2"],
            systolic_bp=payload["systolic_bp"],
            diastolic_bp=payload["diastolic_bp"],
            steps=payload["steps"],
            sleep_hours=payload["sleep_hours"],
            active_minutes=payload["active_minutes"],
            calories=payload["calories"],
            risk_score=payload["risk_score"],
            activity_state=payload["activity_state"],
            source=kwargs["source"],
        )
        return IngestionResult(
            vital=stored,
            created=True,
            hook_result=kwargs["post_ingest_hook"](stored),
        )

    monkeypatch.setattr(integrations_withings, "valid_access_token", access_token)
    monkeypatch.setattr(integrations_withings, "withings_post", measurements)
    monkeypatch.setattr(integrations_withings, "publish", publish)
    monkeypatch.setattr(integrations_withings, "ingest_vital", fake_ingest)

    class WebhookRequest:
        async def body(self):
            return (
                b"userid=provider-user-1&appli=4"
                b"&startdate=1789120000&enddate=1789121000"
            )

    try:
        response = asyncio.run(integrations_withings.webhook(WebhookRequest(), db))
    finally:
        db.close()

    assert response.status_code == 204
    assert captured["source"] == "withings"
    assert captured["external_id"] == "withings:provider-user-1:456"
    assert captured["patient_update"].last_checkup is not None
    assert published[0][0] == patient_id
    assert published[0][1]["source"] == "withings"
    assert published[0][1]["persisted"] is True
