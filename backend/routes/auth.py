from datetime import datetime, timedelta, timezone
import hashlib
import secrets
import pyotp

from fastapi import APIRouter, Depends, HTTPException, Request, Response, Header
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

import models
import schemas
from access_control import get_accessible_patient
from database import get_db
from auth_utils import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_access_token,
    password_needs_rehash,
    decrypt_mfa_secret,
    create_websocket_ticket,
    get_current_user,
    WEBSOCKET_TICKET_EXPIRE_SECONDS,
    bearer_scheme,
)
from routes.audit import write_audit_log
from config import get_settings

settings = get_settings()

REFRESH_COOKIE = "vitala_refresh"


def _cookie_mode(request: Request) -> bool:
    return request.headers.get("X-Auth-Mode") == "cookie" or REFRESH_COOKIE in request.cookies


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        REFRESH_COOKIE, token, httponly=True,
        secure=settings.environment == "production", samesite="none" if settings.environment == "production" else "lax",
        path="/auth", max_age=settings.refresh_token_expire_days * 86400,
    )


def _csrf_token(jti: str) -> str:
    import hmac
    return hmac.new(settings.secret_key.encode(), ("refresh:" + jti).encode(), hashlib.sha256).hexdigest()


def _requested_refresh_token(request: Request, body: schemas.RefreshTokenRequest | None, csrf: str | None) -> str:
    import hmac
    if REFRESH_COOKIE in request.cookies:
        token = request.cookies[REFRESH_COOKIE]
        payload = decode_access_token(token)
        jti = payload.get("jti") if payload else None
        if not jti or not csrf or not hmac.compare_digest(csrf, _csrf_token(jti)):
            raise HTTPException(status_code=403, detail="Invalid refresh request")
        return token
    if request.headers.get("X-Auth-Mode") == "cookie":
        raise HTTPException(status_code=401, detail="Refresh cookie missing")
    if body and body.refresh_token:
        return body.refresh_token
    raise HTTPException(status_code=401, detail="Refresh token missing")

router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)


