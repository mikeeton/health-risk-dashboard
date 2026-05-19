from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from auth_utils import hash_password, verify_password, create_access_token

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

    token = create_access_token(
        {
            "sub": user.email,
            "role": user.role,
            "user_id": user.id,
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
    }