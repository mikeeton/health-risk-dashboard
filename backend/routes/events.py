from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from access_control import get_accessible_patient, require_roles
from auth_utils import get_current_user
from database import get_db
from routes.audit import write_audit_log

router = APIRouter(
    prefix="/events",
    tags=["Patient Timeline Events"]
)


@router.post("/", response_model=schemas.PatientEventResponse)
def create_event(
    event: schemas.PatientEventCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_roles(current_user, {"admin", "doctor", "nurse"})
    get_accessible_patient(db, event.patient_id, current_user)

    new_event = models.PatientEvent(**event.model_dump())

    db.add(new_event)
    db.commit()
    db.refresh(new_event)

    write_audit_log(
        db=db,
        action="CREATE_PATIENT_EVENT",
        entity="PatientEvent",
        entity_id=str(new_event.id),
        user_email=current_user.email,
    )

    return new_event


@router.get("/{patient_id}", response_model=list[schemas.PatientEventResponse])
def get_patient_events(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_accessible_patient(db, patient_id, current_user)

    return (
        db.query(models.PatientEvent)
        .filter(models.PatientEvent.patient_id == patient_id)
        .order_by(models.PatientEvent.id.desc())
        .all()
    )
