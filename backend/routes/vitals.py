import logging
from datetime import datetime, timezone
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
        logging.info("Duplicate vital submission rejected")
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

    records = (
        db.query(models.Vital)
        .filter(models.Vital.patient_id == patient_id)
        .all()
    )
    # Legacy observations can have offsets or naive timestamps. Sort by the
    # instant, not the text or insertion order; keep invalid legacy dates first.
    def observation_order(vital):
        try:
            observed = datetime.fromisoformat(vital.timestamp.replace("Z", "+00:00"))
            if observed.tzinfo is None:
                observed = observed.replace(tzinfo=timezone.utc)
            return observed.timestamp(), vital.id
        except (ValueError, TypeError, AttributeError):
            return float("-inf"), vital.id

    return sorted(records, key=observation_order)


@router.get("/{patient_id}/assessment-states")
def get_assessment_states(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_accessible_patient(db, patient_id, current_user)
    rows = (
        db.query(models.VitalAssessment, models.Vital)
        .join(models.Vital, models.Vital.id == models.VitalAssessment.vital_id)
        .filter(models.Vital.patient_id == patient_id)
        .order_by(models.VitalAssessment.id.desc())
        .limit(100)
        .all()
    )
    return [
        {"vital_id": vital.id, "state": assessment.state, "attempts": assessment.attempts, "updated_at": assessment.updated_at}
        for assessment, vital in rows
    ]


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
    db.add(models.AuditLog(
        action="DELETE_VITAL",
        entity="Vital",
        entity_id=str(vital_id),
        user_email=current_user.email,
        timestamp=datetime.now(timezone.utc).replace(tzinfo=None),
    ))
    # The deletion and audit must either both succeed or both roll back.
    db.commit()

    return {
        "message": f"Vital {vital_id} deleted successfully"
    }
