from datetime import datetime, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import early_warning
import models
from database import Base


def vital(patient_id: int, timestamp: str, heart_rate: int = 75) -> models.Vital:
    return models.Vital(
        patient_id=patient_id, timestamp=timestamp, heart_rate=heart_rate,
        spo2=97, systolic_bp=120, diastolic_bp=80, steps=0,
        sleep_hours=7, active_minutes=0, calories=0, risk_score=2,
        activity_state="resting", source="manual",
    )


def prediction_session(predicted_positive: bool = True):
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    db = sessionmaker(bind=engine)()
    patient = models.Patient(name="Synthetic Patient", age=60, condition="Test", risk_level="Low")
    db.add(patient)
    db.commit()
    source = vital(patient.id, "2026-10-19T00:00:00+00:00")
    db.add(source)
    db.commit()
    record = models.ModelPredictionRecord(
        patient_id=patient.id, vital_id=source.id,
        created_at=datetime(2026, 10, 19, 0), window_end=datetime(2026, 10, 19, 6),
        probability=0.8, threshold=0.5, predicted_positive=predicted_positive,
        consecutive_positive_count=1, mode="shadow", model_version="synthetic-test",
    )
    db.add(record)
    db.commit()
    return db, patient, record


def test_expired_prediction_without_in_window_observation_remains_unresolved(monkeypatch):
    db, patient, record = prediction_session()
    monkeypatch.setattr(early_warning, "_now", lambda: datetime(2026, 10, 19, 7, 30, tzinfo=timezone.utc))
    later = vital(patient.id, "2026-10-19T07:00:00+00:00")
    db.add(later)
    db.commit()
    early_warning._reconcile_predictions(db, later, False)
    assert record.outcome_observed is None
    assert record.classification is None
    db.close()


def test_expired_prediction_with_observed_normal_followup_is_proxy_negative(monkeypatch):
    db, patient, record = prediction_session()
    monkeypatch.setattr(early_warning, "_now", lambda: datetime(2026, 10, 19, 7, 30, tzinfo=timezone.utc))
    followup = vital(patient.id, "2026-10-19T03:00:00+00:00")
    db.add(followup)
    db.commit()
    early_warning._reconcile_predictions(db, followup, False)
    assert record.outcome_observed is False
    assert record.classification == "FP"
    db.close()


def test_delayed_critical_reading_uses_measurement_time_and_not_arrival_time(monkeypatch):
    db, patient, record = prediction_session(predicted_positive=False)
    monkeypatch.setattr(early_warning, "_now", lambda: datetime(2026, 10, 19, 8, 30, tzinfo=timezone.utc))
    delayed = vital(patient.id, "2026-10-19T03:00:00+00:00", heart_rate=150)
    db.add(delayed)
    db.commit()
    early_warning._reconcile_predictions(db, delayed, True)
    assert record.outcome_observed is True
    assert record.classification == "FN"
    db.close()


def test_future_dated_observation_does_not_reconcile_before_measurement_time(monkeypatch):
    db, patient, record = prediction_session()
    monkeypatch.setattr(early_warning, "_now", lambda: datetime(2026, 10, 19, 2, tzinfo=timezone.utc))
    future = vital(patient.id, "2026-10-19T03:00:00+00:00", heart_rate=150)
    db.add(future)
    db.commit()
    early_warning._reconcile_predictions(db, future, True)
    assert record.outcome_observed is None
    db.close()


def test_late_critical_followup_corrects_previous_observed_negative(monkeypatch):
    db, patient, record = prediction_session()
    monkeypatch.setattr(early_warning, "_now", lambda: datetime(2026, 10, 19, 7, tzinfo=timezone.utc))
    normal = vital(patient.id, "2026-10-19T02:00:00+00:00")
    db.add(normal)
    db.commit()
    early_warning._reconcile_predictions(db, normal, False)
    assert record.classification == "FP"

    monkeypatch.setattr(early_warning, "_now", lambda: datetime(2026, 10, 19, 8, tzinfo=timezone.utc))
    delayed_critical = vital(patient.id, "2026-10-19T04:00:00+00:00", heart_rate=150)
    db.add(delayed_critical)
    db.commit()
    early_warning._reconcile_predictions(db, delayed_critical, True)
    assert record.outcome_observed is True
    assert record.classification == "TP"
    db.close()


def test_automatic_reconciliation_does_not_overwrite_manual_adjudication(monkeypatch):
    db, patient, record = prediction_session()
    record.outcome_observed = False
    record.classification = "FP"
    db.add(models.ProspectiveValidationOutcome(
        prediction_id=record.id, outcome_observed=False,
        outcome_type="Observed-field proxy negative", observed_at=datetime(2026, 10, 19, 7),
        adjudication_status="single_reviewer", notes="Synthetic source reviewed",
    ))
    db.commit()
    monkeypatch.setattr(early_warning, "_now", lambda: datetime(2026, 10, 19, 8, tzinfo=timezone.utc))
    delayed = vital(patient.id, "2026-10-19T04:00:00+00:00", heart_rate=150)
    db.add(delayed)
    db.commit()
    early_warning._reconcile_predictions(db, delayed, True)
    assert record.outcome_observed is False
    assert record.classification == "FP"
    db.close()
