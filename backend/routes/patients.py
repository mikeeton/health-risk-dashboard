from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from access_control import (
    get_accessible_patient,
    patient_query_for_user,
    require_roles,
)
from auth_utils import get_current_user
from database import get_db
from risk_assessment import build_patient_risk_assessment
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
    require_roles(current_user, {"doctor"})

    if (
        patient.user_id is not None
        or patient.assigned_nurse_id is not None
        or patient.primary_doctor_id not in {None, current_user.id}
    ):
        raise HTTPException(
            status_code=403,
            detail="Patient account links and staff assignments require administrator approval.",
        )

    new_patient = models.Patient(
        user_id=None,
        primary_doctor_id=current_user.id,
        assigned_nurse_id=None,
        name=patient.name.strip(),
        age=patient.age,
        condition=patient.condition.strip(),
        risk_level=patient.risk_level,
        last_checkup=str(patient.last_checkup),
    )

    db.add(new_patient)
    db.flush()

    db.add(
        models.PatientStaffAssignment(
            patient_id=new_patient.id,
            staff_user_id=current_user.id,
            role="doctor",
            status="active",
            assigned_at=datetime.now().isoformat(timespec="seconds"),
            assigned_by_user_id=current_user.id,
        )
    )

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


@router.get(
    "/{patient_id}/risk-assessment",
    response_model=schemas.CanonicalRiskAssessment,
)
def get_patient_risk_assessment(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Return the versioned patient-level presentation contract.

    This route is read-only. It does not invoke Groq, persist predictions, or
    create ReviewCases; those responsibilities remain in their existing flows.
    """
    patient = get_accessible_patient(db, patient_id, current_user)
    return build_patient_risk_assessment(db, patient)


@router.patch("/{patient_id}/care-team", response_model=schemas.PatientResponse)
def update_patient_care_team(
    patient_id: int,
    update: schemas.PatientCareTeamUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_roles(current_user, {"admin"})
    raise HTTPException(
        status_code=410,
        detail="Use /admin/assignments to manage staff-patient access.",
    )


@router.delete("/{patient_id}")
def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_roles(current_user, {"admin"})
    raise HTTPException(
        status_code=403,
        detail="Admins cannot delete clinical patient records.",
    )
