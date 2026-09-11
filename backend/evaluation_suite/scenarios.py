"""Fixed-seed, synthetic health-monitoring scenarios.

These scenarios are software-evaluation fixtures. Their labels are injected by
construction and must not be described as clinical ground truth.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, replace
from datetime import datetime, timedelta, timezone
import random


SCENARIO_VERSION = "synthetic-scenarios-v1"
DEFAULT_START = datetime(2026, 9, 11, 8, 0, tzinfo=timezone.utc)
SUPPORTED_SCENARIOS = (
    "normal_stable",
    "single_spike",
    "persistent_hr_increase",
    "falling_spo2",
    "bp_spike",
    "combined_hr_spo2",
    "reduced_activity",
    "gradual_drift",
)


@dataclass(frozen=True)
class ScenarioReading:
    timestamp: str
    heart_rate: int
    spo2: float
    systolic_bp: int
    diastolic_bp: int
    steps: int
    sleep_hours: float
    active_minutes: int
    calories: int
    risk_score: int
    activity_state: str = "resting"

    def measurement(self, patient_id: int) -> dict:
        return {"patient_id": patient_id, **asdict(self)}


def _stable_history(
    rng: random.Random,
    *,
    start: datetime,
    count: int = 10,
    baseline_heart_rate: int = 70,
) -> list[ScenarioReading]:
    readings = []
    for index in range(count):
        readings.append(
            ScenarioReading(
                timestamp=(start + timedelta(minutes=5 * index)).isoformat(),
                heart_rate=baseline_heart_rate + rng.choice((-2, -1, 0, 1, 2)),
                spo2=float(98 + rng.choice((-1, 0, 0, 0))),
                systolic_bp=120 + rng.choice((-3, -2, 0, 1, 2, 3)),
                diastolic_bp=80 + rng.choice((-2, -1, 0, 1, 2)),
                steps=4000 + index * 120 + rng.randint(-30, 30),
                sleep_hours=round(7.3 + rng.choice((-0.2, -0.1, 0, 0.1, 0.2)), 1),
                active_minutes=30 + index + rng.choice((-1, 0, 1)),
                calories=1800 + index * 5 + rng.randint(-5, 5),
                risk_score=1,
            )
        )
    return readings


def _at(reading: ScenarioReading, index: int, start: datetime, **changes) -> ScenarioReading:
    return replace(
        reading,
        timestamp=(start + timedelta(minutes=5 * index)).isoformat(),
        **changes,
    )


def generate_scenario(
    name: str,
    *,
    seed: int = 20260911,
    start: datetime = DEFAULT_START,
    baseline_heart_rate: int = 70,
) -> list[ScenarioReading]:
    """Return one deterministic chronological synthetic scenario."""
    if name not in SUPPORTED_SCENARIOS:
        raise ValueError(
            f"Unsupported scenario {name!r}; choose from {', '.join(SUPPORTED_SCENARIOS)}"
        )
    if start.tzinfo is None or start.utcoffset() is None:
        raise ValueError("Scenario start must be timezone-aware")

    rng = random.Random(f"{seed}:{name}:{baseline_heart_rate}")
    history = _stable_history(
        rng,
        start=start,
        baseline_heart_rate=baseline_heart_rate,
    )
    latest = history[-1]
    next_index = len(history)

    if name == "normal_stable":
        return history + _stable_history(
            rng,
            start=start + timedelta(minutes=5 * next_index),
            count=5,
            baseline_heart_rate=baseline_heart_rate,
        )
    if name == "single_spike":
        return history + [_at(latest, next_index, start, heart_rate=115, risk_score=6)]
    if name == "persistent_hr_increase":
        return history + [
            _at(latest, next_index + offset, start, heart_rate=value, risk_score=2 + offset)
            for offset, value in enumerate((78, 86, 94, 102, 110))
        ]
    if name == "falling_spo2":
        return history + [
            _at(latest, next_index + offset, start, spo2=float(value), risk_score=2 + offset)
            for offset, value in enumerate((97, 96, 95, 94, 93))
        ]
    if name == "bp_spike":
        return history + [
            _at(latest, next_index, start, systolic_bp=165, diastolic_bp=105, risk_score=7)
        ]
    if name == "combined_hr_spo2":
        return history + [
            _at(latest, next_index, start, heart_rate=110, spo2=93.0, risk_score=8)
        ]
    if name == "reduced_activity":
        return history + [
            _at(
                latest,
                next_index + offset,
                start,
                steps=max(100, 900 - offset * 150),
                active_minutes=max(2, 10 - offset * 2),
                sleep_hours=5.5,
                risk_score=3,
            )
            for offset in range(5)
        ]
    return history + [
        _at(
            latest,
            next_index + offset,
            start,
            heart_rate=74 + offset * 3,
            systolic_bp=124 + offset * 4,
            risk_score=2 + offset,
        )
        for offset in range(5)
    ]
