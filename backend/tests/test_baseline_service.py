from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import models
from baseline_service import (
    BASELINE_VERSION,
    MAX_BASELINE_SAMPLES,
    MIN_BASELINE_SAMPLES,
    build_patient_baseline,
)
from database import Base


@pytest.fixture()
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def create_patient(db, name="Baseline Patient"):
    patient = models.Patient(
        name=name,
        age=55,
        condition="General monitoring",
        risk_level="Low",
        last_checkup="2026-09-01",
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


def add_vital(
    db,
    patient_id,
    index,
    *,
    heart_rate=70,
    spo2=97,
    systolic_bp=120,
    diastolic_bp=80,
    sleep_hours=7,
    steps=1000,
    activity_state="resting",
):
    origin = datetime(2026, 9, 1, tzinfo=timezone.utc)
    vital = models.Vital(
        patient_id=patient_id,
        timestamp=(origin + timedelta(hours=index)).isoformat(),
        heart_rate=heart_rate,
        spo2=spo2,
        systolic_bp=systolic_bp,
        diastolic_bp=diastolic_bp,
        steps=steps,
        sleep_hours=sleep_hours,
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


def add_reference_history(db, patient_id, heart_rates):
    for index, heart_rate in enumerate(heart_rates):
        add_vital(db, patient_id, index, heart_rate=heart_rate)
    return add_vital(db, patient_id, len(heart_rates), heart_rate=heart_rates[-1])


def test_fewer_than_minimum_prior_samples_is_not_ready(db):
    patient = create_patient(db)
    current = add_reference_history(
        db,
        patient.id,
        [70] * (MIN_BASELINE_SAMPLES - 1),
    )

    baseline = build_patient_baseline(db, patient.id, current_vital=current)

    assert baseline.version == BASELINE_VERSION
    assert baseline.ready is False
    assert baseline.reason == "insufficient_history"
    assert baseline.sample_count == MIN_BASELINE_SAMPLES - 1


def test_normal_current_reading_has_small_patient_relative_deviation(db):
    patient = create_patient(db)
    current = add_reference_history(
        db,
        patient.id,
        [68, 69, 70, 71, 72] * 2,
    )
    current.heart_rate = 71
    db.commit()

    baseline = build_patient_baseline(db, patient.id, current_vital=current)
    heart = baseline.metrics["heart_rate"]

    assert baseline.ready is True
    assert heart.mean == pytest.approx(70, abs=0.01)
    assert abs(heart.deviation_percent) < 2
    assert abs(heart.z_score) < 1


def test_large_heart_rate_deviation_has_large_positive_z_score(db):
    patient = create_patient(db)
    current = add_reference_history(
        db,
        patient.id,
        [68, 69, 70, 71, 72] * 2,
    )
    current.heart_rate = 110
    db.commit()

    baseline = build_patient_baseline(db, patient.id, current_vital=current)

    assert baseline.ready is True
    assert baseline.metrics["heart_rate"].deviation == pytest.approx(40, abs=0.01)
    assert baseline.metrics["heart_rate"].z_score > 20


def test_same_current_value_is_more_abnormal_for_lower_baseline_patient(db):
    patient_a = create_patient(db, "Patient A")
    current_a = add_reference_history(
        db,
        patient_a.id,
        [58, 59, 60, 61, 62] * 2,
    )
    current_a.heart_rate = 95

    patient_b = create_patient(db, "Patient B")
    current_b = add_reference_history(
        db,
        patient_b.id,
        [86, 87, 88, 89, 90] * 2,
    )
    current_b.heart_rate = 95
    db.commit()

    baseline_a = build_patient_baseline(db, patient_a.id, current_vital=current_a)
    baseline_b = build_patient_baseline(db, patient_b.id, current_vital=current_b)
    z_a = baseline_a.metrics["heart_rate"].z_score
    z_b = baseline_b.metrics["heart_rate"].z_score

    assert baseline_a.ready is True
    assert baseline_b.ready is True
    assert z_a > z_b * 3


def test_single_sensor_outlier_does_not_shift_baseline_mean(db):
    patient = create_patient(db)
    current = add_reference_history(
        db,
        patient.id,
        [70] * MIN_BASELINE_SAMPLES + [220],
    )
    current.heart_rate = 72
    db.commit()

    baseline = build_patient_baseline(db, patient.id, current_vital=current)
    heart = baseline.metrics["heart_rate"]

    assert baseline.ready is True
    assert heart.raw_sample_count == 11
    assert heart.sample_count == 10
    assert heart.excluded_outliers == 1
    assert heart.mean == 70


def test_only_most_recent_observation_window_is_used(db):
    patient = create_patient(db)
    old_values = [50] * 5
    recent_values = [80] * MAX_BASELINE_SAMPLES
    current = add_reference_history(db, patient.id, old_values + recent_values)
    current.heart_rate = 80
    db.commit()

    baseline = build_patient_baseline(db, patient.id, current_vital=current)

    assert baseline.ready is True
    assert baseline.metrics["heart_rate"].raw_sample_count == MAX_BASELINE_SAMPLES
    assert baseline.metrics["heart_rate"].mean == 80
    assert baseline.ordering == "oldest_to_newest"


def test_non_resting_and_invalid_timestamp_records_are_excluded(db):
    patient = create_patient(db)
    for index in range(MIN_BASELINE_SAMPLES):
        add_vital(db, patient.id, index, heart_rate=68 + (index % 5))
    add_vital(
        db,
        patient.id,
        MIN_BASELINE_SAMPLES,
        heart_rate=90,
        activity_state="walking",
    )
    invalid_time = add_vital(
        db,
        patient.id,
        MIN_BASELINE_SAMPLES + 1,
        heart_rate=90,
    )
    invalid_time.timestamp = "not-a-timestamp"
    current = add_vital(
        db,
        patient.id,
        MIN_BASELINE_SAMPLES + 2,
        heart_rate=70,
    )
    db.commit()

    baseline = build_patient_baseline(db, patient.id, current_vital=current)

    assert baseline.ready is True
    assert baseline.metrics["heart_rate"].raw_sample_count == MIN_BASELINE_SAMPLES
