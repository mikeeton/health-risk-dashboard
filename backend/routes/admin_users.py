import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from auth_utils import hash_password
from database import get_db
from routes.audit import write_audit_log

router = APIRouter(
    prefix="/admin/users",
    tags=["Admin Users"],
)

ALLOWED_ROLES = ["admin", "doctor", "nurse", "patient"]


def make_public_id():
    return f"USR-{uuid.uuid4().hex[:8].upper()}"


@router.get("/")
def get_users(db: Session = Depends(get_db)):
    users = db.query(models.User).order_by(models.User.id.asc()).all()

    for user in users:
        if not getattr(user, "public_id", None):
            user.public_id = make_public_id()

        if not getattr(user, "status", None):
            user.status = "active"

    db.commit()

    return users


@router.post("/")
def create_user(
    email: str,
    full_name: str,
    role: str,
    password: str,
    db: Session = Depends(get_db),
):
    role = role.lower()

    if role not in ALLOWED_ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")

    existing = db.query(models.User).filter(models.User.email == email.lower()).first()

    if existing:
        raise HTTPException(status_code=409, detail="User already exists")

    user = models.User(
        public_id=make_public_id(),
        email=email.lower(),
        full_name=full_name.strip(),
        role=role,
        password_hash=hash_password(password),
        status="active",
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    write_audit_log(
        db=db,
        action="ADMIN_CREATE_USER",
        entity="User",
        entity_id=str(user.id),
        user_email=user.email,
    )

    return user


@router.patch("/{user_id}")
def update_user(
    user_id: int,
    full_name: str | None = None,
    role: str | None = None,
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if full_name is not None:
        user.full_name = full_name.strip()

    if role is not None:
        role = role.lower()

        if role not in ALLOWED_ROLES:
            raise HTTPException(status_code=400, detail="Invalid role")

        user.role = role

    db.commit()
    db.refresh(user)

    write_audit_log(
        db=db,
        action="ADMIN_UPDATE_USER",
        entity="User",
        entity_id=str(user.id),
        user_email=user.email,
    )

    return user


@router.patch("/{user_id}/suspend")
def suspend_user(
    user_id: int,
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.status = "suspended"
    db.commit()
    db.refresh(user)

    write_audit_log(
        db=db,
        action="ADMIN_SUSPEND_USER",
        entity="User",
        entity_id=str(user.id),
        user_email=user.email,
    )

    return user


@router.patch("/{user_id}/activate")
def activate_user(
    user_id: int,
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.status = "active"
    db.commit()
    db.refresh(user)

    write_audit_log(
        db=db,
        action="ADMIN_ACTIVATE_USER",
        entity="User",
        entity_id=str(user.id),
        user_email=user.email,
    )

    return user


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role == "admin":
        admin_count = db.query(models.User).filter(models.User.role == "admin").count()

        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot delete last admin")

    db.delete(user)
    db.commit()

    write_audit_log(
        db=db,
        action="ADMIN_DELETE_USER",
        entity="User",
        entity_id=str(user_id),
        user_email=user.email,
    )

    return {"message": "User deleted"}