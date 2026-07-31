from __future__ import annotations

from collections.abc import Iterable

import numpy as np
import pandas as pd


RAW_FEATURES = [
    "heart_rate",
    "spo2",
    "systolic_bp",
    "diastolic_bp",
    "steps",
    "sleep_hours",
    "active_minutes",
    "calories",
]

ENGINEERED_FEATURES = RAW_FEATURES + [
    f"{name}_{suffix}"
    for name in RAW_FEATURES
    for suffix in ("mean_3", "std_3", "delta", "slope_5")
]


def _slope(values: np.ndarray) -> float:
    finite = values[np.isfinite(values)]
    if len(finite) < 2:
        return 0.0
    return float(np.polyfit(np.arange(len(finite)), finite, 1)[0])


def engineer_features(frame: pd.DataFrame) -> pd.DataFrame:
    """Create leakage-safe longitudinal features within each patient."""
    required = {"patient_id", "timestamp", *RAW_FEATURES}
    missing = sorted(required - set(frame.columns))
    if missing:
        raise ValueError(f"Dataset is missing required columns: {', '.join(missing)}")

    result = frame.copy()
    result["timestamp"] = pd.to_datetime(result["timestamp"], errors="coerce", utc=True)
    if result["timestamp"].isna().any():
        raise ValueError("Every row must have a valid timestamp")
    result = result.sort_values(["patient_id", "timestamp"]).reset_index(drop=True)

    for name in RAW_FEATURES:
        result[name] = pd.to_numeric(result[name], errors="coerce")
        grouped = result.groupby("patient_id", sort=False)[name]
        result[f"{name}_mean_3"] = grouped.transform(
            lambda series: series.rolling(3, min_periods=1).mean()
        )
        result[f"{name}_std_3"] = grouped.transform(
            lambda series: series.rolling(3, min_periods=2).std().fillna(0)
        )
        result[f"{name}_delta"] = grouped.diff().fillna(0)
        result[f"{name}_slope_5"] = grouped.transform(
            lambda series: series.rolling(5, min_periods=2).apply(
                lambda values: _slope(np.asarray(values)), raw=True
            )
        ).fillna(0)
    return result


def vitals_to_frame(vitals: Iterable[object], patient_id: int) -> pd.DataFrame:
    rows = []
    for vital in reversed(list(vitals)):
        rows.append(
            {
                "patient_id": patient_id,
                "timestamp": vital.timestamp,
                **{name: getattr(vital, name) for name in RAW_FEATURES},
            }
        )
    return engineer_features(pd.DataFrame(rows))

