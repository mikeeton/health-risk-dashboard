"""Deterministic, backend-owned patient baseline modelling.

Baseline v2 uses prior observations rather than the current reading so the
comparison does not dilute itself. The observation-count window is intentional:
the application mixes sparse wearable imports with high-frequency simulator
data, making a fixed day window unreliable for this proof-of-concept dataset.
"""
from __future__ import annotations

from datetime import datetime, timezone
from statistics import mean, median, stdev
from typing import Any

from sqlalchemy.orm import Session

import models
import schemas


BASELINE_VERSION = "baseline-v2"
BASELINE_METHOD = "recent_resting_prior_observations_v2"
BASELINE_ORDERING = "oldest_to_newest"
MIN_BASELINE_SAMPLES = 10
MAX_BASELINE_SAMPLES = 30
MAD_MODIFIED_Z_CUTOFF = 3.5
BASELINE_OUTLIER_METHOD = "median_absolute_deviation_modified_z_3.5"

METRICS: dict[str, dict[str, Any]] = {
    "heart_rate": {"unit": "bpm", "minimum": 20, "maximum": 240},
    "spo2": {"unit": "percent", "minimum": 50, "maximum": 100},
    "systolic_bp": {"unit": "mmHg", "minimum": 40, "maximum": 260},
    "diastolic_bp": {"unit": "mmHg", "minimum": 20, "maximum": 180},
    "sleep_hours": {"unit": "hours", "minimum": 0, "maximum": 24},
    "steps": {"unit": "count", "minimum": 0, "maximum": 200000},
}

BASELINE_LIMITATIONS = [
    "Proof-of-concept individual baseline; not clinically validated.",
    "Uses an observation-count window rather than a fixed number of days because repository data density varies by source.",
    "MAD filtering is per metric and does not identify multivariate clinical anomalies.",
    "No historical baseline persistence or gradual-deterioration freeze policy is implemented.",
]


def parse_observation_timestamp(value: Any) -> datetime | None:
    """Parse an observation timestamp and normalize it to UTC."""
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    else:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _chronological_key(vital: models.Vital) -> tuple[datetime, int]:
    parsed = parse_observation_timestamp(vital.timestamp)
    return (
        parsed or datetime.min.replace(tzinfo=timezone.utc),
        vital.id or 0,
    )


def _is_before_current(vital: models.Vital, current: models.Vital) -> bool:
    vital_time = parse_observation_timestamp(vital.timestamp)
    current_time = parse_observation_timestamp(current.timestamp)
    if vital_time is None or current_time is None:
        return False
    return (vital_time, vital.id or 0) < (current_time, current.id or 0)


def _valid_metric_value(vital: models.Vital, metric: str) -> float | None:
    value = getattr(vital, metric, None)
    if value is None:
        return None
    numeric = float(value)
    specification = METRICS[metric]
    if not specification["minimum"] <= numeric <= specification["maximum"]:
        return None
    return numeric


def mad_filter(values: list[float]) -> list[float]:
    """Remove univariate outliers using the standard modified-z MAD rule.

    When MAD is zero, equal-to-median observations are retained if doing so
    leaves enough history. Otherwise all observations are retained because the
    available variation is insufficient to justify removing a value.
    """
    if len(values) < 3:
        return list(values)
    centre = median(values)
    absolute_deviations = [abs(value - centre) for value in values]
    mad = median(absolute_deviations)
    if mad == 0:
        matching_centre = [value for value in values if value == centre]
        return matching_centre if len(matching_centre) >= MIN_BASELINE_SAMPLES else list(values)
    return [
        value
        for value in values
        if 0.6745 * abs(value - centre) / mad <= MAD_MODIFIED_Z_CUTOFF
    ]


def _round(value: float | None) -> float | None:
    return None if value is None else round(float(value), 4)


