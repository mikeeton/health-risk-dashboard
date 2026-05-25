from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from routes.audit import write_audit_log

router = APIRouter(
    prefix="/events",
    tags=["Patient Timeline Events"]
)


@router.post("/", response_model=schemas.PatientEventResponse)
def create_event(
    event: schemas.PatientEventCreate,
    db: Session = Depends(get_db)
):
    patient = (
        db.query(models.Patient)
        .filter(models.Patient.id == event.patient_id)
        .first()
    )

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    new_event = models.PatientEvent(**event.model_dump())

    db.add(new_event)
    db.commit()
    db.refresh(new_event)

    write_audit_log(
        db=db,
        action="CREATE_PATIENT_EVENT",
        entity="PatientEvent",
        entity_id=str(new_event.id),
    )

    return new_event


@router.get("/{patient_id}", response_model=list[schemas.PatientEventResponse])
def get_patient_events(
    patient_id: int,
    db: Session = Depends(get_db)
):
    return (
        db.query(models.PatientEvent)
        .filter(models.PatientEvent.patient_id == patient_id)
        .order_by(models.PatientEvent.id.desc())
        .all()
    )