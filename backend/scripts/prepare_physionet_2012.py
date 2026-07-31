"""Download and prepare the open PhysioNet/CinC Challenge 2012 dataset.

The target is a genuinely recorded critical vital event in the following
six-hour window. The first 48 hours of measurements are converted into
longitudinal windows compatible with the dashboard's training contract.
Unavailable wearable fields remain missing; they are never invented.
"""
from __future__ import annotations

import argparse
import io
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
EMPTY_FIELDS = ["steps", "sleep_hours", "active_minutes", "calories"]


def download(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "health-risk-dashboard-research/1.0"})
    with urllib.request.urlopen(request, timeout=120) as response:
        return response.read()


def elapsed_hours(value: str) -> float:
    hours, minutes = value.split(":", maxsplit=1)
    return int(hours) + int(minutes) / 60


def prepare_set(set_name: str) -> pd.DataFrame:
    archive = zipfile.ZipFile(io.BytesIO(download(f"{BASE_URL}/{set_name}.zip")))
    rows = []
    for name in sorted(archive.namelist()):
        if not name.lower().endswith(".txt"):
            continue
        raw = pd.read_csv(archive.open(name))
        raw.columns = [column.strip() for column in raw.columns]
        record_values = raw.loc[raw["Parameter"] == "RecordID", "Value"]
        if record_values.empty:
            continue
        patient_id = int(record_values.iloc[0])
        gender_values = raw.loc[raw["Parameter"] == "Gender", "Value"]
        age_values = raw.loc[raw["Parameter"] == "Age", "Value"]
        gender_code = int(gender_values.iloc[0]) if not gender_values.empty else -1
        age = float(age_values.iloc[0]) if not age_values.empty else np.nan
        gender = {0: "female", 1: "male"}.get(gender_code, "unknown")
        age_group = "unknown" if np.isnan(age) else "18-44" if age < 45 else "45-64" if age < 65 else "65+"
        observations = raw[raw["Parameter"].isin(PARAMETER_MAP)].copy()
        observations["hour"] = observations["Time"].map(elapsed_hours)
        observations["window"] = (observations["hour"] // 6).clip(upper=7).astype(int)
        observations["feature"] = observations["Parameter"].map(PARAMETER_MAP)
        pivot = observations.pivot_table(index="window", columns="feature", values="Value", aggfunc="last")
        pivot = pivot.reindex(range(8)).ffill()
        next_window = pivot.shift(-1)
        target = (
            (next_window.get("spo2", pd.Series(index=pivot.index, dtype=float)) < 90)
            | (next_window.get("heart_rate", pd.Series(index=pivot.index, dtype=float)) < 40)
            | (next_window.get("heart_rate", pd.Series(index=pivot.index, dtype=float)) > 140)
            | (next_window.get("systolic_bp", pd.Series(index=pivot.index, dtype=float)) >= 180)
            | (next_window.get("diastolic_bp", pd.Series(index=pivot.index, dtype=float)) >= 120)
        ).astype(int)
        for window, values in pivot.iloc[:-1].iterrows():
            row = {
                "patient_id": patient_id,
                "timestamp": (pd.Timestamp("2012-01-01", tz="UTC") + pd.Timedelta(hours=int(window) * 6)).isoformat(),
                "heart_rate": values.get("heart_rate", np.nan),
                "spo2": values.get("spo2", np.nan),
                "systolic_bp": values.get("systolic_bp", np.nan),
                "diastolic_bp": values.get("diastolic_bp", np.nan),
                "target": int(target.loc[window]),
                "gender": gender,
                "age_group": age_group,
            }
            row.update({field: np.nan for field in EMPTY_FIELDS})
            rows.append(row)
    return pd.DataFrame(rows)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="data/physionet-2012")
    args = parser.parse_args()
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    for set_name, filename in (("set-a", "train.csv"), ("set-b", "external.csv")):
        frame = prepare_set(set_name)
        frame.to_csv(output / filename, index=False)
        print(f"Prepared {len(frame)} rows from {frame.patient_id.nunique()} patients: {output / filename}")


if __name__ == "__main__":
    main()
