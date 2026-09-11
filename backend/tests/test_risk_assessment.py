import json
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import models
import risk_assessment
from database import Base
from risk_assessment import build_patient_risk_assessment
from routes.patients import get_patient_risk_assessment


@pytest.fixture()
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()
        risk_assessment._live_prediction_cache.clear()


@pytest.fixture(autouse=True)
def unavailable_model(monkeypatch):
    monkeypatch.setattr(
        risk_assessment,
        "model_status",
        lambda: {"available": False, "operating_threshold": 0.5},
    )


def create_patient(db):
    doctor = models.User(
        email="assigned@example.com",
        full_name="Assigned Doctor",
        role="doctor",
        password_hash="x",
        status="active",
    )
    patient = models.Patient(
        name="Assessment Patient",
        age=60,
        condition="General monitoring",
        risk_level="Low",
        last_checkup="2026-09-01",
    )
    db.add_all([doctor, patient])
    db.flush()
    patient.primary_doctor_id = doctor.id
    db.add(
        models.PatientStaffAssignment(
            patient_id=patient.id,
            staff_user_id=doctor.id,
            role="doctor",
            status="active",
            assigned_at=datetime.now(timezone.utc).isoformat(),
        )
    )
    db.commit()
    return patient, doctor


def add_vital(
    db,
    patient_id,
    index,
    *,
    heart_rate=72,
    spo2=98,
    systolic_bp=120,
    diastolic_bp=80,
    activity_state="resting",
):
    recorded_at = datetime.now(timezone.utc) - timedelta(minutes=10 - index)
    vital = models.Vital(
        patient_id=patient_id,
        timestamp=recorded_at.isoformat(),
        heart_rate=heart_rate,
        spo2=spo2,
        systolic_bp=systolic_bp,
        diastolic_bp=diastolic_bp,
        steps=1000,
        sleep_hours=7,
        active_minutes=30,
        calories=1800,
        risk_score=1,
        activity_state=activity_state,
        source="manual",
        verification_status="verified",
    )
    db.add(vital)
    db.commit()
    db.refresh(vital)
    return vital


def add_stable_history(db, patient_id):
    return [add_vital(db, patient_id, index) for index in range(1, 6)]


def add_prediction(db, patient_id, vital_id, *, probability, threshold=0.1, mode="shadow"):
    prediction = models.ModelPredictionRecord(
        patient_id=patient_id,
        vital_id=vital_id,
        created_at=datetime.now(timezone.utc).replace(tzinfo=None),
        window_end=(datetime.now(timezone.utc) + timedelta(hours=6)).replace(tzinfo=None),
        probability=probability,
        threshold=threshold,
        predicted_positive=probability >= threshold,
        consecutive_positive_count=2,
        mode=mode,
        model_version="test-proxy-v1",
        shap_json=json.dumps(
            [
                {
                    "feature": "spo2_mean_3",
                    "value": 94.2,
                    "contribution": 0.31,
                    "method": "SHAP",
                }
            ]
        ),
        data_quality_json="{}",
        drift_score=0.2,
        notified=False,
    )
    db.add(prediction)
    db.commit()
    return prediction


def test_spo2_critical_rule_overrides_low_ml_probability(db):
    patient, _ = create_patient(db)
    vital = add_vital(db, patient.id, 1, spo2=88)
    add_prediction(db, patient.id, vital.id, probability=0.001)

    assessment = build_patient_risk_assessment(db, patient)

    assert assessment.overall_level == "critical"
    assert assessment.deterministic.triggered is True
    assert assessment.ml.classification == "low"
    assert assessment.overall_score is None


def test_high_heart_rate_is_a_critical_override(db):
    patient, _ = create_patient(db)
    add_vital(db, patient.id, 1, heart_rate=141)

    assessment = build_patient_risk_assessment(db, patient)

    assert assessment.overall_level == "critical"
    assert any("heart rate" in reason for reason in assessment.deterministic.reasons)


def test_baseline_insufficient_is_explicit_and_not_claimed_as_reassurance(db):
    patient, _ = create_patient(db)
    add_vital(db, patient.id, 1)

    assessment = build_patient_risk_assessment(db, patient)

    assert assessment.baseline.ready is False
    assert assessment.baseline.reason == "insufficient_resting_history"
    assert assessment.baseline.relative_level is None
    assert "not evidence of reassurance" in assessment.reason


def test_stable_patient_with_ready_baseline_is_low(db):
    patient, _ = create_patient(db)
    add_stable_history(db, patient.id)

    assessment = build_patient_risk_assessment(db, patient)

    assert assessment.baseline.ready is True
    assert assessment.baseline.relative_level == "low"
    assert assessment.overall_level == "low"
    assert assessment.data_quality.complete is True
    assert assessment.data_quality.stale is False


def test_shadow_ml_is_exposed_without_creating_an_alert(db, monkeypatch):
    patient, _ = create_patient(db)
    latest = add_stable_history(db, patient.id)[-1]
    add_prediction(db, patient.id, latest.id, probability=0.2, mode="shadow")
    monkeypatch.setattr(
        risk_assessment,
        "model_status",
        lambda: {
            "available": True,
            "operating_threshold": 0.1,
            "model_version": "test-proxy-v1",
        },
    )
    monkeypatch.setattr(
        risk_assessment,
        "predict",
        lambda *args, **kwargs: {
            "probability": 0.2,
            "model_version": "test-proxy-v1",
            "anomaly_score": 0.4,
            "anomaly_detected": True,
        },
    )

    before_predictions = db.query(models.ModelPredictionRecord).count()
    assessment = build_patient_risk_assessment(db, patient)

    assert assessment.ml.available is True
    assert assessment.ml.governance_mode == "shadow"
    assert assessment.ml.classification == "high"
    assert assessment.ml.active_alert_eligible is False
    assert assessment.anomaly.available is True
    assert assessment.anomaly.is_anomalous is True
    assert any(item.source == "shap" for item in assessment.evidence)
    assert db.query(models.ModelPredictionRecord).count() == before_predictions
    assert db.query(models.ReviewCase).count() == 0


def test_policy_is_deterministic_for_identical_database_state(db):
    patient, _ = create_patient(db)
    add_stable_history(db, patient.id)

    first = build_patient_risk_assessment(db, patient).model_dump(exclude={"generated_at"})
    second = build_patient_risk_assessment(db, patient).model_dump(exclude={"generated_at"})

    assert first == second


def test_model_unavailable_preserves_baseline_and_safety_assessment(db):
    patient, _ = create_patient(db)
    add_stable_history(db, patient.id)

    assessment = build_patient_risk_assessment(db, patient)

    assert assessment.overall_level == "low"
    assert assessment.baseline.ready is True
    assert assessment.ml.available is False
    assert assessment.anomaly.available is False


def test_endpoint_reuses_existing_patient_access_control(db):
    patient, _ = create_patient(db)
    outsider = models.User(
        email="outsider@example.com",
        full_name="Outsider",
        role="doctor",
        password_hash="x",
        status="active",
    )
    db.add(outsider)
    db.commit()

    with pytest.raises(HTTPException) as error:
        get_patient_risk_assessment(patient.id, db, outsider)

    assert error.value.status_code == 404
