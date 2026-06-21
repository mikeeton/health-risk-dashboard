from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from access_control import (
    filter_to_accessible_patients,
    get_accessible_patient,
    require_roles,
)
from auth_utils import get_current_user
from database import get_db
from routes.audit import write_audit_log

router = APIRouter(
    prefix="/reviews",
    tags=["Reviews"]
)


@router.post("/", response_model=schemas.ReviewCaseResponse)
def create_review_case(
    review: schemas.ReviewCaseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_roles(current_user, {"doctor", "nurse"})
    patient = get_accessible_patient(db, review.patient_id, current_user)

    existing_open_case = (
        db.query(models.ReviewCase)
        .filter(models.ReviewCase.patient_id == review.patient_id)
        .filter(models.ReviewCase.status != "Resolved")
        .first()
    )

    if existing_open_case:
        return existing_open_case

    new_case = models.ReviewCase(
        patient_id=review.patient_id,
        patient_name=patient.name,
        risk_level=review.risk_level,
        risk_score=review.risk_score,
        status="Open",
        note=review.note,
        created_at=datetime.now().isoformat(timespec="seconds"),
    )

    db.add(new_case)
    db.commit()
    db.refresh(new_case)

    write_audit_log(
        db=db,
        action="CREATE_REVIEW_CASE",
        entity="ReviewCase",
        entity_id=str(new_case.id),
        user_email=current_user.email,
    )

    return new_case


@router.get("/", response_model=list[schemas.ReviewCaseResponse])
def get_review_cases(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.ReviewCase)
    query = filter_to_accessible_patients(
        query,
        models.ReviewCase.patient_id,
        db,
        current_user,
    )

    return query.order_by(models.ReviewCase.id.desc()).all()


@router.patch("/{case_id}", response_model=schemas.ReviewCaseResponse)
def update_review_case(
    case_id: int,
    review_update: schemas.ReviewCaseUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_roles(current_user, {"doctor", "nurse"})

    review_case = (
        db.query(models.ReviewCase)
        .filter(models.ReviewCase.id == case_id)
        .first()
    )

    if not review_case:
        raise HTTPException(
            status_code=404,
            detail="Review case not found"
        )

    get_accessible_patient(db, review_case.patient_id, current_user)

    review_case.status = review_update.status
    review_case.note = review_update.note
    review_case.updated_at = datetime.now().isoformat(timespec="seconds")

    db.commit()
    db.refresh(review_case)

    write_audit_log(
        db=db,
        action=f"UPDATE_REVIEW_CASE_{review_case.status.upper().replace(' ', '_')}",
        entity="ReviewCase",
        entity_id=str(review_case.id),
        user_email=current_user.email,
    )

    return review_case


@router.delete("/{case_id}")
def delete_review_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_roles(current_user, {"doctor", "nurse"})

    review_case = (
        db.query(models.ReviewCase)
        .filter(models.ReviewCase.id == case_id)
        .first()
    )

    if not review_case:
        raise HTTPException(
            status_code=404,
            detail="Review case not found"
        )

    get_accessible_patient(db, review_case.patient_id, current_user)

    db.delete(review_case)
    db.commit()

    write_audit_log(
        db=db,
        action="DELETE_REVIEW_CASE",
        entity="ReviewCase",
        entity_id=str(case_id),
        user_email=current_user.email,
    )

    return {
        "message": f"Review case {case_id} deleted successfully"
    }
