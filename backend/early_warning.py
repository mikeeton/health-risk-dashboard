"""Pre-emptive clinical review alerts created after a vital is stored."""
from __future__ import annotations

import logging
import json
from datetime import datetime, timedelta, timezone

import models
from ml_engine.registry import model_status, predict
from notification_utils import create_notification
from observability import component_tracker

logger = logging.getLogger(__name__)
COOLDOWN_HOURS = 6
MARKER = "[PREEMPTIVE:{kind}]"
DEFAULT_GOVERNANCE = {
    "enabled": True,
    "mode": "shadow",
    "threshold": None,
    "false_negative_cost": 8,
    "false_positive_cost": 1,
    "require_consecutive": 2,
    "require_trend_confirmation": True,
    "drift_threshold": 3.0,
    "auto_suspend": True,
    "active_model_version": "physionet-critical-v1",
    "retirement_reason": None,
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def get_model_governance(db) -> dict:
    row = db.query(models.SystemSetting).filter(models.SystemSetting.key == "model_governance").first()
    if not row:
        return dict(DEFAULT_GOVERNANCE)
    try:
        return {**DEFAULT_GOVERNANCE, **json.loads(row.value)}
    except (TypeError, ValueError):
        return dict(DEFAULT_GOVERNANCE)


def _patient_threshold(patient, governance: dict, base: float) -> float:
    configured = governance.get("threshold")
    threshold = float(configured) if configured is not None else base
    # Higher-risk clinical groups receive a slightly more sensitive threshold;
    # this policy is visible and admin-controlled rather than hidden in the model.
    if patient.risk_level in {"High", "Critical"}:
        threshold *= 0.85
    elif patient.risk_level == "Low":
        threshold *= 1.1
    cost_ratio = max(0.25, min(4.0, float(governance.get("false_positive_cost", 1)) / max(1, float(governance.get("false_negative_cost", 8)))))
    threshold *= cost_ratio ** 0.15
    return max(0.001, min(0.95, threshold))


def _data_quality(vital) -> dict:
    fields = ("heart_rate", "spo2", "systolic_bp", "diastolic_bp")
    missing = [name for name in fields if getattr(vital, name, None) is None]
    return {
        "source": getattr(vital, "source", "unknown"),
        "verification_status": getattr(vital, "verification_status", "unverified"),
        "missing_fields": missing,
        "complete": not missing,
    }


def _reconcile_predictions(db, vital, critical: bool) -> None:
    now = _now().replace(tzinfo=None)
    pending = (
        db.query(models.ModelPredictionRecord)
        .filter(
            models.ModelPredictionRecord.patient_id == vital.patient_id,
            models.ModelPredictionRecord.outcome_observed.is_(None),
        )
        .all()
    )
    for record in pending:
        if critical and record.window_end >= now:
            record.outcome_observed = True
            record.outcome_recorded_at = now
            record.classification = "TP" if record.predicted_positive else "FN"
        elif record.window_end < now:
            record.outcome_observed = False
            record.outcome_recorded_at = now
            record.classification = "FP" if record.predicted_positive else "TN"


def _critical_reasons(vital) -> list[str]:
    reasons = []
    if vital.spo2 < 90:
        reasons.append(f"SpO2 {vital.spo2}% is below 90%")
    if vital.heart_rate < 40 or vital.heart_rate > 140:
        reasons.append(f"heart rate {vital.heart_rate} bpm is outside 40–140 bpm")
    if vital.systolic_bp >= 180 or vital.diastolic_bp >= 120:
        reasons.append(f"blood pressure {vital.systolic_bp}/{vital.diastolic_bp} mmHg is critical")
    return reasons


def _trend_reasons(vitals) -> list[str]:
    if len(vitals) < 3:
        return []
    recent = list(reversed(vitals[:5]))
    reasons = []
    spo2 = [item.spo2 for item in recent]
    systolic = [item.systolic_bp for item in recent]
    heart = [item.heart_rate for item in recent]
    risk = [item.risk_score for item in recent]
    if all(left >= right for left, right in zip(spo2, spo2[1:])) and spo2[0] - spo2[-1] >= 2:
        reasons.append(f"oxygen saturation declined from {spo2[0]}% to {spo2[-1]}%")
    if systolic[-1] - systolic[0] >= 20:
        reasons.append(f"systolic blood pressure rose from {systolic[0]} to {systolic[-1]} mmHg")
    if max(heart) - min(heart) >= 25:
        reasons.append(f"heart rate varied by {max(heart) - min(heart)} bpm across recent readings")
    if risk[-1] - risk[0] >= 2:
        reasons.append(f"recorded risk score increased from {risk[0]}/10 to {risk[-1]}/10")
    return reasons


def _assigned_clinicians(db, patient) -> list[models.User]:
    assignment_ids = [
        row.staff_user_id
        for row in db.query(models.PatientStaffAssignment)
        .filter(
            models.PatientStaffAssignment.patient_id == patient.id,
            models.PatientStaffAssignment.status == "active",
            models.PatientStaffAssignment.role.in_(["doctor", "nurse"]),
        )
        .all()
    ]
    assignment_ids.extend(
        value for value in (patient.primary_doctor_id, patient.assigned_nurse_id) if value
    )
    if not assignment_ids:
        return []
    return (
        db.query(models.User)
        .filter(
            models.User.id.in_(set(assignment_ids)),
            models.User.role.in_(["doctor", "nurse"]),
            (models.User.status == "active") | (models.User.status.is_(None)),
        )
        .all()
    )


def _open_matching_case(db, patient_id: int, kind: str):
    marker = MARKER.format(kind=kind)
    cutoff = (_now() - timedelta(hours=COOLDOWN_HOURS)).isoformat()
    return (
        db.query(models.ReviewCase)
        .filter(
            models.ReviewCase.patient_id == patient_id,
            models.ReviewCase.status != "Resolved",
            models.ReviewCase.note.startswith(marker),
            models.ReviewCase.created_at >= cutoff,
        )
        .order_by(models.ReviewCase.id.desc())
        .first()
    )


def _create_or_update(
    db,
    *,
    patient,
    kind: str,
    level: str,
    score: int,
    reasons: list[str],
    vital,
    probability: float | None = None,
    model_version: str | None = None,
    prediction=None,
    data_quality: dict | None = None,
):
    marker = MARKER.format(kind=kind)
    evidence = "; ".join(reasons)
    note = (
        f"{marker} This patient has a developing risk pattern that may require clinical review. "
        f"Evidence: {evidence}. Latest evidence time: {vital.timestamp}. "
        + (f"Predicted six-hour critical-event probability: {probability:.1%}; model: {model_version}. " if probability is not None else "")
        + "This is an early-review prompt and does not confirm that deterioration will occur. "
        "Recommended checks: verify the reading, review recent trends, assess symptoms and document the clinical decision. "
        "Escalate urgently if an actual reading crosses a deterministic critical threshold."
    )
    existing = _open_matching_case(db, patient.id, kind)
    severity_increased = existing is not None and score > existing.risk_score
    if existing:
        existing.risk_level = level
        existing.risk_score = max(existing.risk_score, score)
        existing.note = note
        existing.updated_at = _now().isoformat()
        existing.duplicate_updates = (existing.duplicate_updates or 0) + 1
        case = existing
    else:
        case = models.ReviewCase(
            patient_id=patient.id,
            patient_name=patient.name,
            risk_level=level,
            risk_score=score,
            status="Open",
            note=note,
            created_at=_now().isoformat(),
            escalation_due_at=(_now() + timedelta(hours=1 if kind == "urgent" else 4)).isoformat(),
            alert_type="urgent_deterministic" if kind == "urgent" else "early_clinical_review",
            predicted_risk_level=level if probability is not None else None,
            probability=probability,
            confidence=None,
            prediction_window_hours=6 if probability is not None else None,
            model_version=model_version,
            evidence_json=json.dumps([{"timestamp": vital.timestamp, "observation": item} for item in reasons]),
            shap_json=json.dumps((prediction or {}).get("explanations", [])),
            data_quality_json=json.dumps(data_quality or _data_quality(vital)),
            missing_information_json=json.dumps((data_quality or {}).get("missing_fields", [])),
            recommended_checks_json=json.dumps(["Repeat and verify the measurement", "Review recent trends", "Assess current symptoms", "Document the clinical decision"]),
            escalation_conditions_json=json.dumps(["SpO2 below 90%", "Heart rate below 40 or above 140 bpm", "Blood pressure at or above 180/120 mmHg"]),
        )
        db.add(case)
        db.flush()

    if not existing or severity_increased:
        for clinician in _assigned_clinicians(db, patient):
            create_notification(
                db,
                user_email=clinician.email,
                title="Urgent deterministic alert" if kind == "urgent" else "Early clinical-review alert",
                message=(
                    f"{patient.name}: {evidence}. "
                    + ("Follow the urgent escalation procedure." if kind == "urgent" else "Clinical review is recommended.")
                ),
                notification_type="critical" if kind == "urgent" else "warning",
                link=f"/care?patientId={patient.id}#alerts",
                related_entity="ReviewCase",
                related_entity_id=str(case.id),
            )
    db.add(models.AuditLog(
        user_email="system@health-risk-dashboard",
        action="CREATE_PREEMPTIVE_ALERT" if not existing else "UPDATE_PREEMPTIVE_ALERT",
        entity="ReviewCase",
        entity_id=str(case.id),
        timestamp=_now().replace(tzinfo=None),
    ))
    db.commit()
    return case


def evaluate_new_vital(db, vital):
    """Never block vital storage: failures are logged and safely ignored."""
    try:
        patient = db.query(models.Patient).filter(models.Patient.id == vital.patient_id).first()
        if not patient:
            return None
        critical = _critical_reasons(vital)
        _reconcile_predictions(db, vital, bool(critical))
        if critical:
            return _create_or_update(
                db, patient=patient, kind="urgent", level="Critical", score=10,
                reasons=critical, vital=vital,
            )
        vitals = (
            db.query(models.Vital)
            .filter(models.Vital.patient_id == vital.patient_id)
            .order_by(models.Vital.id.desc())
            .limit(10)
            .all()
        )
        trends = _trend_reasons(vitals)
        governance = get_model_governance(db)
        status = model_status()
        prediction = predict(vitals, patient.id) if governance.get("enabled") and len(vitals) >= 5 and status.get("available") else None
        threshold = _patient_threshold(patient, governance, float(status.get("operating_threshold", 0.5)))
        probability = prediction.get("probability") if prediction else None
        drift = (prediction or {}).get("drift", {})
        drift_score = float(drift.get("score", 0))
        active_version = governance.get("active_model_version")
        if prediction and active_version and prediction.get("model_version") != active_version:
            logger.warning("Inactive model version rejected: %s", prediction.get("model_version"))
            prediction = None
            probability = None
        if prediction and drift_score > float(governance.get("drift_threshold", 3.0)):
            recent_drift = (
                db.query(models.ModelPredictionRecord)
                .filter(models.ModelPredictionRecord.patient_id == patient.id)
                .order_by(models.ModelPredictionRecord.id.desc()).limit(2).all()
            )
            if governance.get("auto_suspend") and len(recent_drift) == 2 and all(
                (item.drift_score or 0) > float(governance.get("drift_threshold", 3.0)) for item in recent_drift
            ):
                setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == "model_governance").first()
                suspended = {**governance, "enabled": False, "retirement_reason": "Automatic suspension after three consecutive out-of-distribution predictions"}
                if setting:
                    setting.value = json.dumps(suspended)
                else:
                    db.add(models.SystemSetting(key="model_governance", value=json.dumps(suspended)))
                db.add(models.ModelGovernanceEvent(action="automatic_suspension", reason=suspended["retirement_reason"], settings_json=json.dumps(suspended), created_at=_now().replace(tzinfo=None)))
                component_tracker.increment("ml_drift_suspensions_total")
        predicted = probability is not None and probability >= threshold
        previous = (
            db.query(models.ModelPredictionRecord)
            .filter(models.ModelPredictionRecord.patient_id == patient.id)
            .order_by(models.ModelPredictionRecord.id.desc())
            .first()
        )
        consecutive = (previous.consecutive_positive_count if previous and previous.predicted_positive else 0) + 1 if predicted else 0
        prediction_record = None
        if prediction:
            prediction_record = models.ModelPredictionRecord(
                patient_id=patient.id,
                vital_id=vital.id,
                created_at=_now().replace(tzinfo=None),
                window_end=(_now() + timedelta(hours=6)).replace(tzinfo=None),
                probability=probability,
                threshold=threshold,
                predicted_positive=predicted,
                consecutive_positive_count=consecutive,
                mode=governance.get("mode", "shadow"),
                model_version=prediction.get("model_version", "unknown"),
                shap_json=json.dumps(prediction.get("explanations", [])),
                data_quality_json=json.dumps(_data_quality(vital)),
                drift_score=drift_score,
                notified=False,
            )
            db.add(prediction_record)
            db.flush()
        confirmed = predicted and consecutive >= int(governance.get("require_consecutive", 2))
        if governance.get("require_trend_confirmation", True):
            confirmed = confirmed and bool(trends)
        if governance.get("mode", "shadow") == "shadow":
            db.commit()
            return None
        if not trends and not confirmed:
            db.commit()
            return None
        reasons = list(trends)
        if confirmed:
            reasons.append("the predictive model estimates increased risk of a defined critical vital event within six hours")
        case = _create_or_update(
            db,
            patient=patient,
            kind="early",
            level="High" if confirmed else "Moderate",
            score=7 if confirmed else 5,
            reasons=reasons,
            vital=vital,
            probability=probability,
            model_version=prediction.get("model_version") if prediction else None,
            prediction=prediction,
            data_quality=_data_quality(vital),
        )
        if prediction_record:
            prediction_record.notified = True
            db.commit()
        return case
    except Exception:
        logger.exception("Pre-emptive alert evaluation failed", extra={"vital_id": getattr(vital, "id", None)})
        db.rollback()
        return None


