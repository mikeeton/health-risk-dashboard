from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models
from access_control import get_accessible_patient
from auth_utils import get_current_user
from database import get_db
from ml_engine.registry import model_status, predict

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
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_accessible_patient(db, patient_id, current_user)

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

    latest = vitals[0]
    emergency_reasons = []
    if latest.spo2 < 90:
        emergency_reasons.append("oxygen saturation below 90%")
    if latest.heart_rate < 40 or latest.heart_rate > 140:
        emergency_reasons.append("heart rate outside the critical safety range")
    if latest.systolic_bp >= 180 or latest.diastolic_bp >= 120:
        emergency_reasons.append("blood pressure in the critical safety range")
    if emergency_reasons:
        return {
            "patient_id": patient_id,
            "source": "deterministic_safety_override",
            "prediction_score": 10,
            "prediction_level": "Critical",
            "confidence": 1.0,
            "anomaly_detected": True,
            "safety_reasons": emergency_reasons,
            "message": "Deterministic clinical escalation rules were triggered; model inference was bypassed.",
        }

    trained_prediction = predict(vitals, patient_id) if len(vitals) >= 5 else None
    if trained_prediction:
        return {"patient_id": patient_id, "source": "versioned_model", **trained_prediction}

    if len(vitals) < 5:
        fallback = calculate_prediction_from_latest(vitals[0])
        return {
            "patient_id": patient_id,
            "source": "deterministic_fallback",
            **fallback,
        }

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
        "source": "deterministic_fallback",
        "prediction_score": score,
        "prediction_level": level,
        "confidence": 0.81,
        "message": "Deterministic fallback generated from recent vital trend data because no validated model artifact is installed.",
    }


@router.get("/model-status")
def get_model_status(
    current_user: models.User = Depends(get_current_user),
):
    return model_status()


@router.get("/evaluation")
def get_model_evaluation(
    current_user: models.User = Depends(get_current_user),
):
    status = model_status()
    if not status.get("available"):
        return status
    return {
        key: status.get(key)
        for key in (
            "available",
            "model_version",
            "created_at",
            "dataset",
            "outcome_definition",
            "selected_model",
            "records",
            "candidate_validation",
            "operating_threshold",
            "test_metrics",
            "fairness",
            "external_validation",
            "acceptance_gates",
            "approved_for_inference",
            "limitations",
        )
    }


@router.get("/usability-protocol")
def get_usability_protocol(
    current_user: models.User = Depends(get_current_user),
):
    return {
        "version": "1.0",
        "status": "protocol_ready_no_participant_results",
        "tasks": [
            "Locate the latest vital reading and identify its timestamp.",
            "Switch to another assigned patient without losing patient context.",
            "Interpret the risk probability and supporting feature evidence.",
            "Find the model version, data source, limitations, and freshness.",
            "Acknowledge an alert and locate it in notification history.",
        ],
        "instruments": {
            "sus": "System Usability Scale, 10 items, scored 0-100",
            "task_success": "Completed, completed with assistance, or not completed",
            "time_on_task": "Seconds from task start to completion",
            "error_count": "Observable slips, navigation errors, and interpretation errors",
            "confidence": "Participant rating from 1 to 5",
        },
        "heuristics": [
            "Visibility of system status",
            "Match between system and clinical language",
            "User control and error recovery",
            "Consistency and standards",
            "Error prevention",
            "Recognition rather than recall",
            "Accessible and minimal presentation",
            "Clear limitations and human oversight",
        ],
        "warning": "Do not enter participant results without the required ethics, consent, privacy, and governance approvals.",
    }
