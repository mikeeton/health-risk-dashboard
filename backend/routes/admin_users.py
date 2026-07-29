import uuid
import hashlib
import secrets
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from access_control import require_admin
from auth_utils import get_current_user, verify_password
from auth_utils import hash_password
from database import get_db
from routes.audit import write_audit_log
from config import get_settings
from models import utc_now_naive

router = APIRouter(
    prefix="/admin/users",
    tags=["Admin Users"],
)

ALLOWED_ROLES = ["admin", "doctor", "nurse", "patient"]
settings = get_settings()


def make_public_id():
    return f"USR-{uuid.uuid4().hex[:8].upper()}"


@router.post("/{user_id}/password-reset-link")
def create_password_reset_link(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_admin(current_user)
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(404, "User not found")
    raw_token = secrets.token_urlsafe(48)
    db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.user_id == target.id,
        models.PasswordResetToken.used_at.is_(None),
    ).update({"used_at": utc_now_naive()}, synchronize_session=False)
    record = models.PasswordResetToken(
        user_id=target.id,
        token_hash=hashlib.sha256(raw_token.encode()).hexdigest(),
        expires_at=utc_now_naive() + timedelta(minutes=30),
        requested_by_user_id=current_user.id,
        created_at=utc_now_naive(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    write_audit_log(
        db=db,
        action="CREATE_PASSWORD_RESET_LINK",
        entity="User",
        entity_id=str(target.id),
        user_email=current_user.email,
    )
    return {
        "expires_at": record.expires_at,
        "reset_url": f"{settings.frontend_url}/reset-password?token={raw_token}",
        "delivery": "Copy once and deliver through an approved secure channel.",
    }


def serialize_user(user: models.User):
    return {
        "id": user.id,
        "public_id": user.public_id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "status": user.status,
    }


@router.get("/")
def get_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_admin(current_user)

    users = db.query(models.User).order_by(models.User.id.asc()).all()

    for user in users:
        if not getattr(user, "public_id", None):
            user.public_id = make_public_id()

        if not getattr(user, "status", None):
            user.status = "active"

    db.commit()

    return [serialize_user(user) for user in users]


@router.post("/")
def create_user(
    email: str,
    full_name: str,
    role: str,
    password: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_admin(current_user)

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
        user_email=current_user.email,
    )

    return serialize_user(user)


@router.patch("/{user_id}")
def update_user(
    user_id: int,
    full_name: str | None = None,
    role: str | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_admin(current_user)

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
        user_email=current_user.email,
    )

    return serialize_user(user)


@router.patch("/{user_id}/suspend")
def suspend_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_admin(current_user)

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
        user_email=current_user.email,
    )

    return serialize_user(user)


@router.patch("/{user_id}/activate")
def activate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_admin(current_user)

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
        user_email=current_user.email,
    )

    return serialize_user(user)


@router.patch("/{user_id}/password")
def reset_user_password(
    user_id: int,
    payload: schemas.AdminPasswordReset,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_admin(current_user)

    # The acting admin must prove they still know their own password before
    # changing another user's credential. This protects unattended admin sessions
    # and makes password resets auditable.
    if not verify_password(payload.admin_password, current_user.password_hash):
        raise HTTPException(status_code=403, detail="Admin verification failed")

    user = db.query(models.User).filter(models.User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = hash_password(payload.new_password)
    db.commit()
    db.refresh(user)

    write_audit_log(
        db=db,
        action="ADMIN_RESET_USER_PASSWORD",
        entity="User",
        entity_id=str(user.id),
        user_email=current_user.email,
    )

    return {"message": "Password reset successfully"}


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_admin(current_user)

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
        user_email=current_user.email,
    )

    return {"message": "User deleted"}