def _metric_assessment(
    metric: str,
    candidates: list[models.Vital],
    current: models.Vital,
) -> schemas.BaselineMetricAssessment:
    raw_values = [
        value
        for vital in candidates
        if (value := _valid_metric_value(vital, metric)) is not None
    ]
    filtered = mad_filter(raw_values)
    current_value = _valid_metric_value(current, metric)
    baseline_mean = mean(filtered) if filtered else None
    baseline_std = stdev(filtered) if len(filtered) >= 2 else None
    deviation = (
        current_value - baseline_mean
        if current_value is not None and baseline_mean is not None
        else None
    )
    deviation_percent = (
        deviation / baseline_mean * 100
        if deviation is not None and baseline_mean not in (None, 0)
        else None
    )
    z_score = (
        deviation / baseline_std
        if deviation is not None and baseline_std not in (None, 0)
        else None
    )
    return schemas.BaselineMetricAssessment(
        unit=METRICS[metric]["unit"],
        mean=_round(baseline_mean),
        std_dev=_round(baseline_std),
        current=_round(current_value),
        deviation=_round(deviation),
        deviation_percent=_round(deviation_percent),
        z_score=_round(z_score),
        raw_sample_count=len(raw_values),
        sample_count=len(filtered),
        excluded_outliers=len(raw_values) - len(filtered),
    )


def build_patient_baseline(
    db: Session,
    patient_id: int,
    *,
    current_vital: models.Vital | None = None,
) -> schemas.BaselineAssessment:
    """Build baseline-v2 from prior, valid resting observations.

    The database query declares ascending timestamp/id order. Because the
    current schema stores timestamps as strings, values are parsed and sorted a
    second time in Python to make timezone ordering explicit and deterministic.
    """
    queried = (
        db.query(models.Vital)
        .filter(models.Vital.patient_id == patient_id)
        .order_by(models.Vital.timestamp.asc(), models.Vital.id.asc())
        .all()
    )
    chronological = sorted(queried, key=_chronological_key)
    if current_vital is None:
        valid_timestamped = [
            vital for vital in chronological if parse_observation_timestamp(vital.timestamp)
        ]
        current_vital = valid_timestamped[-1] if valid_timestamped else None

    empty = {
        "ready": False,
        "version": BASELINE_VERSION,
        "method": BASELINE_METHOD,
        "ordering": BASELINE_ORDERING,
        "sample_count": 0,
        "required_sample_count": MIN_BASELINE_SAMPLES,
        "maximum_sample_count": MAX_BASELINE_SAMPLES,
        "outlier_method": BASELINE_OUTLIER_METHOD,
        "limitations": BASELINE_LIMITATIONS,
    }
    if current_vital is None:
        return schemas.BaselineAssessment(**empty, reason="no_current_measurement")
    if parse_observation_timestamp(current_vital.timestamp) is None:
        return schemas.BaselineAssessment(**empty, reason="invalid_current_timestamp")

    candidates = [
        vital
        for vital in chronological
        if _is_before_current(vital, current_vital)
        and (vital.activity_state or "").strip().lower() == "resting"
    ][-MAX_BASELINE_SAMPLES:]
    metrics = {
        metric: _metric_assessment(metric, candidates, current_vital)
        for metric in METRICS
    }
    minimum_metric_samples = min(
        (item.sample_count for item in metrics.values()),
        default=0,
    )
    ready = all(
        item.sample_count >= MIN_BASELINE_SAMPLES and item.current is not None
        for item in metrics.values()
    )
    common = {
        **empty,
        "ready": ready,
        "sample_count": minimum_metric_samples,
        "reason": None if ready else "insufficient_history",
        "metrics": metrics,
    }
    if not ready:
        return schemas.BaselineAssessment(**common)

    values = schemas.BaselineValues(
        heart_rate=metrics["heart_rate"].mean,
        spo2=metrics["spo2"].mean,
        systolic_bp=metrics["systolic_bp"].mean,
        diastolic_bp=metrics["diastolic_bp"].mean,
        sleep_hours=metrics["sleep_hours"].mean,
        steps=metrics["steps"].mean,
    )
    deviations = schemas.BaselineDeviations(
        heart_rate_percent=metrics["heart_rate"].deviation_percent,
        spo2_percent=metrics["spo2"].deviation_percent,
        systolic_bp_percent=metrics["systolic_bp"].deviation_percent,
        sleep_hours_percent=metrics["sleep_hours"].deviation_percent,
        steps_percent=metrics["steps"].deviation_percent,
    )
    return schemas.BaselineAssessment(
        **common,
        values=values,
        deviations=deviations,
    )
