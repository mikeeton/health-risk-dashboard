import asyncio
from types import SimpleNamespace

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

import models
from auth_utils import create_websocket_ticket
from routes import notifications, vitals


@pytest.fixture()
def sessions(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'review.db'}", pool_size=1, max_overflow=0)
    models.Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    yield factory, engine
    engine.dispose()


def add_vital(db, timestamp):
    row = models.Vital(
        patient_id=1, timestamp=timestamp, heart_rate=80, spo2=98,
        systolic_bp=120, diastolic_bp=80, steps=1000, sleep_hours=7,
        active_minutes=30, calories=1800, risk_score=1, activity_state="resting",
        source="manual",
    )
    db.add(row)
    db.commit()
    return row


def test_vitals_use_observation_time_not_insertion_order(sessions, monkeypatch):
    factory, _ = sessions
    monkeypatch.setattr(vitals, "get_accessible_patient", lambda *_: None)
    with factory() as db:
        newest = add_vital(db, "2026-10-19T10:00:00Z")
        oldest = add_vital(db, "2026-10-19T11:00:00+02:00")
        middle = add_vital(db, "2026-10-19T09:30:00")
        assert [row.id for row in vitals.get_patient_vitals(1, db, None)] == [oldest.id, middle.id, newest.id]


@pytest.mark.parametrize("fail_commit", [False, True])
def test_delete_and_audit_are_atomic(sessions, monkeypatch, fail_commit):
    factory, _ = sessions
    monkeypatch.setattr(vitals, "get_accessible_patient", lambda *_: None)
    with factory() as db:
        row_id = add_vital(db, "2026-10-19T10:00:00Z").id
        user = SimpleNamespace(role="doctor", email="review@example.com")
        if fail_commit:
            def fail(_session):
                raise RuntimeError("Storage unavailable")
            event.listen(db, "before_commit", fail)
            with pytest.raises(RuntimeError, match="Storage unavailable"):
                vitals.delete_vital(row_id, db, user)
            db.rollback()
        else:
            assert "deleted successfully" in vitals.delete_vital(row_id, db, user)["message"]
        assert (db.get(models.Vital, row_id) is not None) == fail_commit
        assert db.query(models.AuditLog).filter_by(action="DELETE_VITAL").count() == (0 if fail_commit else 1)


def test_notification_socket_releases_connection_and_rechecks_account(sessions, monkeypatch):
    factory, engine = sessions
    with factory() as db:
        user = models.User(email="socket@example.com", full_name="Socket", role="doctor", status="active", password_hash="unused")
        db.add(user)
        db.commit()
        user_id = user.id
        ticket = create_websocket_ticket(user, "notifications")

    monkeypatch.setattr(notifications, "SessionLocal", factory)
    monkeypatch.setattr(notifications.settings, "redis_url", "redis://test")
    sent, closed = [], []

    class Socket:
        async def accept(self):
            assert engine.pool.checkedout() == 0

        async def send_json(self, data):
            assert engine.pool.checkedout() == 0
            sent.append(data)

        async def close(self, code):
            assert engine.pool.checkedout() == 0
            closed.append(code)

    async def wait():
        assert engine.pool.checkedout() == 0
        # Another request must be able to use the single pool connection.
        with factory() as db:
            db.get(models.User, user_id).status = "suspended"
            db.commit()

    monkeypatch.setattr(notifications, "wait_for_notification_change", wait)
    asyncio.run(notifications.notification_socket(Socket(), ticket))
    assert len(sent) == 1
    assert closed == [1008]
    assert engine.pool.checkedout() == 0
