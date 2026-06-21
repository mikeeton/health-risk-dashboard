from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from access_control import (
    get_accessible_patient,
    get_default_active_user_id,
    patient_query_for_user,
    require_roles,
    role_name,
    validate_user_for_role,
)
from auth_utils import get_current_user
from database import get_db
from routes.audit import write_audit_log

router = APIRouter(
    prefix="/patients",
    tags=["Patients"]
)


@router.post("/", response_model=schemas.PatientResponse)
def create_patient(
    patient: schemas.PatientCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_roles(current_user, {"admin", "doctor"})

    existing_patient = (
        db.query(models.Patient)
        .filter(models.Patient.name.ilike(patient.name.strip()))
        .first()
    )

    if existing_patient:
        raise HTTPException(
            status_code=409,
            detail="Patient already exists"
        )

    primary_doctor_id = patient.primary_doctor_id

    if role_name(current_user) == "doctor":
        primary_doctor_id = current_user.id
    elif primary_doctor_id is None:
        primary_doctor_id = get_default_active_user_id(db, "doctor")

    primary_doctor_id = validate_user_for_role(
        db=db,
        user_id=primary_doctor_id,
        role="doctor",
        label="Primary doctor",
    )

    if primary_doctor_id is None:
        raise HTTPException(
            status_code=400,
            detail="A patient must have one primary doctor",
        )

    assigned_nurse_id = patient.assigned_nurse_id

    if assigned_nurse_id is None:
        assigned_nurse_id = get_default_active_user_id(db, "nurse")

    assigned_nurse_id = validate_user_for_role(
        db=db,
        user_id=assigned_nurse_id,
        role="nurse",
        label="Assigned nurse",
    )

    user_id = validate_user_for_role(
        db=db,
        user_id=patient.user_id,
        role="patient",
        label="Linked user",
    )

    new_patient = models.Patient(
        user_id=user_id,
        primary_doctor_id=primary_doctor_id,
        assigned_nurse_id=assigned_nurse_id,
        name=patient.name.strip(),
        age=patient.age,
        condition=patient.condition.strip(),
        risk_level=patient.risk_level,
        last_checkup=str(patient.last_checkup),
    )

    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)

    write_audit_log(
        db=db,
        action="CREATE_PATIENT",
        entity="Patient",
        entity_id=str(new_patient.id),
        user_email=current_user.email,
    )

    return new_patient


@router.get("/", response_model=list[schemas.PatientResponse])
def get_patients(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return patient_query_for_user(db, current_user).order_by(models.Patient.id.asc()).all()


@router.get("/{patient_id}", response_model=schemas.PatientResponse)
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return get_accessible_patient(db, patient_id, current_user)


@router.patch("/{patient_id}/care-team", response_model=schemas.PatientResponse)
def update_patient_care_team(
    patient_id: int,
    update: schemas.PatientCareTeamUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_roles(current_user, {"admin"})

    patient = (
        db.query(models.Patient)
        .filter(models.Patient.id == patient_id)
        .first()
    )

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if update.primary_doctor_id is not None:
        patient.primary_doctor_id = validate_user_for_role(
            db=db,
            user_id=update.primary_doctor_id,
            role="doctor",
            label="Primary doctor",
        )

    if update.assigned_nurse_id is not None:
        patient.assigned_nurse_id = validate_user_for_role(
            db=db,
            user_id=update.assigned_nurse_id,
            role="nurse",
            label="Assigned nurse",
        )

    if update.user_id is not None:
        patient.user_id = validate_user_for_role(
            db=db,
            user_id=update.user_id,
            role="patient",
            label="Linked user",
        )

    if patient.primary_doctor_id is None:
        raise HTTPException(
            status_code=400,
            detail="A patient must have one primary doctor",
        )

    db.commit()
    db.refresh(patient)

    write_audit_log(
        db=db,
        action="UPDATE_PATIENT_CARE_TEAM",
        entity="Patient",
        entity_id=str(patient.id),
        user_email=current_user.email,
    )

    return patient


@router.delete("/{patient_id}")
def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_roles(current_user, {"admin"})

    patient = (
        db.query(models.Patient)
        .filter(models.Patient.id == patient_id)
        .first()
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    db.delete(patient)
    db.commit()

    write_audit_log(
        db=db,
        action="DELETE_PATIENT",
        entity="Patient",
        entity_id=str(patient_id),
        user_email=current_user.email,
    )

    return {
        "message": f"Patient {patient_id} deleted successfully"
    }
