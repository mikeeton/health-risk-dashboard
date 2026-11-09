"""Audit observed-next-window label coverage without rewriting model inputs."""
from __future__ import annotations

import argparse
import hashlib
import io
import json
from pathlib import Path
import zipfile

import pandas as pd

from scripts.prepare_physionet_2012 import (
    OBSERVED_LABEL_FEATURES,
    PARAMETER_MAP,
    VALID_RANGES,
    elapsed_hours,
)


def audit_record(raw: pd.DataFrame) -> dict:
    """Count seven possible prediction windows using the preparation policy."""
    observations = raw[raw["Parameter"].isin(PARAMETER_MAP)].copy()
    observations["feature"] = observations["Parameter"].map(PARAMETER_MAP)
    observations["Value"] = pd.to_numeric(observations["Value"], errors="coerce")
    lower = observations["feature"].map(lambda feature: VALID_RANGES[feature][0])
    upper = observations["feature"].map(lambda feature: VALID_RANGES[feature][1])
    valid = observations["Value"].between(lower, upper)
    invalid_count = int((~valid).sum())
    observations = observations[valid].copy()
    observations["hour"] = observations["Time"].map(elapsed_hours)
    outside_horizon = int((~observations["hour"].between(0, 48, inclusive="left")).sum())
    observations = observations[observations["hour"].between(0, 48, inclusive="left")].copy()
    observations["window"] = (observations["hour"] // 6).astype(int)
    observed = observations.pivot_table(index="window", columns="feature", values="Value", aggfunc="last") if not observations.empty else pd.DataFrame()
    observed = observed.reindex(index=range(8), columns=tuple(VALID_RANGES))
    features = observed.ffill(limit=2)
    result = {
        "possible_windows": 7,
        "eligible_windows": 0,
        "excluded_unresolved_windows": 0,
        "positive_windows": 0,
        "negative_windows": 0,
        "valid_source_measurements": len(observations),
        "invalid_source_measurements": invalid_count,
        "valid_measurements_outside_first_48_hours": outside_horizon,
        "missing_current_features": {field: 0 for field in VALID_RANGES},
        "stale_current_features": {field: 0 for field in VALID_RANGES},
        "missing_next_observations": {field: 0 for field in OBSERVED_LABEL_FEATURES},
    }
    for window in range(7):
        future = observed.loc[window + 1]
        if not future.reindex(OBSERVED_LABEL_FEATURES).notna().any():
            result["excluded_unresolved_windows"] += 1
            continue
        result["eligible_windows"] += 1
        positive = (
            future["heart_rate"] < 40 or future["heart_rate"] > 140
            or future["systolic_bp"] >= 180 or future["diastolic_bp"] >= 120
        )
        result["positive_windows" if positive else "negative_windows"] += 1
        for field in VALID_RANGES:
            if pd.isna(features.at[window, field]):
                result["missing_current_features"][field] += 1
            elif pd.isna(observed.at[window, field]):
                result["stale_current_features"][field] += 1
        for field in OBSERVED_LABEL_FEATURES:
            if pd.isna(future[field]):
                result["missing_next_observations"][field] += 1
    return result


def audit_archive(data: bytes) -> dict:
    result = {
        "source_records": 0,
        "records_with_no_eligible_windows": 0,
        "raw_parameter_rows": 0,
        "distinct_patients": 0,
        "possible_windows": 0,
        "eligible_windows": 0,
        "excluded_unresolved_windows": 0,
        "positive_windows": 0,
        "negative_windows": 0,
        "valid_source_measurements": 0,
        "invalid_source_measurements": 0,
        "valid_measurements_outside_first_48_hours": 0,
        "missing_current_features": {field: 0 for field in VALID_RANGES},
        "stale_current_features": {field: 0 for field in VALID_RANGES},
        "missing_next_observations": {field: 0 for field in OBSERVED_LABEL_FEATURES},
    }
    patients: set[int] = set()
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        for name in sorted(archive.namelist()):
            if not name.lower().endswith(".txt"):
                continue
            raw = pd.read_csv(archive.open(name))
            raw.columns = [column.strip() for column in raw.columns]
            record_ids = raw.loc[raw["Parameter"] == "RecordID", "Value"]
            if record_ids.empty:
                raise ValueError(f"Missing RecordID in {name}")
            patient_id = int(record_ids.iloc[0])
            if patient_id in patients:
                raise ValueError(f"Duplicate RecordID {patient_id} in archive")
            patients.add(patient_id)
            result["source_records"] += 1
            result["raw_parameter_rows"] += len(raw)
            counts = audit_record(raw)
            if not counts["eligible_windows"]:
                result["records_with_no_eligible_windows"] += 1
            for key, value in counts.items():
                if isinstance(value, dict):
                    for field, count in value.items():
                        result[key][field] += count
                else:
                    result[key] += value
    result["distinct_patients"] = len(patients)
    result["followup_observed_fraction"] = round(result["eligible_windows"] / result["possible_windows"], 6) if result["possible_windows"] else None
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--archive-directory", type=Path, required=True)
    parser.add_argument("--prepared-directory", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    manifest = json.loads((args.prepared_directory / "manifest.json").read_text(encoding="utf-8"))
    if manifest.get("label_mode") != "observed_next_window":
        raise ValueError("Coverage audit requires an observed_next_window manifest")
    report = {
        "schema_version": "physionet-label-coverage-v1",
        "label_mode": "observed_next_window",
        "window_policy": "Seven possible six-hour prediction windows per source record; eligible only if the next bin has an observed valid HR or BP. Missing future observations are unresolved, not negatives.",
        "sets": {},
    }
    for set_name, csv_name in (("set-a", "train.csv"), ("set-b", "external.csv")):
        source = (args.archive_directory / f"{set_name}.zip").read_bytes()
        expected = manifest["sets"][set_name]
        if hashlib.sha256(source).hexdigest() != expected["raw_sha256"]:
            raise ValueError(f"{set_name} raw archive hash mismatch")
        if hashlib.sha256((args.prepared_directory / csv_name).read_bytes()).hexdigest() != expected["csv_sha256"]:
            raise ValueError(f"{set_name} prepared CSV hash mismatch")
        counts = audit_archive(source)
        if (counts["eligible_windows"], counts["positive_windows"], counts["distinct_patients"] - counts["records_with_no_eligible_windows"]) != (expected["rows"], expected["positive_rows"], expected["patients"]):
            raise ValueError(f"{set_name} coverage totals do not match prepared manifest")
        report["sets"][set_name] = {"raw_sha256": expected["raw_sha256"], "csv_sha256": expected["csv_sha256"], **counts}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote verified coverage audit: {args.output}")


if __name__ == "__main__":
    main()
