"""Validate and normalize a licensed outpatient/wearable cohort for research.

This does not invent missing values or labels and never loads research rows into
the production clinical database.
"""
from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path
import pandas as pd

REQUIRED = ["patient_id", "timestamp", "heart_rate", "spo2", "systolic_bp", "diastolic_bp", "target"]
OPTIONAL = ["steps", "sleep_hours", "active_minutes", "calories", "gender", "age_group", "device_type"]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--dataset-name", required=True)
    parser.add_argument("--source-url", required=True)
    parser.add_argument("--license", required=True)
    parser.add_argument("--outcome-definition", required=True)
    args = parser.parse_args()
    source = Path(args.input)
    frame = pd.read_csv(source)
    missing = [column for column in REQUIRED if column not in frame]
    if missing:
        raise SystemExit(f"Missing required columns: {', '.join(missing)}")
    frame["timestamp"] = pd.to_datetime(frame["timestamp"], utc=True, errors="raise")
    if not set(frame["target"].dropna().astype(int).unique()).issubset({0, 1}):
        raise SystemExit("target must contain genuine binary 0/1 outcomes")
    repeated = frame.groupby("patient_id").size()
    if len(repeated) < 20 or (repeated >= 2).mean() < .8:
        raise SystemExit("Cohort is not sufficiently longitudinal: require at least 20 patients and repeated observations for 80%")
    columns = REQUIRED + [column for column in OPTIONAL if column in frame]
    normalized = frame[columns].sort_values(["patient_id", "timestamp"])
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    normalized.to_csv(args.output, index=False)
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    manifest = {"dataset_name": args.dataset_name, "source_url": args.source_url, "license": args.license, "outcome_definition": args.outcome_definition, "input_sha256": digest, "patients": int(frame.patient_id.nunique()), "records": len(frame), "positive_outcome_rate": float(frame.target.mean()), "missing_rates": {column: float(frame[column].isna().mean()) for column in columns}, "device_groups": frame.device_type.value_counts(dropna=False).to_dict() if "device_type" in frame else {}, "warning": "Import validation does not prove representativeness, generalisation, or clinical effectiveness."}
    Path(args.manifest).write_text(json.dumps(manifest, indent=2, default=str), encoding="utf-8")


if __name__ == "__main__": main()
