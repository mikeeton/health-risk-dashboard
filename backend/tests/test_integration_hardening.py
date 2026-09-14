import asyncio
from datetime import datetime, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import models
import notification_broadcast
from auth_utils import (
    create_websocket_ticket,
    decode_access_token,
    get_user_from_token,
    get_user_from_websocket_ticket,
)
from database import Base
from simulator_service import (
    calculate_stream_risk_score,
    generate_websocket_vital,
)
from routes import integrations_withings


def test_websocket_ticket_is_short_lived_and_route_scoped():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    db = sessionmaker(bind=engine)()
    user = models.User(
        email="socket@example.com",
        full_name="Socket User",
        role="doctor",
        password_hash="unused",
        status="active",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    ticket = create_websocket_ticket(user, "live_vitals", patient_id=42)
    payload = decode_access_token(ticket)

    assert payload is not None
    expires_in = datetime.fromtimestamp(payload["exp"], timezone.utc) - datetime.now(
        timezone.utc
    )
    assert 0 < expires_in.total_seconds() <= 60
    assert get_user_from_token(ticket, db) is None
    assert get_user_from_websocket_ticket(
        ticket, db, audience="live_vitals", patient_id=42
    ).id == user.id
    assert get_user_from_websocket_ticket(
        ticket, db, audience="notifications"
    ) is None
    assert get_user_from_websocket_ticket(
        ticket, db, audience="live_vitals", patient_id=43
    ) is None
    db.close()


def test_websocket_simulator_service_preserves_transport_contract(monkeypatch):
    integer_values = iter([120, 170, 100, 5000, 45, 2100])
    float_values = iter([92.5, 6.5])
    monkeypatch.setattr(
        "simulator_service.random.randint", lambda *_args: next(integer_values)
    )
    monkeypatch.setattr(
        "simulator_service.random.uniform", lambda *_args: next(float_values)
    )
    monkeypatch.setattr(
        "simulator_service.random.choice", lambda values: values[0]
    )

    record = generate_websocket_vital(17)

    assert record["patientId"] == 17
    assert record["riskScore"] == calculate_stream_risk_score(120, 92.5, 170, 100)
    assert record["source"] == "simulator"
    assert record["persisted"] is False
    assert record["timestamp"].endswith("+00:00")


def test_redis_subscription_failure_returns_to_polling(monkeypatch):
    class UnavailableRedis:
        @classmethod
        def from_url(cls, *_args, **_kwargs):
            raise OSError("Redis unavailable")

    monkeypatch.setattr(notification_broadcast.settings, "redis_url", "redis://test")
    monkeypatch.setattr("redis.asyncio.Redis", UnavailableRedis)

    result = asyncio.run(
        notification_broadcast.wait_for_notification_change(timeout_seconds=0)
    )

    assert result is False


def test_incomplete_withings_group_records_unavailable_state(monkeypatch):
    monkeypatch.setenv("WITHINGS_WEBHOOK_SECRET", "state-secret")
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    db = sessionmaker(bind=engine)()
    patient = models.Patient(
        name="Incomplete Provider Data",
        age=50,
        condition="Monitoring",
        risk_level="Low",
    )
    db.add(patient)
    db.commit()
    connection = models.WithingsConnection(
        patient_id=patient.id,
        connected_by_user_id=1,
        withings_userid="provider-incomplete",
        access_token_encrypted="encrypted",
        refresh_token_encrypted="encrypted",
        token_expires_at=datetime(2026, 9, 15),
    )
    db.add(connection)
    db.commit()

    async def access_token(*_args):
        return "provider-access-token"

    async def measurements(*_args, **_kwargs):
        return {
            "measuregrps": [
                {
                    "grpid": 700,
                    "date": 1789120800,
                    "measures": [{"type": 11, "value": 74, "unit": 0}],
                }
            ]
        }

    class WebhookRequest:
        async def body(self):
            return (
                b"userid=provider-incomplete&appli=4"
                b"&startdate=1789120000&enddate=1789121000"
            )

    monkeypatch.setattr(integrations_withings, "valid_access_token", access_token)
    monkeypatch.setattr(integrations_withings, "withings_post", measurements)

    response = asyncio.run(
        integrations_withings.webhook(WebhookRequest(), db, "state-secret")
    )
    db.refresh(connection)

    assert response.status_code == 204
    assert connection.last_successful_sync is None
    assert connection.last_error_at is not None
    assert connection.last_error_code == "missing_required_fields"
    assert "unavailable" in connection.last_error_message
    assert "provider-access-token" not in connection.last_error_message
    db.close()
