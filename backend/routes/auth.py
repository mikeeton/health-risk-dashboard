from datetime import datetime, timedelta, timezone
import hashlib
import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from auth_utils import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_access_token,
    password_needs_rehash,
)
from routes.audit import write_audit_log

router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)


def utc_now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


@router.post("/register", response_model=schemas.UserResponse)
def register_user(
    user: schemas.UserCreate,
    db: Session = Depends(get_db)
):
    raise HTTPException(
        status_code=403,
        detail="Direct registration is disabled. Submit an access request for approval.",
    )

    existing_user = (
        db.query(models.User)
        .filter(models.User.email == user.email.lower())
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="User already exists"
        )

    new_user = models.User(
        email=user.email.lower(),
        full_name=user.full_name.strip(),
        role=user.role.lower(),
        password_hash=hash_password(user.password),
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    write_audit_log(
        db=db,
        action="REGISTER_USER",
        entity="User",
        entity_id=str(new_user.id),
        user_email=new_user.email,
    )

    return new_user


@router.post("/login", response_model=schemas.TokenResponse)
def login_user(
    login: schemas.UserLogin,
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

    if getattr(user, "status", "active") != "active":
        raise HTTPException(status_code=403, detail="User account is not active")

    if password_needs_rehash(user.password_hash):
        user.password_hash = hash_password(login.password)
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

    return {
        "access_token": create_access_token(payload),
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user,
    }


@router.post("/refresh")
def refresh_token(
    request: schemas.RefreshTokenRequest,
    db: Session = Depends(get_db),
):
    payload = decode_access_token(request.refresh_token)

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

    return {
        "access_token": create_access_token(new_payload),
        "refresh_token": create_refresh_token({**new_payload, "jti": new_jti}),
        "token_type": "bearer",
    }


@router.post("/logout", status_code=204)
def logout(request: schemas.RefreshTokenRequest, db: Session = Depends(get_db)):
    payload = decode_access_token(request.refresh_token)
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