@router.post("/websocket-ticket", response_model=schemas.WebSocketTicketResponse)
def websocket_ticket(
    request: schemas.WebSocketTicketRequest,
    current_user: models.User = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    """Exchange the main bearer token for a brief, route-scoped socket ticket."""

    if request.patient_id is not None:
        get_accessible_patient(db, request.patient_id, current_user)

    return {
        "ticket": create_websocket_ticket(
            current_user,
            request.audience,
            request.patient_id,
            (decode_access_token(credentials.credentials) or {}).get("session_jti") if credentials else None,
        ),
        "expires_in_seconds": WEBSOCKET_TICKET_EXPIRE_SECONDS,
    }


def utc_now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


@router.post("/register", response_model=schemas.UserResponse)
def register_user(
    _user: schemas.UserCreate,
):
    raise HTTPException(
        status_code=403,
        detail="Direct registration is disabled. Submit an access request for approval.",
    )


@router.post("/login", response_model=schemas.TokenResponse)
def login_user(
    login: schemas.UserLogin,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    user = (
        db.query(models.User)
        .filter(models.User.email == login.email.lower())
        .first()
    )

    if not user or not verify_password(login.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if user.mfa_enabled:
        secret = decrypt_mfa_secret(user.mfa_secret_encrypted)
        if (
            not secret
            or not login.mfa_code
            or not pyotp.TOTP(secret).verify(login.mfa_code, valid_window=1)
        ):
            raise HTTPException(
                status_code=401,
                detail="A valid MFA code is required",
            )

    if getattr(user, "status", "active") != "active":
        raise HTTPException(status_code=403, detail="User account is not active")

    if password_needs_rehash(user.password_hash):
        user.password_hash = hash_password(login.password)

    user.last_login_at = utc_now_naive()
    db.commit()

    payload = {
        "sub": user.email,
        "role": user.role,
        "user_id": user.id,
    }

    write_audit_log(
        db=db,
        action="LOGIN",
        entity="User",
        entity_id=str(user.id),
        user_email=user.email,
    )

    refresh_jti = secrets.token_urlsafe(32)
    refresh_token = create_refresh_token({**payload, "jti": refresh_jti})
    db.add(
        models.AuthSession(
            user_id=user.id,
            refresh_jti_hash=hashlib.sha256(refresh_jti.encode()).hexdigest(),
            expires_at=utc_now_naive() + timedelta(days=7),
        )
    )
    db.commit()

    if _cookie_mode(request):
        _set_refresh_cookie(response, refresh_token)
    return {
        "access_token": create_access_token({**payload, "session_jti": refresh_jti}),
        "refresh_token": None if _cookie_mode(request) else refresh_token,
        "csrf_token": _csrf_token(refresh_jti) if _cookie_mode(request) else None,
        "token_type": "bearer",
        "user": user,
    }


@router.post("/refresh")
def refresh_token(
    http_request: Request,
    response: Response,
    request: schemas.RefreshTokenRequest | None = None,
    x_csrf_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    token = _requested_refresh_token(http_request, request, x_csrf_token)
    payload = decode_access_token(token)

    if not payload or payload.get("token_type") != "refresh":
        raise HTTPException(
            status_code=401,
            detail="Invalid refresh token"
        )

    jti = payload.get("jti")
    if not jti:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    session = (
        db.query(models.AuthSession)
        .filter(
            models.AuthSession.refresh_jti_hash
            == hashlib.sha256(jti.encode()).hexdigest(),
            models.AuthSession.revoked_at.is_(None),
        )
        # Serialize rotation across API workers. PostgreSQL rechecks the
        # revoked filter after a waiting transaction obtains this row lock.
        .with_for_update()
        .first()
    )
    if not session or session.expires_at <= utc_now_naive():
        raise HTTPException(status_code=401, detail="Refresh token expired or revoked")

    user = db.query(models.User).filter(models.User.id == session.user_id).first()
    if not user or user.status != "active":
        raise HTTPException(status_code=401, detail="Account unavailable")

    new_payload = {
        "sub": payload.get("sub"),
        "role": payload.get("role"),
        "user_id": payload.get("user_id"),
    }

    new_jti = secrets.token_urlsafe(32)
    session.revoked_at = utc_now_naive()
    db.add(
        models.AuthSession(
            user_id=user.id,
            refresh_jti_hash=hashlib.sha256(new_jti.encode()).hexdigest(),
            expires_at=utc_now_naive() + timedelta(days=7),
        )
    )
    db.commit()

    cookie_mode = _cookie_mode(http_request)
    new_refresh_token = create_refresh_token({**new_payload, "jti": new_jti})
    if cookie_mode:
        _set_refresh_cookie(response, new_refresh_token)
    return {
        "access_token": create_access_token({**new_payload, "session_jti": new_jti}),
        "refresh_token": None if cookie_mode else new_refresh_token,
        "csrf_token": _csrf_token(new_jti) if cookie_mode else None,
        "token_type": "bearer",
    }


@router.post("/logout", status_code=204)
def logout(http_request: Request, response: Response, request: schemas.RefreshTokenRequest | None = None, x_csrf_token: str | None = Header(default=None), db: Session = Depends(get_db)):
    token = _requested_refresh_token(http_request, request, x_csrf_token)
    payload = decode_access_token(token)
    jti = payload.get("jti") if payload else None
    if jti:
        session = (
            db.query(models.AuthSession)
            .filter(
                models.AuthSession.refresh_jti_hash
                == hashlib.sha256(jti.encode()).hexdigest()
            )
            .first()
        )
        if session and session.revoked_at is None:
            session.revoked_at = utc_now_naive()
            db.commit()
    if _cookie_mode(http_request):
        response.delete_cookie(REFRESH_COOKIE, path="/auth", secure=settings.environment == "production", samesite="none" if settings.environment == "production" else "lax")


@router.post("/password-reset/confirm", status_code=204)
def confirm_password_reset(
    request: schemas.PasswordResetConfirm,
    db: Session = Depends(get_db),
):
    token_hash = hashlib.sha256(request.token.encode()).hexdigest()
    record = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token_hash == token_hash,
        models.PasswordResetToken.used_at.is_(None),
    ).first()
    if not record or record.expires_at <= utc_now_naive():
        raise HTTPException(400, "Password reset link is invalid or expired")
    user = db.query(models.User).filter(models.User.id == record.user_id).first()
    if not user or user.status != "active":
        raise HTTPException(400, "Account is unavailable")
    user.password_hash = hash_password(request.new_password)
    record.used_at = utc_now_naive()
    db.query(models.AuthSession).filter(
        models.AuthSession.user_id == user.id,
        models.AuthSession.revoked_at.is_(None),
    ).update({"revoked_at": utc_now_naive()}, synchronize_session=False)
    db.commit()
    write_audit_log(
        db=db,
        action="CONFIRM_PASSWORD_RESET",
        entity="User",
        entity_id=str(user.id),
        user_email=user.email,
    )
