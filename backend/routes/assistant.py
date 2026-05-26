from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models
from database import get_db

router = APIRouter(
    prefix="/assistant",
    tags=["AI Assistant"]
)


@router.get("/patient-summary/{patient_id}")
def patient_summary(
    patient_id: int,
    db: Session = Depends(get_db)
):
    patient = (
        db.query(models.Patient)
        .filter(models.Patient.id == patient_id)
        .first()
    )

    vitals = (
        db.query(models.Vital)
        .filter(models.Vital.patient_id == patient_id)
        .order_by(models.Vital.id.desc())
        .limit(10)
        .all()
    )

    if not patient:
        return {
            "message": "Patient not found."
        }

    if not vitals:
        return {
            "message": f"{patient.name} has no vital records yet."
        }

    latest = vitals[0]

    high_risk_count = len([
        vital for vital in vitals
        if vital.risk_score >= 7
    ])

    response = f"""
{patient.name} is currently being monitored for {patient.condition}.
The latest vital reading shows a heart rate of {latest.heart_rate} bpm, SpO2 of {latest.spo2}%, blood pressure of {latest.systolic_bp}/{latest.diastolic_bp}, and a risk score of {latest.risk_score}/10.

Across the latest {len(vitals)} records, {high_risk_count} readings are high-risk.

Recommended action:
{"Urgent clinician review is recommended." if latest.risk_score >= 8 else "Continue monitoring and repeat observations if readings worsen."}
""".strip()

    return {
        "patient_id": patient_id,
        "summary": response
    }


@router.get("/ask/{patient_id}")
def ask_ai(
    patient_id: int,
    question: str,
    db: Session = Depends(get_db)
):
    summary = patient_summary(patient_id, db)

    return {
        "question": question,
        "answer": summary.get("summary", "No summary available.")
    }