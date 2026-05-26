from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sklearn.linear_model import LinearRegression
import numpy as np

import models
from database import get_db

router = APIRouter(
    prefix="/analytics",
    tags=["Advanced Analytics"]
)


@router.get("/linear-regression/{patient_id}")
def linear_regression_forecast(
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
            detail="At least 5 vital records are required for linear regression."
        )

    x = np.array(range(len(vitals))).reshape(-1, 1)

    def predict_next(values):
        model = LinearRegression()
        y = np.array(values)
        model.fit(x, y)
        next_x = np.array([[len(vitals)]])
        return round(float(model.predict(next_x)[0]), 2)

    return {
        "patient_id": patient_id,
        "next_heart_rate": predict_next([v.heart_rate for v in vitals]),
        "next_spo2": predict_next([v.spo2 for v in vitals]),
        "next_systolic_bp": predict_next([v.systolic_bp for v in vitals]),
        "next_diastolic_bp": predict_next([v.diastolic_bp for v in vitals]),
        "next_risk_score": predict_next([v.risk_score for v in vitals]),
        "message": "Linear regression forecast generated successfully."
    }


@router.get("/system-summary")
def system_summary(db: Session = Depends(get_db)):
    return {
        "patients": db.query(models.Patient).count(),
        "vitals": db.query(models.Vital).count(),
        "review_cases": db.query(models.ReviewCase).count(),
        "audit_logs": db.query(models.AuditLog).count(),
        "medications": db.query(models.Medication).count()
        if hasattr(models, "Medication")
        else 0,
        "timeline_events": db.query(models.PatientEvent).count()
        if hasattr(models, "PatientEvent")
        else 0,
    }