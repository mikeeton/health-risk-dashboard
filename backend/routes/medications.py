from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from routes.audit import write_audit_log

router = APIRouter(
    prefix="/medications",
    tags=["Medications"]
)


@router.post("/", response_model=schemas.MedicationResponse)
def create_medication(
    medication: schemas.MedicationCreate,
    db: Session = Depends(get_db)
):
    patient = (
        db.query(models.Patient)
        .filter(models.Patient.id == medication.patient_id)
        .first()
    )

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    new_medication = models.Medication(**medication.model_dump())

    db.add(new_medication)
    db.commit()
    db.refresh(new_medication)

    write_audit_log(
        db=db,
        action="CREATE_MEDICATION",
        entity="Medication",
        entity_id=str(new_medication.id),
    )

    return new_medication


@router.get("/{patient_id}", response_model=list[schemas.MedicationResponse])
def get_patient_medications(
    patient_id: int,
    db: Session = Depends(get_db)
):
    return (
        db.query(models.Medication)
        .filter(models.Medication.patient_id == patient_id)
        .all()
    )


@router.patch("/{medication_id}", response_model=schemas.MedicationResponse)
def update_medication(
    medication_id: int,
    update: schemas.MedicationUpdate,
    db: Session = Depends(get_db)
):
    medication = (
        db.query(models.Medication)
        .filter(models.Medication.id == medication_id)
        .first()
    )

    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")

    medication.status = update.status
    medication.notes = update.notes

    db.commit()
    db.refresh(medication)

    write_audit_log(
        db=db,
        action=f"UPDATE_MEDICATION_{medication.status.upper()}",
        entity="Medication",
        entity_id=str(medication.id),
    )

    return medication


@router.delete("/{medication_id}")
def delete_medication(
    medication_id: int,
    db: Session = Depends(get_db)
):
    medication = (
        db.query(models.Medication)
        .filter(models.Medication.id == medication_id)
        .first()
    )

    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")

    db.delete(medication)
    db.commit()

    write_audit_log(
        db=db,
        action="DELETE_MEDICATION",
        entity="Medication",
        entity_id=str(medication_id),
    )

    return {"message": "Medication deleted"}