from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import false

import models


def role_name(user: models.User) -> str:
    return (user.role or "").lower()


def require_roles(user: models.User, allowed_roles: set[str]):
    """Raise 403 unless the authenticated user has one of the allowed roles."""

    if role_name(user) not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this action",
        )


def require_admin(user: models.User):
    require_roles(user, {"admin"})


def patient_query_for_user(db: Session, user: models.User):
    """Return a patient query already scoped to the current user's role.

    This is the central privacy boundary for clinical records. Routes compose on
    top of this helper so patient lists, detail pages, vitals, medications, and
    AI context all share the same access rules.
    """

    query = db.query(models.Patient)
    role = role_name(user)

    # Admins manage accounts and assignments, but never read clinical records.
    if role == "admin":
        return query.filter(false())

    if role == "doctor":
        # Prefer the assignment table, while keeping legacy primary_doctor_id as
        # a fallback for older rows and partially migrated databases.
        assigned_patient_ids = (
            db.query(models.PatientStaffAssignment.patient_id)
            .filter(models.PatientStaffAssignment.staff_user_id == user.id)
            .filter(models.PatientStaffAssignment.role == "doctor")
            .filter(models.PatientStaffAssignment.status == "active")
        )

        return query.filter(
            (models.Patient.id.in_(assigned_patient_ids))
            | (models.Patient.primary_doctor_id == user.id)
        )

    if role == "nurse":
        # Nurses follow the same assignment model as doctors, but only rows with
        # role="nurse" grant nurse access.
        assigned_patient_ids = (
            db.query(models.PatientStaffAssignment.patient_id)
            .filter(models.PatientStaffAssignment.staff_user_id == user.id)
            .filter(models.PatientStaffAssignment.role == "nurse")
            .filter(models.PatientStaffAssignment.status == "active")
        )

        return query.filter(
            (models.Patient.id.in_(assigned_patient_ids))
            | (models.Patient.assigned_nurse_id == user.id)
        )

    if role == "patient":
        return query.filter(models.Patient.user_id == user.id)

    return query.filter(false())


def accessible_patient_ids_query(db: Session, user: models.User):
    return patient_query_for_user(db, user).with_entities(models.Patient.id)


def filter_to_accessible_patients(query, patient_id_column, db: Session, user: models.User):
    return query.filter(patient_id_column.in_(accessible_patient_ids_query(db, user)))


def get_accessible_patient(db: Session, patient_id: int, user: models.User):
    """Fetch one patient through the scoped query.

    Inaccessible patients intentionally return 404 rather than 403 so callers do
    not learn whether another patient's record exists.
    """

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
    """Validate care-team references before writing assignment-related fields."""

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
