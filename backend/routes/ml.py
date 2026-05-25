from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sklearn.ensemble import RandomForestClassifier
import numpy as np

import models
import schemas
from database import get_db

router = APIRouter(
    prefix="/ml",
    tags=["Machine Learning Prediction"]
)


def get_level(score: int):
    if score >= 9:
        return "Critical"

    if score >= 7:
        return "High"

    if score >= 4:
        return "Moderate"

    return "Low"


@router.get("/predict/{patient_id}", response_model=schemas.MLPredictionResponse)
def predict_deterioration(
    patient_id: int,
    db: Session = Depends(get_db)
):
    vitals = (
        db.query(models.Vital)
        .filter(models.Vital.patient_id == patient_id)
        .order_by(models.Vital.id.asc())
        .all()
    )

    if len(vitals) < 5:
        raise HTTPException(
            status_code=400,
            detail="At least 5 vital records are required for ML prediction."
        )

    X = []
    y = []

    for vital in vitals:
        X.append([
            vital.heart_rate,
            vital.spo2,
            vital.systolic_bp,
            vital.diastolic_bp,
            vital.sleep_hours,
            vital.active_minutes,
            vital.calories,
        ])

        y.append(1 if vital.risk_score >= 7 else 0)

    model = RandomForestClassifier(
        n_estimators=80,
        random_state=42
    )

    model.fit(np.array(X), np.array(y))

    latest = vitals[-1]

    latest_input = np.array([[
        latest.heart_rate,
        latest.spo2,
        latest.systolic_bp,
        latest.diastolic_bp,
        latest.sleep_hours,
        latest.active_minutes,
        latest.calories,
    ]])

    probability = model.predict_proba(latest_input)[0][1]

    score = max(1, min(10, round(probability * 10)))
    level = get_level(score)

    return {
        "patient_id": patient_id,
        "prediction_score": score,
        "prediction_level": level,
        "confidence": round(float(probability), 2),
        "message": (
            "ML model suggests possible clinical deterioration."
            if score >= 7
            else "ML model does not currently detect strong deterioration risk."
        ),
    }