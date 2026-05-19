from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db

router = APIRouter(
    prefix="/reviews",
    tags=["Reviews"]
)


@router.post("/", response_model=schemas.ReviewCaseResponse)
def create_review_case(
    review: schemas.ReviewCaseCreate,
    db: Session = Depends(get_db)
):
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
        patient_name=review.patient_name,
        risk_level=review.risk_level,
        risk_score=review.risk_score,
        status="Open",
        note=review.note,
        created_at=datetime.now().isoformat(timespec="seconds"),
    )

    db.add(new_case)
    db.commit()
    db.refresh(new_case)

    return new_case


@router.get("/", response_model=list[schemas.ReviewCaseResponse])
def get_review_cases(db: Session = Depends(get_db)):
    return db.query(models.ReviewCase).all()


@router.patch("/{case_id}", response_model=schemas.ReviewCaseResponse)
def update_review_case(
    case_id: int,
    review_update: schemas.ReviewCaseUpdate,
    db: Session = Depends(get_db)
):
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

    review_case.status = review_update.status
    review_case.note = review_update.note
    review_case.updated_at = datetime.now().isoformat(timespec="seconds")

    db.commit()
    db.refresh(review_case)

    return review_case


@router.delete("/{case_id}")
def delete_review_case(
    case_id: int,
    db: Session = Depends(get_db)
):
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

    db.delete(review_case)
    db.commit()

    return {
        "message": f"Review case {case_id} deleted successfully"
    }