"""Offline experiments built from the application's production services."""
from __future__ import annotations

from contextlib import contextmanager
from dataclasses import replace
from datetime import timedelta
import importlib.metadata
import json
import os
import platform
from statistics import mean, median
from time import perf_counter
from typing import Iterator
from unittest.mock import patch

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

import models
import risk_assessment
from database import Base
from measurement_ingestion import ingest_vital
from ml_engine.registry import model_status, predict as model_predict
from risk_assessment import build_patient_risk_assessment
from .scenarios import (
    BASELINE_RECORDS,
    DEFAULT_START,
    SUPPORTED_SCENARIOS,
    ScenarioReading,
    generate_scenario,
)


EVALUATION_VERSION = "dissertation-evaluation-v1"
SYNTHETIC_LABELS = {
    "normal_stable": "normal",
    **{name: "abnormal" for name in SUPPORTED_SCENARIOS if name != "normal_stable"},
}


@contextmanager
def isolated_database() -> Iterator[Session]:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()
        risk_assessment._live_prediction_cache.clear()


def create_patient(
    db: Session,
    name: str,
    *,
    condition: str = "General monitoring",
) -> models.Patient:
    patient = models.Patient(
        name=name,
        age=60,
        condition=condition,
        risk_level="Low",
        last_checkup=DEFAULT_START.date().isoformat(),
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


def set_governance(db: Session, *, enabled: bool, mode: str) -> None:
    settings = {
        "enabled": enabled,
        "mode": mode,
        "threshold": None,
        "false_negative_cost": 8,
        "false_positive_cost": 1,
        "require_consecutive": 2,
        "require_trend_confirmation": True,
        "drift_threshold": 3.0,
        "auto_suspend": False,
        "active_model_version": "physionet-critical-v1",
    }
    db.add(models.SystemSetting(key="model_governance", value=json.dumps(settings)))
    db.commit()


def ingest_readings(
    db: Session,
    patient: models.Patient,
    readings: list[ScenarioReading],
) -> list[models.Vital]:
    stored = []
    for reading in readings:
        result = ingest_vital(
            db,
            reading.measurement(patient.id),
            source="simulator",
            verification_status="unverified",
        )
        if result.created:
            stored.append(result.vital)
    return stored


def _without_generated_at(assessment) -> dict:
    return assessment.model_dump(mode="json", exclude={"generated_at"})


def _latest_model_signal(db: Session, patient: models.Patient) -> dict | None:
    vitals = (
        db.query(models.Vital)
        .filter(models.Vital.patient_id == patient.id)
        .order_by(models.Vital.id.desc())
        .all()
    )
    if len(vitals) < 5:
        return None
    return model_predict(vitals, patient.id, include_explanation=True)


def _store_model_signal(
    db: Session,
    patient: models.Patient,
    signal: dict | None,
) -> None:
    if not signal:
        return
    latest = (
        db.query(models.Vital)
        .filter(models.Vital.patient_id == patient.id)
        .order_by(models.Vital.id.desc())
        .first()
    )
    status = model_status()
    threshold = float(status.get("operating_threshold", 0.5))
    db.add(
        models.ModelPredictionRecord(
            patient_id=patient.id,
            vital_id=latest.id,
            created_at=DEFAULT_START.replace(tzinfo=None),
            window_end=(DEFAULT_START + timedelta(hours=6)).replace(tzinfo=None),
            probability=float(signal["probability"]),
            threshold=threshold,
            predicted_positive=float(signal["probability"]) >= threshold,
            consecutive_positive_count=1,
            mode="shadow",
            model_version=str(signal["model_version"]),
            shap_json=json.dumps(signal.get("explanations", [])),
            data_quality_json="{}",
            drift_score=float(signal.get("drift", {}).get("score", 0)),
            notified=False,
        )
    )
    db.commit()


def scenario_outcomes(seed: int) -> list[dict]:
    rows = []
    unavailable = {"available": False, "operating_threshold": 0.5}
    for name in SUPPORTED_SCENARIOS:
        with isolated_database() as db:
            patient = create_patient(db, f"Scenario {name}")
            with patch("early_warning.model_status", return_value=unavailable):
                stored = ingest_readings(db, patient, generate_scenario(name, seed=seed))
            signal = _latest_model_signal(db, patient)
            _store_model_signal(db, patient, signal)
            assessment = build_patient_risk_assessment(db, patient)
            explanations = (signal or {}).get("explanations", [])
            rows.append(
                {
                    "scenario": name,
                    "synthetic_label": SYNTHETIC_LABELS[name],
                    "records": len(stored),
                    "canonical_level": assessment.overall_level,
                    "baseline_ready": assessment.baseline.ready,
                    "baseline_relative_level": assessment.baseline.relative_level,
                    "deterministic_triggered": assessment.deterministic.triggered,
                    "ml_probability": (signal or {}).get("probability"),
                    "ml_prediction_level": (signal or {}).get("prediction_level"),
                    "anomaly_detected": (signal or {}).get("anomaly_detected"),
                    "attribution_method": explanations[0].get("method") if explanations else None,
                    "alert_created": assessment.alert.exists,
                    "evidence_features": [item.feature for item in assessment.evidence],
                }
            )
    return rows


def baseline_personalization(seed: int) -> list[dict]:
    rows = []
    for label, baseline_hr in (("patient_a", 60), ("patient_b", 90)):
        with isolated_database() as db:
            patient = create_patient(db, f"Personalization {label}")
            readings = generate_scenario(
                "normal_stable",
                seed=seed,
                baseline_heart_rate=baseline_hr,
            )[:BASELINE_RECORDS]
            current = replace(
                readings[-1],
                timestamp=(
                    DEFAULT_START + timedelta(minutes=5 * BASELINE_RECORDS)
                ).isoformat(),
                heart_rate=95,
            )
            with patch("early_warning.model_status", return_value={"available": False}):
                ingest_readings(db, patient, readings + [current])
            with patch("risk_assessment.model_status", return_value={"available": False}):
                assessment = build_patient_risk_assessment(db, patient)
            metric = assessment.baseline.metrics["heart_rate"]
            rows.append(
                {
                    "patient": label,
                    "synthetic_baseline_target_bpm": baseline_hr,
                    "current_heart_rate_bpm": 95,
                    "baseline_mean_bpm": metric.mean,
                    "deviation_bpm": metric.deviation,
                    "deviation_percent": metric.deviation_percent,
                    "z_score": metric.z_score,
                    "baseline_relative_level": assessment.baseline.relative_level,
                    "canonical_level": assessment.overall_level,
                }
            )
    return rows


def _persistence_run(seed: int, abnormal_count: int) -> dict:
    with isolated_database() as db:
        patient = create_patient(db, f"Persistence {abnormal_count}")
        set_governance(db, enabled=False, mode="live")
        normal = generate_scenario("normal_stable", seed=seed)[:BASELINE_RECORDS]
        latest = normal[-1]
        abnormal = [
            replace(
                latest,
                timestamp=(
                    DEFAULT_START
                    + timedelta(minutes=5 * (BASELINE_RECORDS + offset))
                ).isoformat(),
                heart_rate=115,
                risk_score=6,
            )
            for offset in range(abnormal_count)
        ]
        ingest_readings(db, patient, normal + abnormal)
        with patch("risk_assessment.model_status", return_value={"available": False}):
            assessment = build_patient_risk_assessment(db, patient)
        cases = db.query(models.ReviewCase).filter_by(patient_id=patient.id).all()
        return {
            "abnormal_readings": abnormal_count,
            "canonical_level": assessment.overall_level,
            "alert_count": len(cases),
            "alert_severity": cases[-1].risk_level if cases else None,
            "duplicate_updates": cases[-1].duplicate_updates if cases else 0,
        }


def persistence_comparison(seed: int) -> list[dict]:
    return [_persistence_run(seed, 1), _persistence_run(seed, 5)]


def multi_signal_comparison(seed: int) -> list[dict]:
    rows = []
    for label, changes in (
        ("heart_rate_only", {"heart_rate": 110, "risk_score": 6}),
        ("heart_rate_and_spo2", {"heart_rate": 110, "spo2": 93.0, "risk_score": 8}),
    ):
        with isolated_database() as db:
            patient = create_patient(db, f"Multi signal {label}")
            normal = generate_scenario("normal_stable", seed=seed)[:BASELINE_RECORDS]
            current = replace(
                normal[-1],
                timestamp=(
                    DEFAULT_START + timedelta(minutes=5 * BASELINE_RECORDS)
                ).isoformat(),
                **changes,
            )
            with patch("early_warning.model_status", return_value={"available": False}):
                ingest_readings(db, patient, normal + [current])
            with patch("risk_assessment.model_status", return_value={"available": False}):
                assessment = build_patient_risk_assessment(db, patient)
            rows.append(
                {
                    "case": label,
                    "canonical_level": assessment.overall_level,
                    "relative_level": assessment.baseline.relative_level,
                    "relative_score": assessment.baseline.relative_score,
                    "baseline_reasons": assessment.baseline.reasons,
                    "trend_evidence": [
                        item.description
                        for item in assessment.evidence
                        if item.source == "trend_rule"
                    ],
                }
            )
    return rows


def critical_override_results(seed: int) -> list[dict]:
    cases = (
        ("spo2", {"spo2": 88.0}),
        ("heart_rate", {"heart_rate": 141}),
        ("blood_pressure", {"systolic_bp": 180, "diastolic_bp": 120}),
    )
    rows = []
    for label, changes in cases:
        with isolated_database() as db:
            patient = create_patient(db, f"Critical {label}")
            normal = generate_scenario("normal_stable", seed=seed)[:BASELINE_RECORDS]
            current = replace(
                normal[-1],
                timestamp=(
                    DEFAULT_START + timedelta(minutes=5 * BASELINE_RECORDS)
                ).isoformat(),
                **changes,
            )
            with patch("early_warning.model_status", return_value={"available": False}):
                ingest_readings(db, patient, normal + [current])
            with patch("risk_assessment.model_status", return_value={"available": False}):
                assessment = build_patient_risk_assessment(db, patient)
            rows.append(
                {
                    "injected_abnormality": label,
                    "canonical_level": assessment.overall_level,
                    "critical_triggered": assessment.deterministic.triggered,
                    "alert_created": assessment.alert.exists,
                    "passed": assessment.overall_level == "critical"
                    and assessment.deterministic.triggered,
                }
            )
    return rows


def shadow_mode_result(seed: int) -> dict:
    elevated = {
        "probability": 0.8,
        "model_version": "physionet-critical-v1",
        "explanations": [
            {
                "feature": "heart_rate_mean_3",
                "value": 105,
                "contribution": 0.4,
                "method": "SHAP",
            }
        ],
        "drift": {"score": 0.2},
    }
    status = {
        "available": True,
        "operating_threshold": 0.1,
        "model_version": "physionet-critical-v1",
    }
    with isolated_database() as db:
        patient = create_patient(db, "Shadow mode")
        normal = generate_scenario("normal_stable", seed=seed)[:BASELINE_RECORDS]
        with patch("early_warning.model_status", return_value={"available": False}):
            ingest_readings(db, patient, normal)
        latest = normal[-1]
        elevated_readings = [
            replace(
                latest,
                timestamp=(
                    DEFAULT_START
                    + timedelta(minutes=5 * (BASELINE_RECORDS + offset))
                ).isoformat(),
                heart_rate=100 + offset * 5,
            )
            for offset in range(2)
        ]
        with (
            patch("early_warning.model_status", return_value=status),
            patch("early_warning.predict", return_value=elevated),
        ):
            ingest_readings(db, patient, elevated_readings)
        with (
            patch("risk_assessment.model_status", return_value=status),
            patch("risk_assessment.predict", return_value=elevated),
        ):
            assessment = build_patient_risk_assessment(db, patient)
        predictions = db.query(models.ModelPredictionRecord).filter_by(patient_id=patient.id).all()
        alerts = db.query(models.ReviewCase).filter_by(patient_id=patient.id).count()
        return {
            "controlled_probability": elevated["probability"],
            "operating_threshold": status["operating_threshold"],
            "stored_predictions": len(predictions),
            "latest_prediction_stored": bool(
                predictions and predictions[-1].vital_id == assessment.ml.based_on_vital_id
            ),
            "governance_mode": assessment.ml.governance_mode,
            "ml_classification": assessment.ml.classification,
            "active_alert_eligible": assessment.ml.active_alert_eligible,
            "review_cases": alerts,
            "passed": len(predictions) == 2
            and alerts == 0
            and not assessment.ml.active_alert_eligible,
        }


def groq_independence_result(seed: int) -> dict:
    with isolated_database() as db:
        patient = create_patient(db, "Groq independence")
        readings = generate_scenario("combined_hr_spo2", seed=seed)
        with patch("early_warning.model_status", return_value={"available": False}):
            ingest_readings(db, patient, readings)
        with patch("risk_assessment.model_status", return_value={"available": False}):
            disabled = build_patient_risk_assessment(db, patient)
            with patch(
                "routes.assistant.get_groq_client",
                side_effect=AssertionError("Canonical assessment called Groq"),
            ):
                enabled = build_patient_risk_assessment(db, patient)
        disabled_value = _without_generated_at(disabled)
        enabled_value = _without_generated_at(enabled)
        return {
            "canonical_identical": disabled_value == enabled_value,
            "alert_identical": disabled_value["alert"] == enabled_value["alert"],
            "groq_called_by_canonical": False,
            "narrative_output_evaluated": False,
            "passed": disabled_value == enabled_value,
        }


def security_boundary_result(seed: int) -> dict:
    from routes.assistant import build_patient_context
    from routes.patients import get_patient_risk_assessment

    with isolated_database() as db:
        patient = create_patient(db, "Never Expose Evaluation Name")
        readings = generate_scenario("normal_stable", seed=seed)
        with patch("early_warning.model_status", return_value={"available": False}):
            ingest_readings(db, patient, readings)
        outsider = models.User(
            email="evaluation-outsider@example.invalid",
            full_name="Evaluation Outsider",
            role="doctor",
            password_hash="not-a-real-login",
            status="active",
        )
        db.add(outsider)
        db.commit()
        db.refresh(outsider)

        status_code = None
        try:
            get_patient_risk_assessment(patient.id, db, outsider)
        except HTTPException as exc:
            status_code = exc.status_code

        context = build_patient_context(patient.id, db)
        name_absent = patient.name not in context
        pseudonym_present = f"patient-{patient.id}" in context
        return {
            "unauthorized_canonical_access_status": status_code,
            "unauthorized_access_denied": status_code == 404,
            "assistant_context_patient_name_absent": name_absent,
            "assistant_context_pseudonym_present": pseudonym_present,
            "synthetic_data_only": True,
            "passed": status_code == 404 and name_absent and pseudonym_present,
        }


def false_alert_evaluation(seed: int, trials: int = 30) -> tuple[dict, list[dict]]:
    if trials < 1:
        raise ValueError("False-alert trials must be positive")
    rows = []
    for trial in range(trials):
        with isolated_database() as db:
            patient = create_patient(db, f"Normal trial {trial + 1}")
            set_governance(db, enabled=False, mode="live")
            ingest_readings(
                db,
                patient,
                generate_scenario("normal_stable", seed=seed + trial),
            )
            alert_count = (
                db.query(models.ReviewCase).filter_by(patient_id=patient.id).count()
            )
            rows.append(
                {
                    "trial": trial + 1,
                    "seed": seed + trial,
                    "synthetic_label": "normal",
                    "alert_count": alert_count,
                    "false_alert": alert_count > 0,
                }
            )
    false_alerts = sum(1 for row in rows if row["false_alert"])
    return (
        {
            "normal_sequences": trials,
            "false_alerts": false_alerts,
            "false_alert_rate": false_alerts / trials,
            "governance_mode": "live",
            "ml_enabled": False,
            "label_source": "fixed-seed synthetic normal scenario",
        },
        rows,
    )


def shap_attribution_evaluation(
    seed: int,
    repeats_per_abnormality: int = 5,
) -> tuple[dict, list[dict]]:
    """Measure top-k attribution alignment and report the actual method used."""
    if repeats_per_abnormality < 1:
        raise ValueError("Attribution repetitions must be positive")
    rows = []
    cases = (
        ("heart_rate", "heart_rate", {"heart_rate": 135}),
        ("spo2", "spo2", {"spo2": 90.0}),
    )
    for injected, expected_prefix, changes in cases:
        for repeat in range(repeats_per_abnormality):
            readings = generate_scenario("normal_stable", seed=seed + repeat)[
                :BASELINE_RECORDS
            ]
            current = replace(
                readings[-1],
                timestamp=(
                    DEFAULT_START + timedelta(minutes=5 * BASELINE_RECORDS)
                ).isoformat(),
                **changes,
            )
            vital_objects = []
            for index, reading in enumerate(readings + [current], start=1):
                values = reading.measurement(patient_id=1)
                vital_objects.append(type("EvaluationVital", (), {**values, "id": index})())
            signal = model_predict(
                list(reversed(vital_objects)),
                patient_id=1,
                include_explanation=True,
            )
            explanations = (signal or {}).get("explanations", [])
            features = [str(item.get("feature", "")) for item in explanations]
            methods = sorted({str(item.get("method", "unknown")) for item in explanations})
            rows.append(
                {
                    "injected_abnormality": injected,
                    "repeat": repeat + 1,
                    "seed": seed + repeat,
                    "expected_feature_prefix": expected_prefix,
                    "top_1_feature": features[0] if features else None,
                    "top_3_features": features[:3],
                    "top_1_match": bool(features and features[0].startswith(expected_prefix)),
                    "top_3_match": any(
                        feature.startswith(expected_prefix) for feature in features[:3]
                    ),
                    "methods": methods,
                    "model_version": (signal or {}).get("model_version"),
                }
            )
    top_1 = sum(1 for row in rows if row["top_1_match"])
    top_3 = sum(1 for row in rows if row["top_3_match"])
    methods = sorted({method for row in rows for method in row["methods"]})
    return (
        {
            "evaluations": len(rows),
            "top_1_matches": top_1,
            "top_1_rate": top_1 / len(rows),
            "top_3_matches": top_3,
            "top_3_rate": top_3 / len(rows),
            "methods_observed": methods,
            "shap_available_for_all": methods == ["SHAP"],
            "interpretation": "Feature attribution alignment; not causal explanation.",
        },
        rows,
    )


def _percentile(values: list[float], percentile: float) -> float:
    ordered = sorted(values)
    position = (len(ordered) - 1) * percentile
    lower = int(position)
    upper = min(lower + 1, len(ordered) - 1)
    weight = position - lower
    return ordered[lower] * (1 - weight) + ordered[upper] * weight


def performance_evaluation(
    seed: int,
    iterations: int = 30,
) -> tuple[dict, list[dict]]:
    if iterations < 1:
        raise ValueError("Performance iterations must be positive")
    rng_readings = generate_scenario("normal_stable", seed=seed)
    samples = []
    with isolated_database() as db:
        patient = create_patient(db, "Performance evaluation")
        setup = rng_readings[:BASELINE_RECORDS]
        with patch("early_warning.model_status", return_value={"available": False}):
            ingest_readings(db, patient, setup)

        template = setup[-1]
        for offset in range(iterations + 1):
            reading = replace(
                template,
                timestamp=(
                    DEFAULT_START
                    + timedelta(minutes=5 * (BASELINE_RECORDS + offset))
                ).isoformat(),
                heart_rate=template.heart_rate + (offset % 3) - 1,
            )
            started = perf_counter()
            result = ingest_vital(
                db,
                reading.measurement(patient.id),
                source="simulator",
                verification_status="unverified",
            )
            assessment = build_patient_risk_assessment(db, patient)
            elapsed_ms = (perf_counter() - started) * 1000
            if offset == 0:
                continue
            samples.append(
                {
                    "iteration": offset,
                    "duration_ms": round(elapsed_ms, 4),
                    "vital_id": result.vital.id,
                    "canonical_level": assessment.overall_level,
                    "assessment_version": assessment.assessment_version,
                }
            )
    durations = [row["duration_ms"] for row in samples]
    environment = {
        "platform": platform.platform(),
        "processor": platform.processor() or "not reported",
        "logical_cpu_count": os.cpu_count(),
        "python": platform.python_version(),
        "sqlalchemy": importlib.metadata.version("sqlalchemy"),
        "scikit_learn": importlib.metadata.version("scikit-learn"),
        "database": "SQLite in-memory",
    }
    return (
        {
            "iterations": iterations,
            "warmup_iterations": 1,
            "measurement": "ingest_vital through early warning, then canonical assessment available",
            "mean_ms": round(mean(durations), 4),
            "median_ms": round(median(durations), 4),
            "p95_ms": round(_percentile(durations, 0.95), 4),
            "minimum_ms": round(min(durations), 4),
            "maximum_ms": round(max(durations), 4),
            "environment": environment,
        },
        samples,
    )
