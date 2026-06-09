from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models
from database import get_db

router = APIRouter(
    prefix="/ml",
    tags=["Machine Learning"]
)


def calculate_prediction_from_latest(vital):
    if not vital:
        return {
            "prediction_score": 0,
            "prediction_level": "Unavailable",
            "confidence": 0,
            "message": "No vital records available for prediction.",
        }

    score = vital.risk_score

    if vital.spo2 < 92:
        score += 1

    if vital.heart_rate > 120:
        score += 1

    if vital.systolic_bp > 160 or vital.diastolic_bp > 100:
        score += 1

    if vital.sleep_hours < 5:
        score += 1

    score = max(1, min(10, score))

    if score >= 8:
        level = "High"
    elif score >= 5:
        level = "Moderate"
    else:
        level = "Low"

    return {
        "prediction_score": score,
        "prediction_level": level,
        "confidence": 0.62,
        "message": "Fallback prediction generated from latest vital reading. Add more records for stronger ML confidence.",
    }


@router.get("/predict/{patient_id}")
def predict_deterioration(
    patient_id: int,
    db: Session = Depends(get_db)
):
    vitals = (
        db.query(models.Vital)
        .filter(models.Vital.patient_id == patient_id)
        .order_by(models.Vital.id.desc())
        .all()
    )

    if not vitals:
        return {
            "patient_id": patient_id,
            "prediction_score": 0,
            "prediction_level": "Unavailable",
            "confidence": 0,
            "message": "No vital records available for this patient.",
        }

    if len(vitals) < 5:
        fallback = calculate_prediction_from_latest(vitals[0])
        return {
            "patient_id": patient_id,
            **fallback,
        }

    latest = vitals[0]

    recent_scores = [v.risk_score for v in vitals[:5]]
    avg_risk = sum(recent_scores) / len(recent_scores)

    score = round((avg_risk + latest.risk_score) / 2)

    if latest.spo2 < 92:
        score += 1

    if latest.heart_rate > 120:
        score += 1

    if latest.systolic_bp > 160 or latest.diastolic_bp > 100:
        score += 1

    if latest.sleep_hours < 5:
        score += 1

    score = max(1, min(10, score))

    if score >= 8:
        level = "High"
    elif score >= 5:
        level = "Moderate"
    else:
        level = "Low"

    return {
        "patient_id": patient_id,
        "prediction_score": score,
        "prediction_level": level,
        "confidence": 0.81,
        "message": "Prediction generated from recent vital trend data.",
    }