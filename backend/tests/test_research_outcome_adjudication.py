from datetime import datetime, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import models
from database import Base
from routes import research


def setup_prediction():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    db = sessionmaker(bind=engine)()
    user = models.User(email="research@example.test", full_name="Research Admin", role="admin", password_hash="unused", status="active")
    patient = models.Patient(name="Synthetic Patient", age=60, condition="Test", risk_level="Low")
    db.add_all([user, patient])
    db.commit()
    prediction = models.ModelPredictionRecord(
        patient_id=patient.id, created_at=datetime(2026, 10, 19, 0), window_end=datetime(2026, 10, 19, 6),
        probability=0.8, threshold=0.5, predicted_positive=True, consecutive_positive_count=1,
        mode="shadow", model_version="synthetic-test",
    )
    db.add(prediction)
    db.commit()
    return db, user, patient, prediction


def add_vital(db, patient_id: int, *, heart_rate: int = 75):
    row = models.Vital(
        patient_id=patient_id, timestamp="2026-10-19T03:00:00+00:00", heart_rate=heart_rate,
        spo2=97, systolic_bp=120, diastolic_bp=80, steps=0, sleep_hours=7,
        active_minutes=0, calories=0, risk_score=2, activity_state="resting", source="manual",
    )
    db.add(row)
    db.commit()
    return row


def negative_payload(prediction_id: int, *, observed_hour: int = 7):
    return research.OutcomeCreate(
        prediction_id=prediction_id, outcome_observed=False,
        outcome_type="No critical observed vital in six-hour window",
        observed_at=datetime(2026, 10, 19, observed_hour, tzinfo=timezone.utc),
        adjudication_status="single_reviewer", notes="Checked the recorded follow-up vital and source timestamp.",
    )


def test_negative_adjudication_requires_expired_window_and_real_followup(monkeypatch):
    db, user, patient, prediction = setup_prediction()
    monkeypatch.setattr(research, "now", lambda: datetime(2026, 10, 19, 8))
    assert research.pending_predictions(db=db, user=user)[0]["window_expired"] is True
    with pytest.raises(HTTPException, match="No observed vital follow-up"):
        research.record_outcome(negative_payload(prediction.id), db=db, user=user)
    add_vital(db, patient.id)
    with pytest.raises(HTTPException, match="before the prediction window ends"):
        research.record_outcome(negative_payload(prediction.id, observed_hour=5), db=db, user=user)

    result = research.record_outcome(negative_payload(prediction.id), db=db, user=user)
    assert result["classification"] == "FP"
    saved = db.query(models.ProspectiveValidationOutcome).one()
    assert "In-window vital IDs" in saved.notes
    db.close()


def test_critical_followup_cannot_be_adjudicated_negative(monkeypatch):
    db, user, patient, prediction = setup_prediction()
    monkeypatch.setattr(research, "now", lambda: datetime(2026, 10, 19, 8))
    add_vital(db, patient.id, heart_rate=150)
    with pytest.raises(HTTPException, match="contradicts"):
        research.record_outcome(negative_payload(prediction.id), db=db, user=user)
    assert db.query(models.ProspectiveValidationOutcome).count() == 0
    db.close()


def test_outcome_requires_timezone_and_source_note(monkeypatch):
    db, user, patient, prediction = setup_prediction()
    monkeypatch.setattr(research, "now", lambda: datetime(2026, 10, 19, 8))
    add_vital(db, patient.id)
    no_zone = negative_payload(prediction.id).model_copy(update={"observed_at": datetime(2026, 10, 19, 7)})
    with pytest.raises(HTTPException, match="timezone offset"):
        research.record_outcome(no_zone, db=db, user=user)
    no_source = negative_payload(prediction.id).model_copy(update={"notes": ""})
    with pytest.raises(HTTPException, match="source-based"):
        research.record_outcome(no_source, db=db, user=user)
    db.close()
