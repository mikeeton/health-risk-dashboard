from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from access_control import require_admin
from auth_utils import get_current_user
from database import get_db
from notification_utils import create_notification
from routes.audit import write_audit_log

router = APIRouter(
    prefix="/admin/assignments",
    tags=["Admin Staff Assignments"],
)


def serialize_assignment(
    assignment: models.PatientStaffAssignment,
    patient: models.Patient,
    staff: models.User,
):
    """Flatten assignment joins into the response shape used by the admin UI."""

    return {
        "id": assignment.id,
        "patient_id": assignment.patient_id,
        "patient_name": patient.name,
        "staff_user_id": assignment.staff_user_id,
        "staff_name": staff.full_name,
        "staff_email": staff.email,
        "role": assignment.role,
        "status": assignment.status,
        "assigned_at": assignment.assigned_at,
        "assigned_by_user_id": assignment.assigned_by_user_id,
    }


@router.get("/patients", response_model=list[schemas.AdminPatientDirectoryResponse])
def get_assignment_patient_directory(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_admin(current_user)

    # Admins need enough information to assign staff, but not clinical details
    # like diagnosis, medication, vitals, risk score, or reports.
    rows = (
        db.query(models.Patient, models.User)
        .outerjoin(models.User, models.Patient.user_id == models.User.id)
        .order_by(models.Patient.name.asc())
        .all()
    )

    return [
        {
            "id": patient.id,
            "name": patient.name,
            "linked_user_id": patient.user_id,
            "linked_user_email": user.email if user else None,
        }
        for patient, user in rows
    ]


@router.get("/staff", response_model=list[schemas.AdminStaffResponse])
def get_assignable_staff(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_admin(current_user)

    return (
        db.query(models.User)
        .filter(models.User.role.in_(["doctor", "nurse"]))
        .order_by(models.User.role.asc(), models.User.full_name.asc())
        .all()
    )


@router.get("/", response_model=list[schemas.StaffAssignmentResponse])
def get_staff_assignments(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_admin(current_user)

    rows = (
        db.query(
            models.PatientStaffAssignment,
            models.Patient,
            models.User,
        )
        .join(models.Patient, models.PatientStaffAssignment.patient_id == models.Patient.id)
        .join(models.User, models.PatientStaffAssignment.staff_user_id == models.User.id)
        .order_by(models.Patient.name.asc(), models.User.full_name.asc())
        .all()
    )

    return [
        serialize_assignment(assignment, patient, staff)
        for assignment, patient, staff in rows
    ]


@router.post("/", response_model=schemas.StaffAssignmentResponse)
def assign_staff_to_patient(
    payload: schemas.StaffAssignmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_admin(current_user)

    role = payload.role.lower()

    if role not in {"doctor", "nurse"}:
        raise HTTPException(
            status_code=400,
            detail="Assignments can only use doctor or nurse roles.",
        )

    patient = (
        db.query(models.Patient)
        .filter(models.Patient.id == payload.patient_id)
        .first()
    )

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    staff = (
        db.query(models.User)
        .filter(models.User.id == payload.staff_user_id)
        .filter(models.User.role == role)
        .filter((models.User.status == "active") | (models.User.status.is_(None)))
        .first()
    )

    if not staff:
        raise HTTPException(
            status_code=400,
            detail=f"Selected user must be an active {role}.",
        )

    assignment = (
        db.query(models.PatientStaffAssignment)
        .filter(models.PatientStaffAssignment.patient_id == patient.id)
        .filter(models.PatientStaffAssignment.staff_user_id == staff.id)
        .filter(models.PatientStaffAssignment.role == role)
        .first()
    )

    if assignment and assignment.status == "active":
        raise HTTPException(status_code=409, detail="Assignment already exists")

    if assignment:
        # Reassignment reactivates historical rows instead of creating duplicate
        # active records for the same patient/staff/role combination.
        assignment.status = "active"
        assignment.assigned_at = datetime.now().isoformat(timespec="seconds")
        assignment.assigned_by_user_id = current_user.id
    else:
        assignment = models.PatientStaffAssignment(
            patient_id=patient.id,
            staff_user_id=staff.id,
            role=role,
            status="active",
            assigned_at=datetime.now().isoformat(timespec="seconds"),
            assigned_by_user_id=current_user.id,
        )
        db.add(assignment)

    if role == "doctor" and patient.primary_doctor_id is None:
        # Legacy columns are maintained only as fallback compatibility fields.
        # The assignment table is the primary access-control source.
        patient.primary_doctor_id = staff.id

    if role == "nurse" and patient.assigned_nurse_id is None:
        patient.assigned_nurse_id = staff.id

    db.commit()
    db.refresh(assignment)

    create_notification(
        db,
        user_email=staff.email,
        title="New patient assignment",
        message=f"You have been assigned to {patient.name}'s care team.",
        notification_type="assignment",
        link="/",
        related_entity="PatientStaffAssignment",
        related_entity_id=str(assignment.id),
    )
    db.commit()

    write_audit_log(
        db=db,
        action="ADMIN_ASSIGN_STAFF",
        entity="PatientStaffAssignment",
        entity_id=str(assignment.id),
        user_email=current_user.email,
    )

    return serialize_assignment(assignment, patient, staff)


@router.delete("/{assignment_id}", response_model=schemas.StaffAssignmentResponse)
def remove_staff_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_admin(current_user)

    row = (
        db.query(
            models.PatientStaffAssignment,
            models.Patient,
            models.User,
        )
        .join(models.Patient, models.PatientStaffAssignment.patient_id == models.Patient.id)
        .join(models.User, models.PatientStaffAssignment.staff_user_id == models.User.id)
        .filter(models.PatientStaffAssignment.id == assignment_id)
        .first()
    )

    if not row:
        raise HTTPException(status_code=404, detail="Assignment not found")

    assignment, patient, staff = row
    # Retain removed rows for history and auditability instead of deleting them.
    assignment.status = "removed"

    if assignment.role == "doctor" and patient.primary_doctor_id == staff.id:
        patient.primary_doctor_id = None

    if assignment.role == "nurse" and patient.assigned_nurse_id == staff.id:
        patient.assigned_nurse_id = None

    db.commit()
    db.refresh(assignment)

    create_notification(
        db,
        user_email=staff.email,
        title="Assignment removed",
        message=f"Your assignment to {patient.name} has been removed.",
        notification_type="assignment",
        link="/",
        related_entity="PatientStaffAssignment",
        related_entity_id=str(assignment.id),
    )
    db.commit()

    write_audit_log(
        db=db,
        action="ADMIN_REMOVE_STAFF_ASSIGNMENT",
        entity="PatientStaffAssignment",
        entity_id=str(assignment.id),
        user_email=current_user.email,
    )

    return serialize_assignment(assignment, patient, staff)
