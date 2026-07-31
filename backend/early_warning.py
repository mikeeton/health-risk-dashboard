"""Pre-emptive clinical review alerts created after a vital is stored."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

import models
from ml_engine.registry import model_status, predict
from notification_utils import create_notification

logger = logging.getLogger(__name__)
COOLDOWN_HOURS = 6
MARKER = "[PREEMPTIVE:{kind}]"


def _now() -> datetime:
    return datetime.now(timezone.utc)


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
    confidence: float | None = None,
    model_version: str | None = None,
):
    marker = MARKER.format(kind=kind)
    evidence = "; ".join(reasons)
    note = (
        f"{marker} This patient has a developing risk pattern that may require clinical review. "
        f"Evidence: {evidence}. Latest evidence time: {vital.timestamp}. "
        + (f"Six-hour model probability: {probability:.1%}; confidence: {confidence:.1%}; model: {model_version}. " if probability is not None else "")
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
        prediction = predict(vitals, patient.id) if len(vitals) >= 5 and model_status().get("available") else None
        predicted = bool(prediction and prediction.get("prediction_level") in {"High", "Critical"})
        if not trends and not predicted:
            return None
        reasons = list(trends)
        if predicted:
            reasons.append("the predictive model estimates increased risk of a defined critical vital event within six hours")
        probability = prediction.get("probability") if prediction else None
        confidence = prediction.get("confidence") if prediction else None
        return _create_or_update(
            db,
            patient=patient,
            kind="early",
            level="High" if predicted else "Moderate",
            score=7 if predicted else 5,
            reasons=reasons,
            vital=vital,
            probability=probability,
            confidence=confidence,
            model_version=prediction.get("model_version") if prediction else None,
        )
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
