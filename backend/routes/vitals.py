from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db

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

    new_vital = models.Vital(**vital.model_dump())

    db.add(new_vital)
    db.commit()
    db.refresh(new_vital)

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