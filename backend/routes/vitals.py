from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from routes.audit import write_audit_log

router = APIRouter(
    prefix="/vitals",
    tags=["Vitals"]
)


@router.post("/", response_model=schemas.VitalResponse)
def create_vital(
    vital: schemas.VitalCreate,
    db: Session = Depends(get_db)
):
    patient = (
        db.query(models.Patient)
        .filter(models.Patient.id == vital.patient_id)
        .first()
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    existing_vital = (
        db.query(models.Vital)
        .filter(models.Vital.patient_id == vital.patient_id)
        .filter(models.Vital.timestamp == vital.timestamp)
        .first()
    )

    if existing_vital:
        raise HTTPException(
            status_code=409,
            detail="Vital record already exists for this patient and timestamp"
        )

    new_vital = models.Vital(**vital.model_dump())

    db.add(new_vital)
    db.commit()
    db.refresh(new_vital)

    write_audit_log(
        db=db,
        action="CREATE_VITAL",
        entity="Vital",
        entity_id=str(new_vital.id),
    )

    return new_vital


@router.get("/{patient_id}", response_model=list[schemas.VitalResponse])
def get_patient_vitals(
    patient_id: int,
    db: Session = Depends(get_db)
):
    return (
        db.query(models.Vital)
        .filter(models.Vital.patient_id == patient_id)
        .all()
    )


@router.delete("/{vital_id}")
def delete_vital(
    vital_id: int,
    db: Session = Depends(get_db)
):
    vital = (
        db.query(models.Vital)
        .filter(models.Vital.id == vital_id)
        .first()
    )

    if not vital:
        raise HTTPException(
            status_code=404,
            detail="Vital record not found"
        )

    db.delete(vital)
    db.commit()

    write_audit_log(
        db=db,
        action="DELETE_VITAL",
        entity="Vital",
        entity_id=str(vital_id),
    )

    return {
        "message": f"Vital {vital_id} deleted successfully"
    }