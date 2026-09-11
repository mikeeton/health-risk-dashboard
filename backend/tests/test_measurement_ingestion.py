import asyncio

import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker

import measurement_ingestion
import models
from database import Base
from measurement_ingestion import AuditMetadata, PatientUpdate, ingest_vital


@pytest.fixture()
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def patient(db):
    item = models.Patient(
        name="Ingestion Patient",
        age=54,
        condition="General monitoring",
        risk_level="Low",
        last_checkup="2026-09-01",
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def measurement(patient_id, **overrides):
    data = {
        "patient_id": patient_id,
        "timestamp": "2026-09-11T10:00:00+00:00",
        "heart_rate": 72,
        "spo2": 98,
        "systolic_bp": 120,
        "diastolic_bp": 80,
        "steps": 4000,
        "sleep_hours": 7.5,
        "active_minutes": 35,
        "calories": 1800,
        "risk_score": 2,
        "activity_state": "resting",
    }
    data.update(overrides)
    return data


def test_ingestion_validates_persists_metadata_and_runs_downstream_hooks(
    db, patient, monkeypatch
):
    evaluated = []
    published = []
    monkeypatch.setattr(
        measurement_ingestion,
        "evaluate_new_vital",
        lambda session, vital: evaluated.append((session, vital.id)),
    )

    result = ingest_vital(
        db,
        measurement(patient.id, source="manual"),
        source="wearable",
        external_id="device-reading-1",
        recorded_by_user_id=None,
        verification_status="unverified",
        patient_update=PatientUpdate(
            risk_level="Moderate", last_checkup="2026-09-11"
        ),
        audit=AuditMetadata(action="TEST_INGEST", user_email="test@example.com"),
        post_ingest_hook=lambda vital: published.append(vital.id),
    )

    assert result.created is True
    assert result.vital.source == "wearable"
    assert result.vital.external_id == "device-reading-1"
    assert result.vital.verification_status == "unverified"
    assert evaluated == [(db, result.vital.id)]
    assert published == [result.vital.id]
    db.refresh(patient)
    assert patient.risk_level == "Moderate"
    assert patient.last_checkup == "2026-09-11"
    audit = db.query(models.AuditLog).filter_by(entity_id=str(result.vital.id)).one()
    assert audit.action == "TEST_INGEST"


def test_patient_timestamp_source_duplicate_uses_common_policy(
    db, patient, monkeypatch
):
    evaluated = []
    monkeypatch.setattr(
        measurement_ingestion,
        "evaluate_new_vital",
        lambda session, vital: evaluated.append(vital.id),
    )

    first = ingest_vital(
        db,
        measurement(patient.id),
        source="manual",
    )
    duplicate = ingest_vital(
        db,
        measurement(patient.id, heart_rate=99),
        source="manual",
    )

    assert first.created is True
    assert duplicate.created is False
    assert duplicate.vital.id == first.vital.id
    assert duplicate.vital.heart_rate == 72
    assert evaluated == [first.vital.id]
    assert db.query(models.Vital).count() == 1


def test_external_id_takes_precedence_for_provider_idempotency(
    db, patient, monkeypatch
):
    monkeypatch.setattr(measurement_ingestion, "evaluate_new_vital", lambda *_: None)
    first = ingest_vital(
        db,
        measurement(patient.id),
        source="withings",
        external_id="withings:123:456",
    )
    duplicate = ingest_vital(
        db,
        measurement(patient.id, timestamp="2026-09-11T11:00:00+00:00"),
        source="withings",
        external_id="withings:123:456",
    )

    assert first.created is True
    assert duplicate.created is False
    assert duplicate.vital.id == first.vital.id
    assert db.query(models.Vital).count() == 1


def test_same_patient_timestamp_is_distinct_for_different_sources(
    db, patient, monkeypatch
):
    monkeypatch.setattr(measurement_ingestion, "evaluate_new_vital", lambda *_: None)

    manual = ingest_vital(db, measurement(patient.id), source="manual")
    wearable = ingest_vital(db, measurement(patient.id), source="wearable")

    assert manual.created is True
    assert wearable.created is True
    assert manual.vital.id != wearable.vital.id
    assert db.query(models.Vital).count() == 2


def test_common_deduplication_matches_legacy_equivalent_timezone(
    db, patient, monkeypatch
):
    monkeypatch.setattr(measurement_ingestion, "evaluate_new_vital", lambda *_: None)
    legacy = models.Vital(
        **measurement(patient.id, timestamp="2026-09-11T12:00:00+02:00"),
        source="manual",
    )
    db.add(legacy)
    db.commit()
    db.refresh(legacy)

    duplicate = ingest_vital(
        db,
        measurement(patient.id, timestamp="2026-09-11T10:00:00Z"),
        source="manual",
    )

    assert duplicate.created is False
    assert duplicate.vital.id == legacy.id
    assert db.query(models.Vital).count() == 1


def test_timestamp_is_normalized_to_utc(db, patient, monkeypatch):
    monkeypatch.setattr(measurement_ingestion, "evaluate_new_vital", lambda *_: None)

    result = ingest_vital(
        db,
        measurement(patient.id, timestamp="2026-09-11T12:30:00+02:00"),
        source="manual",
    )

    assert result.vital.timestamp == "2026-09-11T10:30:00+00:00"


@pytest.mark.parametrize(
    "timestamp",
    ["not-a-timestamp", "2026-09-11T10:00:00"],
)
def test_invalid_or_timezone_naive_timestamp_is_rejected(db, patient, timestamp):
    with pytest.raises(ValidationError):
        ingest_vital(
            db,
            measurement(patient.id, timestamp=timestamp),
            source="manual",
        )


def test_diastolic_above_systolic_is_rejected(db, patient):
    with pytest.raises(ValidationError):
        ingest_vital(
            db,
            measurement(patient.id, systolic_bp=100, diastolic_bp=110),
            source="manual",
        )


def test_common_schema_validation_rejects_invalid_measurement(db, patient):
    with pytest.raises(ValidationError):
        ingest_vital(
            db,
            measurement(patient.id, spo2=120),
            source="manual",
        )

    assert db.query(models.Vital).count() == 0


def test_async_live_hook_is_invoked_by_pipeline_and_can_be_awaited(
    db, patient, monkeypatch
):
    monkeypatch.setattr(measurement_ingestion, "evaluate_new_vital", lambda *_: None)
    published = []

    async def publish(vital):
        published.append(vital.id)

    result = ingest_vital(
        db,
        measurement(patient.id),
        source="withings",
        post_ingest_hook=publish,
    )
    asyncio.run(result.hook_result)

    assert published == [result.vital.id]


def test_transaction_rolls_back_vital_when_audit_write_fails(
    db, patient, monkeypatch
):
    monkeypatch.setattr(measurement_ingestion, "evaluate_new_vital", lambda *_: None)

    with pytest.raises(IntegrityError):
        ingest_vital(
            db,
            measurement(patient.id),
            source="manual",
            audit=AuditMetadata(action=None),
        )

    assert db.query(models.Vital).count() == 0
