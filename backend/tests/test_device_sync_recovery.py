from datetime import datetime, timedelta, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import models
from database import Base
from device_sync_recovery import reconcile_stale_sync_attempts


def test_stale_pending_attempt_is_closed_once_without_altering_newer_success():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    db = sessionmaker(bind=engine)()
    patient = models.Patient(name="Synthetic Patient", age=60, condition="Test", risk_level="Low")
    db.add(patient)
    db.commit()
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    old = models.DeviceSyncAttempt(patient_id=patient.id, provider="withings", attempted_at=now - timedelta(hours=1), state="pending")
    recent = models.DeviceSyncAttempt(patient_id=patient.id, provider="withings", attempted_at=now - timedelta(minutes=2), state="pending")
    success = models.DeviceSyncAttempt(patient_id=patient.id, provider="withings", attempted_at=now - timedelta(minutes=1), completed_at=now, state="success")
    db.add_all([old, recent, success])
    db.commit()

    assert reconcile_stale_sync_attempts(db) == 1
    db.refresh(old)
    db.refresh(recent)
    db.refresh(success)
    assert old.state == "error"
    assert old.error_code == "interrupted"
    assert old.completed_at is not None
    assert recent.state == "pending"
    assert success.state == "success"
    assert reconcile_stale_sync_attempts(db) == 0
    db.close()


def test_interrupted_sync_updates_current_connection_error_but_not_later_success():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    db = sessionmaker(bind=engine)()
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    for index, later_success in enumerate((False, True), start=1):
        patient = models.Patient(name=f"Synthetic {index}", age=60, condition="Test", risk_level="Low")
        db.add(patient)
        db.flush()
        connection = models.WithingsConnection(
            patient_id=patient.id, connected_by_user_id=1,
            withings_userid=f"synthetic-{index}", access_token_encrypted="test",
            refresh_token_encrypted="test", token_expires_at=now + timedelta(days=1),
            last_successful_sync=now - timedelta(minutes=10) if later_success else None,
        )
        attempt = models.DeviceSyncAttempt(
            patient_id=patient.id, provider="withings",
            attempted_at=now - timedelta(hours=1), state="pending",
        )
        db.add_all([connection, attempt])
    db.commit()

    assert reconcile_stale_sync_attempts(db) == 2
    connections = db.query(models.WithingsConnection).order_by(models.WithingsConnection.id).all()
    assert connections[0].last_error_code == "interrupted"
    assert connections[0].last_error_at is not None
    assert connections[1].last_error_code is None
    db.close()
