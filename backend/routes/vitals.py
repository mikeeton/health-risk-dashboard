import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from access_control import get_accessible_patient, require_roles
from auth_utils import get_current_user
from database import get_db
from measurement_ingestion import AuditMetadata, ingest_vital

router = APIRouter(
    prefix="/vitals",
    tags=["Vitals"]
)


@router.post("/", response_model=schemas.VitalResponse)
def create_vital(
    vital: schemas.VitalCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_roles(current_user, {"doctor", "nurse"})
    get_accessible_patient(db, vital.patient_id, current_user)

    result = ingest_vital(
        db,
        vital,
        source=vital.source,
        audit=AuditMetadata(
            action="CREATE_VITAL",
            user_email=current_user.email,
        ),
    )

    if not result.created:
        logging.error(f"Vital record already exists for patient {vital.patient_id} at timestamp {vital.timestamp}")
        raise HTTPException(
            status_code=409,
            detail="Vital record already exists for this patient and timestamp"
        )

    return result.vital


@router.get("/{patient_id}", response_model=list[schemas.VitalResponse])
def get_patient_vitals(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_accessible_patient(db, patient_id, current_user)

    return (
        db.query(models.Vital)
        .filter(models.Vital.patient_id == patient_id)
        .all()
    )


@router.delete("/{vital_id}")
def delete_vital(
    vital_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_roles(current_user, {"doctor", "nurse"})

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

    get_accessible_patient(db, vital.patient_id, current_user)

    db.delete(vital)
    db.commit()

    write_audit_log(
        db=db,
        action="DELETE_VITAL",
        entity="Vital",
        entity_id=str(vital_id),
        user_email=current_user.email,
    )

    return {
        "message": f"Vital {vital_id} deleted successfully"
    }