def notify_alert_status_change(db, case, actor) -> None:
    patient = db.query(models.Patient).filter(models.Patient.id == case.patient_id).first()
    if not patient:
        return
    for clinician in _assigned_clinicians(db, patient):
        if clinician.id == actor.id:
            continue
        create_notification(
            db,
            user_email=clinician.email,
            title="Clinical alert status updated",
            message=f"{patient.name}: alert is now {case.status}; updated by {actor.full_name}.",
            notification_type="info",
            link=f"/care?patientId={patient.id}#alerts",
            related_entity="ReviewCase",
            related_entity_id=str(case.id),
        )


def evaluate_overdue_observations(db) -> int:
    """Create one deduplicated review alert for each overdue observation plan."""
    cutoff = _now().replace(tzinfo=None)
    schedules = (
        db.query(models.ObservationSchedule)
        .filter(models.ObservationSchedule.active.is_(True))
        .filter(models.ObservationSchedule.next_due_at < cutoff)
        .all()
    )
    created = 0
    for schedule in schedules:
        kind = f"missing-{schedule.metric.lower().replace(' ', '-')[:40]}"
        if _open_matching_case(db, schedule.patient_id, kind):
            continue
        patient = db.query(models.Patient).filter(models.Patient.id == schedule.patient_id).first()
        latest = (
            db.query(models.Vital)
            .filter(models.Vital.patient_id == schedule.patient_id)
            .order_by(models.Vital.id.desc())
            .first()
        )
        if not patient or not latest:
            continue
        overdue_minutes = max(0, int((cutoff - schedule.next_due_at).total_seconds() // 60))
        if overdue_minutes < schedule.escalation_minutes:
            continue
        _create_or_update(
            db,
            patient=patient,
            kind=kind,
            level="Moderate",
            score=5,
            reasons=[f"expected {schedule.metric} observation is {overdue_minutes} minutes overdue"],
            vital=latest,
        )
        created += 1
    return created
