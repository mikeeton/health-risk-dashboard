"""Shared persistence pipeline for production vital-measurement sources.

Source adapters remain responsible for authentication, patient access, and
provider-specific mapping. This module owns the common validated write and the
downstream processing that must follow a newly persisted measurement.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Callable, Literal, Mapping

from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

import models
import schemas
from early_warning import evaluate_new_vital


VitalSource = Literal[
    "manual",
    "csv_upload",
    "simulator",
    "demo_seed",
    "withings",
    "wearable",
]
DeduplicationMode = Literal["none", "patient_timestamp"]
PostIngestHook = Callable[[models.Vital], Any]


@dataclass(frozen=True)
class AuditMetadata:
    action: str
    user_email: str | None = None


@dataclass(frozen=True)
class PatientUpdate:
    risk_level: str | None = None
    last_checkup: str | None = None


@dataclass(frozen=True)
class IngestionResult:
    vital: models.Vital
    created: bool
    hook_result: Any = None


def _normalise_measurement(
    measurement_data: schemas.VitalCreate | Mapping[str, Any],
    source: VitalSource,
) -> schemas.VitalCreate:
    data = (
        measurement_data.model_dump()
        if isinstance(measurement_data, schemas.VitalCreate)
        else dict(measurement_data)
    )
    # Full ISO-8601 parsing and UTC normalisation are deliberately introduced
    # in Phase 4. For now, preserve the existing string representation.
    if "timestamp" in data:
        data["timestamp"] = str(data["timestamp"])
    data["source"] = source
    return schemas.VitalCreate.model_validate(data)


def _find_duplicate(
    db: Session,
    measurement: schemas.VitalCreate,
    external_id: str | None,
    deduplication: DeduplicationMode,
) -> models.Vital | None:
    with db.no_autoflush:
        if external_id:
            return (
                db.query(models.Vital)
                .filter(models.Vital.external_id == external_id)
                .first()
            )
        if deduplication == "patient_timestamp":
            return (
                db.query(models.Vital)
                .filter(models.Vital.patient_id == measurement.patient_id)
                .filter(models.Vital.timestamp == measurement.timestamp)
                .first()
            )
    return None


def ingest_vital(
    db: Session,
    measurement_data: schemas.VitalCreate | Mapping[str, Any],
    *,
    source: VitalSource,
    external_id: str | None = None,
    deduplication: DeduplicationMode = "none",
    recorded_by_user_id: int | None = None,
    verification_status: str | None = None,
    patient_update: PatientUpdate | None = None,
    audit: AuditMetadata | None = None,
    post_ingest_hook: PostIngestHook | None = None,
) -> IngestionResult:
    """Validate, deduplicate, persist, and process one vital measurement.

    An external ID always takes precedence over the optional legacy
    patient/timestamp policy. Duplicate results do not trigger downstream
    processing, audits, or live-update hooks.
    """
    measurement = _normalise_measurement(measurement_data, source)
    existing = _find_duplicate(db, measurement, external_id, deduplication)
    if existing:
        return IngestionResult(vital=existing, created=False)

    vital_fields = measurement.model_dump()
    if external_id is not None:
        vital_fields["external_id"] = external_id
    if recorded_by_user_id is not None:
        vital_fields["recorded_by_user_id"] = recorded_by_user_id
    if verification_status is not None:
        vital_fields["verification_status"] = verification_status

    vital = models.Vital(**vital_fields)
    db.add(vital)
    try:
        db.flush()

        if patient_update is not None:
            patient = (
                db.query(models.Patient)
                .filter(models.Patient.id == measurement.patient_id)
                .first()
            )
            if patient is not None:
                if patient_update.risk_level is not None:
                    patient.risk_level = patient_update.risk_level
                if patient_update.last_checkup is not None:
                    patient.last_checkup = patient_update.last_checkup

        if audit is not None:
            db.add(
                models.AuditLog(
                    user_email=audit.user_email,
                    action=audit.action,
                    entity="Vital",
                    entity_id=str(vital.id),
                    timestamp=datetime.now(),
                )
            )

        db.commit()
    except IntegrityError:
        db.rollback()
        # The database currently guarantees uniqueness only for external IDs.
        # Recover idempotently from concurrent provider deliveries, but do not
        # disguise unrelated integrity failures.
        if external_id:
            existing = _find_duplicate(db, measurement, external_id, "none")
            if existing:
                return IngestionResult(vital=existing, created=False)
        raise
    except SQLAlchemyError:
        db.rollback()
        raise

    db.refresh(vital)
    evaluate_new_vital(db, vital)
    hook_result = post_ingest_hook(vital) if post_ingest_hook else None
    return IngestionResult(vital=vital, created=True, hook_result=hook_result)
