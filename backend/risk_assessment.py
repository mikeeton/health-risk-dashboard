"""Versioned, read-oriented canonical patient risk assessment.

The canonical assessment coordinates existing safety, patient-relative, ML,
anomaly, SHAP, and alert outputs without treating their numeric values as
interchangeable. It deliberately does not create predictions, alerts, or audit
records and never calls the Groq assistant.
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy.orm import Session

import models
import schemas
from baseline_service import build_patient_baseline, parse_observation_timestamp
from early_warning import _critical_reasons, _trend_reasons, get_model_governance
from ml_engine.registry import model_status, predict


CANONICAL_RISK_VERSION = "canonical-risk-v1"
ML_MINIMUM_VITALS = 5
DATA_STALE_AFTER_HOURS = 24
ML_TARGET_SEMANTICS = (
    "Probability that the subsequent six-hour window contains a "
    "threshold-defined critical vital event using the repository proxy target."
)
ANOMALY_SEMANTICS = (
    "Isolation Forest signal that the engineered feature vector is unusual "
    "relative to the model's training distribution; it is not a clinical outcome."
)

# A dashboard may refresh frequently. The cache avoids deserialising/running the
# model repeatedly only to recover anomaly metadata that older prediction rows do
# not persist. It is process-local, bounded, and never used for safety overrides.
_live_prediction_cache: dict[tuple[int, int, str, str], dict[str, Any] | None] = {}
_LIVE_PREDICTION_CACHE_LIMIT = 256


def _chronological(vitals: list[models.Vital]) -> list[models.Vital]:
    minimum = datetime.min.replace(tzinfo=timezone.utc)
    return sorted(
        vitals,
        key=lambda vital: (
            parse_observation_timestamp(vital.timestamp) or minimum,
            vital.id or 0,
        ),
    )


def _apply_patient_relative_policy(
    patient: models.Patient,
    latest: models.Vital | None,
    baseline: schemas.BaselineAssessment,
) -> schemas.BaselineAssessment:
    if not baseline.ready or latest is None or not baseline.values or not baseline.deviations:
        return baseline

    values = baseline.values
    deviations = baseline.deviations
    score = 1
    reasons: list[str] = []
    condition = (patient.condition or "").lower()
    if (latest.activity_state or "").lower() == "resting":
        if abs(deviations.heart_rate_percent) > 40:
            score += 4
            reasons.append("Resting heart rate differs from baseline by more than 40%.")
        elif abs(deviations.heart_rate_percent) > 25:
            score += 2
            reasons.append("Resting heart rate differs from baseline by more than 25%.")
    if latest.spo2 < 92:
        score += 5
        reasons.append("SpO2 is below 92%.")
    elif latest.spo2 < 95 or deviations.spo2_percent < -5:
        score += 2
        reasons.append("SpO2 is below the patient-relative expected range.")
    if latest.systolic_bp >= 160 or latest.diastolic_bp >= 100:
        score += 5
        reasons.append("Blood pressure is at least 160/100 mmHg.")
    elif (
        latest.systolic_bp >= 140
        or latest.diastolic_bp >= 90
        or deviations.systolic_bp_percent > 20
    ):
        score += 3
        reasons.append("Blood pressure is elevated relative to fixed or baseline thresholds.")
    if deviations.sleep_hours_percent < -30 or latest.sleep_hours < 5:
        score += 2
        reasons.append("Sleep is materially below the patient baseline.")
    if "hypertension" in condition and latest.systolic_bp > 130:
        score += 2
        reasons.append("Hypertension context and systolic pressure above 130 mmHg.")
    if "heart" in condition and latest.heart_rate > values.heart_rate * 1.25:
        score += 2
        reasons.append("Heart-condition context and heart rate above 125% of baseline.")
    if "asthma" in condition and latest.spo2 < 95:
        score += 2
        reasons.append("Asthma context and SpO2 below 95%.")
    if "diabetes" in condition and latest.steps < values.steps * 0.5:
        score += 1
        reasons.append("Diabetes context and steps below 50% of baseline.")

    score = max(1, min(10, score))
    level = "critical" if score >= 9 else "high" if score >= 7 else "moderate" if score >= 4 else "low"
    return baseline.model_copy(
        update={
            "relative_score": score,
            "relative_level": level,
            "reasons": reasons,
        }
    )


def _json_list(value: str | None) -> list[dict[str, Any]]:
    if not value:
        return []
    try:
        parsed = json.loads(value)
    except (TypeError, ValueError):
        return []
    return [item for item in parsed if isinstance(item, dict)] if isinstance(parsed, list) else []


def _cached_live_prediction(
    vitals_descending: list[models.Vital],
    patient_id: int,
    latest: models.Vital,
    version: str,
) -> dict[str, Any] | None:
    key = (patient_id, latest.id or 0, latest.timestamp, version)
    if key not in _live_prediction_cache:
        if len(_live_prediction_cache) >= _LIVE_PREDICTION_CACHE_LIMIT:
            _live_prediction_cache.clear()
        _live_prediction_cache[key] = predict(
            vitals_descending,
            patient_id,
            include_explanation=False,
        )
    return _live_prediction_cache[key]


def _build_ml_components(
    db: Session,
    patient_id: int,
    latest: models.Vital | None,
    vitals_descending: list[models.Vital],
    governance: dict[str, Any],
) -> tuple[schemas.MLRiskAssessment, schemas.AnomalyAssessment, list[schemas.RiskEvidence]]:
    unavailable_ml = schemas.MLRiskAssessment(
        available=False,
        reason="no_measurements" if latest is None else "model_or_prediction_unavailable",
        governance_mode=str(governance.get("mode", "shadow")),
        target_semantics=ML_TARGET_SEMANTICS,
        source="unavailable",
    )
    unavailable_anomaly = schemas.AnomalyAssessment(
        available=False,
        reason="no_measurements" if latest is None else "model_or_anomaly_result_unavailable",
        semantics=ANOMALY_SEMANTICS,
    )
    if latest is None:
        return unavailable_ml, unavailable_anomaly, []

    stored = (
        db.query(models.ModelPredictionRecord)
        .filter(models.ModelPredictionRecord.patient_id == patient_id)
        .order_by(models.ModelPredictionRecord.created_at.desc(), models.ModelPredictionRecord.id.desc())
        .first()
    )
    status = model_status()
    live: dict[str, Any] | None = None
    if (
        governance.get("enabled", True)
        and len(vitals_descending) >= ML_MINIMUM_VITALS
        and status.get("available")
    ):
        try:
            live = _cached_live_prediction(
                vitals_descending,
                patient_id,
                latest,
                str(status.get("model_version", "unknown")),
            )
        except Exception:
            live = None

    stored_matches_latest = stored is not None and stored.vital_id == latest.id
    if stored_matches_latest:
        probability = float(stored.probability)
        threshold = float(stored.threshold)
        classification = "high" if probability >= threshold else "moderate" if probability >= threshold * 0.7 else "low"
        ml = schemas.MLRiskAssessment(
            available=True,
            probability=probability,
            classification=classification,
            operating_threshold=threshold,
            model_version=stored.model_version,
            governance_mode=stored.mode,
            target_semantics=ML_TARGET_SEMANTICS,
            source="stored_prediction",
            based_on_vital_id=stored.vital_id,
            generated_at=parse_observation_timestamp(stored.created_at),
            consecutive_positive_count=stored.consecutive_positive_count,
            active_alert_eligible=bool(stored.mode != "shadow" and stored.notified),
        )
        explanations = _json_list(stored.shap_json)
    elif live:
        probability = float(live["probability"])
        threshold = float(status.get("operating_threshold", 0.5))
        classification = "high" if probability >= threshold else "moderate" if probability >= threshold * 0.7 else "low"
        ml = schemas.MLRiskAssessment(
            available=True,
            probability=probability,
            classification=classification,
            operating_threshold=threshold,
            model_version=str(live.get("model_version", "unknown")),
            governance_mode=str(governance.get("mode", "shadow")),
            target_semantics=ML_TARGET_SEMANTICS,
            source="live_read_only",
            based_on_vital_id=latest.id,
            generated_at=None,
            consecutive_positive_count=0,
            active_alert_eligible=False,
        )
        # The cached read-only inference intentionally omits SHAP. SHAP remains
        # sourced from stored prediction rows created by early_warning.
        explanations = []
    else:
        ml = unavailable_ml
        explanations = []

    if live and "anomaly_score" in live:
        anomaly = schemas.AnomalyAssessment(
            available=True,
            score=float(live["anomaly_score"]),
            is_anomalous=bool(live.get("anomaly_detected")),
            semantics=ANOMALY_SEMANTICS,
        )
    else:
        anomaly = unavailable_anomaly

    evidence = []
    for item in sorted(
        explanations,
        key=lambda value: abs(float(value.get("contribution", 0) or 0)),
        reverse=True,
    )[:5]:
        evidence.append(
            schemas.RiskEvidence(
                feature=str(item.get("feature", "unknown_feature")),
                value=item.get("value"),
                contribution=float(item.get("contribution", 0) or 0),
                source="shap",
                description=(
                    "Stored model feature contribution to the six-hour "
                    "critical-vital proxy probability."
                ),
            )
        )
    return ml, anomaly, evidence


def _build_alert(db: Session, patient_id: int) -> schemas.AlertAssessment:
    alert = (
        db.query(models.ReviewCase)
        .filter(
            models.ReviewCase.patient_id == patient_id,
            models.ReviewCase.status.notin_(["Resolved", "Dismissed"]),
        )
        .order_by(models.ReviewCase.id.desc())
        .first()
    )
    if not alert:
        return schemas.AlertAssessment(exists=False)
    return schemas.AlertAssessment(
        exists=True,
        alert_id=alert.id,
        status=alert.status,
        severity=alert.risk_level,
        score=alert.risk_score,
        alert_type=alert.alert_type,
        created_at=parse_observation_timestamp(alert.created_at),
        updated_at=parse_observation_timestamp(alert.updated_at),
    )


def _build_data_quality(latest: models.Vital | None, generated_at: datetime) -> schemas.DataQualityAssessment:
    if latest is None:
        return schemas.DataQualityAssessment(
            stale=True,
            complete=False,
            missing_metrics=[
                "heart_rate",
                "spo2",
                "systolic_bp",
                "diastolic_bp",
                "steps",
                "sleep_hours",
                "active_minutes",
                "calories",
            ],
        )
    fields = (
        "heart_rate",
        "spo2",
        "systolic_bp",
        "diastolic_bp",
        "steps",
        "sleep_hours",
        "active_minutes",
        "calories",
    )
    missing = [field for field in fields if getattr(latest, field, None) is None]
    recorded_at = parse_observation_timestamp(latest.timestamp)
    stale = recorded_at is None or generated_at - recorded_at > timedelta(hours=DATA_STALE_AFTER_HOURS)
    return schemas.DataQualityAssessment(
        stale=stale,
        complete=not missing and recorded_at is not None,
        last_reading_at=recorded_at,
        missing_metrics=missing,
        source=latest.source,
        verification_status=latest.verification_status,
    )


def build_patient_risk_assessment(
    db: Session,
    patient: models.Patient,
) -> schemas.CanonicalRiskAssessment:
    """Build the canonical presentation contract without mutating database state.

    Policy, version ``canonical-risk-v1``:
    1. A latest-reading deterministic critical rule always yields ``critical``.
    2. A severe ready patient-relative result or an active predictive alert tied
       to the latest stored prediction yields ``high``.
    3. A physiological trend, moderate patient-relative deviation, or elevated
       ML proxy signal yields ``moderate``. Shadow ML can inform this presentation
       but cannot create a ReviewCase here.
    4. Otherwise the level is ``low``. If baseline/data are unavailable, the
       reason explicitly says that low is not evidence of patient reassurance.

    There is no composite numeric score because baseline points, probability,
    anomaly score, and alert severity are not mathematically interchangeable.
    ``Vital.risk_score`` is never used as the canonical final classification.
    """
    generated_at = datetime.now(timezone.utc)
    all_vitals = db.query(models.Vital).filter(models.Vital.patient_id == patient.id).all()
    chronological = _chronological(all_vitals)
    latest = chronological[-1] if chronological else None
    descending = list(reversed(chronological))

    baseline = build_patient_baseline(
        db,
        patient.id,
        current_vital=latest,
    )
    baseline = _apply_patient_relative_policy(patient, latest, baseline)
    deterministic_reasons = _critical_reasons(latest) if latest else []
    deterministic = schemas.DeterministicAssessment(
        triggered=bool(deterministic_reasons),
        level="critical" if deterministic_reasons else None,
        reasons=deterministic_reasons,
    )
    # The legacy trend helper also considers caller-supplied Vital.risk_score.
    # Canonical v1 uses only its physiological trend findings.
    trends = [
        reason
        for reason in (_trend_reasons(descending) if latest else [])
        if not reason.startswith("recorded risk score")
    ]
    governance = get_model_governance(db)
    ml, anomaly, evidence = _build_ml_components(
        db,
        patient.id,
        latest,
        descending,
        governance,
    )
    alert = _build_alert(db, patient.id)
    data_quality = _build_data_quality(latest, generated_at)

    if latest:
        critical_values = {
            "spo2": latest.spo2,
            "heart_rate": latest.heart_rate,
            "systolic_bp": latest.systolic_bp,
            "diastolic_bp": latest.diastolic_bp,
        }
        for reason in deterministic_reasons:
            feature = "spo2" if reason.startswith("SpO2") else "heart_rate" if reason.startswith("heart rate") else "blood_pressure"
            value: float | str = (
                f"{latest.systolic_bp}/{latest.diastolic_bp}"
                if feature == "blood_pressure"
                else float(critical_values[feature])
            )
            evidence.insert(0, schemas.RiskEvidence(
                feature=feature,
                value=value,
                source="critical_rule",
                description=reason,
            ))
    evidence.extend(
        schemas.RiskEvidence(
            feature="recent_vital_trend",
            source="trend_rule",
            description=reason,
        )
        for reason in trends
    )

    if deterministic.triggered:
        overall_level = "critical"
        reason = "A deterministic critical safety threshold is triggered by the latest reading."
    elif baseline.ready and baseline.relative_level in {"high", "critical"}:
        overall_level = "high"
        reason = "The current reading has a severe patient-relative deviation; Critical remains reserved for deterministic safety thresholds."
    elif ml.active_alert_eligible:
        overall_level = "high"
        reason = "The latest stored active-mode prediction satisfied the existing predictive-alert workflow."
    elif trends:
        overall_level = "moderate"
        reason = "Recent physiological measurements contain a concerning trend that warrants review."
    elif baseline.ready and baseline.relative_level == "moderate":
        overall_level = "moderate"
        reason = "The current reading has a meaningful patient-relative deviation."
    elif ml.available and ml.classification in {"moderate", "high"}:
        overall_level = "moderate"
        reason = "The ML six-hour critical-vital proxy signal is elevated; it does not independently establish a Critical state."
    elif baseline.ready:
        overall_level = "low"
        reason = "No deterministic, trend, patient-relative, or ML warning signal is currently present."
    else:
        overall_level = "low"
        reason = "No current deterministic, physiological-trend, or ML warning signal is present; the patient baseline is unavailable, so this is not evidence of reassurance."

    return schemas.CanonicalRiskAssessment(
        patient_id=patient.id,
        assessment_version=CANONICAL_RISK_VERSION,
        generated_at=generated_at,
        overall_level=overall_level,
        overall_score=None,
        reason=reason,
        baseline=baseline,
        deterministic=deterministic,
        ml=ml,
        anomaly=anomaly,
        evidence=evidence,
        alert=alert,
        data_quality=data_quality,
    )
