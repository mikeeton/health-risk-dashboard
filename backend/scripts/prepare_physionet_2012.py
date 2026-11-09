"""Prepare a research proxy from the first 48 hours of Challenge 2012 data.

The legacy forward-filled target remains available for comparison. The
observed-next-window target uses only new HR/BP readings in the next six-hour
bin and excludes windows without an observable next-bin outcome. Neither
target represents a clinically adjudicated event or an outpatient cohort.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
from pathlib import Path
import urllib.request
import zipfile

import numpy as np
import pandas as pd


BASE_URL = "https://physionet.org/files/challenge-2012/1.0.0"
PARAMETER_MAP = {
    "HR": "heart_rate",
    "SpO2": "spo2",
    "SysABP": "systolic_bp",
    "NISysABP": "systolic_bp",
    "DiasABP": "diastolic_bp",
    "NIDiasABP": "diastolic_bp",
}
VALID_RANGES = {
    "heart_rate": (20, 240),
    "spo2": (50, 100),
    "systolic_bp": (40, 260),
    "diastolic_bp": (20, 180),
}
OBSERVED_LABEL_FEATURES = ("heart_rate", "systolic_bp", "diastolic_bp")
EMPTY_FIELDS = ["steps", "sleep_hours", "active_minutes", "calories"]


def download(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "health-risk-dashboard-research/1.0"})
    with urllib.request.urlopen(request, timeout=120) as response:
        return response.read()


def elapsed_hours(value: str) -> float:
    hours, minutes = value.split(":", maxsplit=1)
    return int(hours) + int(minutes) / 60


def prepare_record(raw: pd.DataFrame, *, label_mode: str) -> pd.DataFrame:
    if label_mode not in {"observed_next_window", "legacy_forward_fill"}:
        raise ValueError(f"Unsupported label mode: {label_mode}")
    raw = raw.copy()
    raw.columns = [column.strip() for column in raw.columns]
    record_values = raw.loc[raw["Parameter"] == "RecordID", "Value"]
    if record_values.empty:
        return pd.DataFrame()
    patient_id = int(record_values.iloc[0])
    gender_values = raw.loc[raw["Parameter"] == "Gender", "Value"]
    age_values = raw.loc[raw["Parameter"] == "Age", "Value"]
    gender_code = int(gender_values.iloc[0]) if not gender_values.empty else -1
    age = float(age_values.iloc[0]) if not age_values.empty else np.nan
    gender = {0: "female", 1: "male"}.get(gender_code, "unknown")
    age_group = "unknown" if np.isnan(age) else "18-44" if age < 45 else "45-64" if age < 65 else "65+"
    observations = raw[raw["Parameter"].isin(PARAMETER_MAP)].copy()
    observations["feature"] = observations["Parameter"].map(PARAMETER_MAP)
    observations["Value"] = pd.to_numeric(observations["Value"], errors="coerce")
    if label_mode == "observed_next_window":
        lower = observations["feature"].map(lambda feature: VALID_RANGES[feature][0])
        upper = observations["feature"].map(lambda feature: VALID_RANGES[feature][1])
        observations = observations[observations["Value"].between(lower, upper)].copy()
    if label_mode == "observed_next_window" and observations.empty:
        return pd.DataFrame()
    observations["hour"] = observations["Time"].map(elapsed_hours)
    if label_mode == "observed_next_window":
        observations = observations[(observations["hour"] >= 0) & (observations["hour"] < 48)]
        observations["window"] = (observations["hour"] // 6).astype(int)
    else:
        observations["window"] = (observations["hour"] // 6).clip(upper=7).astype(int)
    observed = observations.pivot_table(index="window", columns="feature", values="Value", aggfunc="last")
    observed = observed.reindex(range(8))
    # Carry feature values for at most two later six-hour bins (12 hours).
    # Legacy preparation is retained byte-for-byte in intent for comparison.
    features = observed.ffill() if label_mode == "legacy_forward_fill" else observed.ffill(limit=2)
    next_window = (features if label_mode == "legacy_forward_fill" else observed).shift(-1)
    rows = []
    for window, values in features.iloc[:-1].iterrows():
        future = next_window.loc[window]
        if label_mode == "observed_next_window" and not future.reindex(OBSERVED_LABEL_FEATURES).notna().any():
            continue
        target = int(
            (future.get("spo2", np.nan) < 90 if label_mode == "legacy_forward_fill" else False)
            or future.get("heart_rate", np.nan) < 40
            or future.get("heart_rate", np.nan) > 140
            or future.get("systolic_bp", np.nan) >= 180
            or future.get("diastolic_bp", np.nan) >= 120
        )
        row = {
            "patient_id": patient_id,
            "timestamp": (pd.Timestamp("2012-01-01", tz="UTC") + pd.Timedelta(hours=int(window) * 6)).isoformat(),
            "heart_rate": values.get("heart_rate", np.nan),
            "spo2": values.get("spo2", np.nan),
            "systolic_bp": values.get("systolic_bp", np.nan),
            "diastolic_bp": values.get("diastolic_bp", np.nan),
            "target": target,
            "gender": gender,
            "age_group": age_group,
        }
        row.update({field: np.nan for field in EMPTY_FIELDS})
        rows.append(row)
    return pd.DataFrame(rows)


def prepare_set(
    set_name: str,
    *,
    label_mode: str = "observed_next_window",
    archive_bytes: bytes | None = None,
) -> pd.DataFrame:
    archive = zipfile.ZipFile(io.BytesIO(archive_bytes if archive_bytes is not None else download(f"{BASE_URL}/{set_name}.zip")))
    rows = []
    for name in sorted(archive.namelist()):
        if not name.lower().endswith(".txt"):
            continue
        raw = pd.read_csv(archive.open(name))
        rows.extend(prepare_record(raw, label_mode=label_mode).to_dict("records"))
    return pd.DataFrame(rows)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="data/physionet-2012-observed")
    parser.add_argument("--archive-directory", type=Path, help="Directory containing verified set-a.zip and set-b.zip")
    parser.add_argument(
        "--label-mode",
        choices=("observed_next_window", "legacy_forward_fill"),
        default="observed_next_window",
    )
    args = parser.parse_args()
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    manifest = {
        "schema_version": "physionet-proxy-observed-v1",
        "label_mode": args.label_mode,
        "outcome_policy": (
            "Next six-hour bin contains an observed HR <40 or >140 bpm, "
            "systolic BP >=180 mmHg, or diastolic BP >=120 mmHg. "
            "Bins with no observed next-bin HR/BP are excluded. SaO2 is not "
            "treated as wearable SpO2. Normal observations of only some fields "
            "are negative for this observed-field proxy, not proven event-free."
            if args.label_mode == "observed_next_window"
            else "Legacy forward-filled next-bin proxy; retained for historical comparison only."
        ),
        "feature_policy": (
            "Legacy: unbounded forward fill within the 48-hour record."
            if args.label_mode == "legacy_forward_fill"
            else "Within-record forward fill for at most two later six-hour bins (12 hours); never from future bins."
        ),
        "valid_measurement_ranges": VALID_RANGES,
        "invalid_measurement_policy": (
            "Non-numeric and out-of-range values are excluded before features and labels are constructed; no missing value is imputed as a normal outcome."
            if args.label_mode == "observed_next_window"
            else "Legacy range handling is retained for historical comparison only."
        ),
        "sets": {},
    }
    for set_name, filename in (("set-a", "train.csv"), ("set-b", "external.csv")):
        archive_path = args.archive_directory / f"{set_name}.zip" if args.archive_directory else None
        raw_bytes = archive_path.read_bytes() if archive_path else download(f"{BASE_URL}/{set_name}.zip")
        frame = prepare_set(set_name, label_mode=args.label_mode, archive_bytes=raw_bytes)
        csv_path = output / filename
        frame.to_csv(csv_path, index=False)
        manifest["sets"][set_name] = {
            "source_url": f"{BASE_URL}/{set_name}.zip",
            "raw_sha256": hashlib.sha256(raw_bytes).hexdigest(),
            "csv_sha256": hashlib.sha256(csv_path.read_bytes()).hexdigest(),
            "rows": int(len(frame)),
            "patients": int(frame.patient_id.nunique()) if not frame.empty else 0,
            "positive_rows": int(frame.target.sum()) if not frame.empty else 0,
            "missing_count": {column: int(frame[column].isna().sum()) for column in frame.columns} if not frame.empty else {},
        }
        print(f"Prepared {len(frame)} rows from {frame.patient_id.nunique()} patients: {output / filename}")
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
