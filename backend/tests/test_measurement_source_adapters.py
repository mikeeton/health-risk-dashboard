from types import SimpleNamespace

import pytest
from fastapi import HTTPException

import schemas
from measurement_ingestion import IngestionResult
from routes import live_simulator, role_actions, vitals, wearables


def vital_payload(*, source="manual"):
    return schemas.VitalCreate(
        patient_id=42,
        timestamp="2026-09-11T10:00:00+00:00",
        heart_rate=72,
        spo2=98,
        systolic_bp=120,
        diastolic_bp=80,
        steps=4000,
        sleep_hours=7.5,
        active_minutes=35,
        calories=1800,
        risk_score=2,
        activity_state="resting",
        source=source,
    )


def user(role="doctor"):
    return SimpleNamespace(id=7, email=f"{role}@example.com", role=role)


def allow_access(monkeypatch, module, patient=None):
    monkeypatch.setattr(module, "require_roles", lambda *_: None)
    monkeypatch.setattr(
        module,
        "get_accessible_patient",
        lambda *_: patient or SimpleNamespace(id=42),
    )


def test_manual_api_delegates_legacy_dedup_and_audit(monkeypatch):
    allow_access(monkeypatch, vitals)
    captured = {}
    stored = SimpleNamespace(id=10)

    def fake_ingest(db, payload, **kwargs):
        captured.update(payload=payload, **kwargs)
        return IngestionResult(vital=stored, created=True)

    monkeypatch.setattr(vitals, "ingest_vital", fake_ingest)
    payload = vital_payload()

    assert vitals.create_vital(payload, db=object(), current_user=user()) is stored
    assert captured["payload"] is payload
    assert captured["source"] == "manual"
    assert captured["deduplication"] == "patient_timestamp"
    assert captured["audit"].action == "CREATE_VITAL"


def test_csv_uses_manual_endpoint_but_preserves_csv_source(monkeypatch):
    allow_access(monkeypatch, vitals)
    captured = {}

    def fake_ingest(db, payload, **kwargs):
        captured.update(kwargs)
        return IngestionResult(vital=SimpleNamespace(id=11), created=True)

    monkeypatch.setattr(vitals, "ingest_vital", fake_ingest)

    vitals.create_vital(vital_payload(source="csv_upload"), object(), user())

    assert captured["source"] == "csv_upload"


def test_manual_duplicate_remains_http_409(monkeypatch):
    allow_access(monkeypatch, vitals)
    monkeypatch.setattr(
        vitals,
        "ingest_vital",
        lambda *_args, **_kwargs: IngestionResult(
            vital=SimpleNamespace(id=10), created=False
        ),
    )

    with pytest.raises(HTTPException) as exc:
        vitals.create_vital(vital_payload(), object(), user())

    assert exc.value.status_code == 409


def test_nurse_workflow_delegates_audit_to_ingestion(monkeypatch):
    allow_access(monkeypatch, role_actions)
    captured = {}
    stored = SimpleNamespace(id=12)

    def fake_ingest(db, payload, **kwargs):
        captured.update(payload=payload, **kwargs)
        return IngestionResult(vital=stored, created=True)

    monkeypatch.setattr(role_actions, "ingest_vital", fake_ingest)
    payload = vital_payload()

    assert role_actions.nurse_record_vitals(
        payload, object(), user("nurse")
    ) is stored
    assert captured["source"] == "manual"
    assert captured["audit"].action == "NURSE_RECORD_VITALS"


def test_wearable_adapter_maps_defaults_and_source(monkeypatch):
    allow_access(monkeypatch, wearables)
    captured = {}

    def fake_ingest(db, payload, **kwargs):
        captured.update(payload=payload, **kwargs)
        return IngestionResult(vital=SimpleNamespace(id=13), created=True)

    monkeypatch.setattr(wearables, "ingest_vital", fake_ingest)
    payload = schemas.WearableVitalCreate(
        patient_id=42,
        device_name="Test Watch",
        heart_rate=75,
        spo2=97,
        steps=5000,
        sleep_hours=7,
        timestamp="2026-09-11T10:00:00+00:00",
    )

    response = wearables.receive_watch_data(payload, object(), user())

    assert response == {"message": "Watch data received successfully"}
    assert captured["source"] == "wearable"
    assert captured["payload"]["activity_state"] == "watch_sync"
    assert captured["payload"]["systolic_bp"] == 120


def test_simulator_adapter_delegates_patient_update_and_audit(monkeypatch):
    patient = SimpleNamespace(
        id=42,
        name="Simulation Patient",
        condition="General monitoring",
    )
    allow_access(monkeypatch, live_simulator, patient)
    generated = vital_payload().model_dump(
        exclude={"patient_id", "timestamp", "source"}
    )
    monkeypatch.setattr(live_simulator, "generate_vitals", lambda _: generated)
    captured = {}
    stored = SimpleNamespace(id=14)

    def fake_ingest(db, payload, **kwargs):
        captured.update(payload=payload, **kwargs)
        return IngestionResult(vital=stored, created=True)

    monkeypatch.setattr(live_simulator, "ingest_vital", fake_ingest)

    response = live_simulator.generate_live_vital(42, object(), user())

    assert response["vital"] is stored
    assert captured["source"] == "simulator"
    assert captured["patient_update"].last_checkup is not None
    assert captured["audit"].action == "CONDITION_BASED_SIMULATOR_GENERATE_VITAL"
