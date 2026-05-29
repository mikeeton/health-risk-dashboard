from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from routes.audit import write_audit_log

router = APIRouter(
    prefix="/patients",
    tags=["Patients"]
)


@router.post("/", response_model=schemas.PatientResponse)
def create_patient(
    patient: schemas.PatientCreate,
    db: Session = Depends(get_db)
):
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

    new_patient = models.Patient(
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
    )

    return new_patient


@router.get("/", response_model=list[schemas.PatientResponse])
def get_patients(db: Session = Depends(get_db)):
    return db.query(models.Patient).all()


@router.get("/{patient_id}", response_model=schemas.PatientResponse)
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db)
):
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

    return patient


@router.delete("/{patient_id}")
def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db)
):
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
    )

    return {
        "message": f"Patient {patient_id} deleted successfully"
    }