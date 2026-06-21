from fastapi import HTTPException, status
from sqlalchemy.sql import false
from sqlalchemy.orm import Session

import models


def role_name(user: models.User) -> str:
    return (user.role or "").lower()


def require_roles(user: models.User, allowed_roles: set[str]):
    if role_name(user) not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this action",
        )


def require_admin(user: models.User):
    require_roles(user, {"admin"})


def patient_query_for_user(db: Session, user: models.User):
    query = db.query(models.Patient)
    role = role_name(user)

    if role == "admin":
        return query

    if role == "doctor":
        return query.filter(models.Patient.primary_doctor_id == user.id)

    if role == "nurse":
        return query.filter(models.Patient.assigned_nurse_id == user.id)

    if role == "patient":
        return query.filter(models.Patient.user_id == user.id)

    return query.filter(false())


def accessible_patient_ids_query(db: Session, user: models.User):
    return patient_query_for_user(db, user).with_entities(models.Patient.id)


def filter_to_accessible_patients(query, patient_id_column, db: Session, user: models.User):
    return query.filter(patient_id_column.in_(accessible_patient_ids_query(db, user)))


def get_accessible_patient(db: Session, patient_id: int, user: models.User):
    patient = (
        patient_query_for_user(db, user)
        .filter(models.Patient.id == patient_id)
        .first()
    )

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found",
        )

    return patient


def can_access_patient(db: Session, patient_id: int, user: models.User) -> bool:
    return (
        patient_query_for_user(db, user)
        .filter(models.Patient.id == patient_id)
        .first()
        is not None
    )


def get_default_active_user_id(db: Session, role: str) -> int | None:
    return (
        db.query(models.User.id)
        .filter(models.User.role == role)
        .filter((models.User.status == "active") | (models.User.status.is_(None)))
        .order_by(models.User.id.asc())
        .scalar()
    )


def validate_user_for_role(
    db: Session,
    user_id: int | None,
    role: str,
    label: str,
) -> int | None:
    if user_id is None:
        return None

    user = (
        db.query(models.User)
        .filter(models.User.id == user_id)
        .filter(models.User.role == role)
        .filter((models.User.status == "active") | (models.User.status.is_(None)))
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{label} must be an active {role}",
        )

    return user.id
