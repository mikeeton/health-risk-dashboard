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
)
from routes.audit import write_audit_log

router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)


@router.post("/register", response_model=schemas.UserResponse)
def register_user(
    user: schemas.UserCreate,
    db: Session = Depends(get_db)
):
    allowed_roles = ["admin", "doctor", "patient"]

    if user.role.lower() not in allowed_roles:
        raise HTTPException(
            status_code=400,
            detail="Invalid role. Use admin, doctor, or patient."
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

    return {
        "access_token": create_access_token(payload),
        "refresh_token": create_refresh_token(payload),
        "token_type": "bearer",
        "user": user,
    }


@router.post("/refresh")
def refresh_token(
    request: schemas.RefreshTokenRequest
):
    payload = decode_access_token(request.refresh_token)

    if not payload or payload.get("token_type") != "refresh":
        raise HTTPException(
            status_code=401,
            detail="Invalid refresh token"
        )

    new_payload = {
        "sub": payload.get("sub"),
        "role": payload.get("role"),
        "user_id": payload.get("user_id"),
    }

    return {
        "access_token": create_access_token(new_payload),
        "token_type": "bearer",
    }