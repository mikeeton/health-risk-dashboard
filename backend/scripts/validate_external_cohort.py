"""Validate the installed classifier on a compatible cohort without retraining."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

import joblib
import pandas as pd

sys.path.append(str(Path(__file__).resolve().parents[1]))
from ml_engine.evaluation import classification_metrics, fairness_metrics
from ml_engine.features import ENGINEERED_FEATURES, engineer_features


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--artifact-dir", default="artifacts/ml")
    parser.add_argument("--output", required=True)
    parser.add_argument("--cohort-name", required=True)
    parser.add_argument("--fairness-columns", nargs="*", default=["gender", "age_group", "device_type"])
    args = parser.parse_args()
    artifact_dir = Path(args.artifact_dir)
    bundle = joblib.load(artifact_dir / "model.joblib")
    model_report = json.loads((artifact_dir / "evaluation.json").read_text(encoding="utf-8"))
    frame = engineer_features(pd.read_csv(args.dataset))
    if "target" not in frame or frame["target"].dropna().empty:
        raise ValueError("External validation requires a genuine target column; labels must not be invented.")
    probability = bundle["classifier"].predict_proba(frame[ENGINEERED_FEATURES])[:, 1]
    threshold = float(model_report["operating_threshold"])
    shift = {}
    for feature, profile in model_report.get("reference_profile", {}).items():
        observed = frame[feature].dropna()
        if observed.empty:
            shift[feature] = {"status": "missing", "missing_rate": 1.0}
            continue
        spread = max(float(profile.get("std") or 0), 1e-6)
        shift[feature] = {"mean_z_shift": abs(float(observed.mean()) - float(profile["mean"])) / spread, "missing_rate": float(frame[feature].isna().mean()), "reference_missing_rate": float(profile.get("missing_rate", 0))}
    report = {"cohort": args.cohort_name, "model_version": model_report["model_version"], "retrained": False, "records": len(frame), "metrics": classification_metrics(frame["target"].astype(int), probability, threshold), "dataset_shift": shift, "subgroups": {}, "warning": "External validation evidence only; it does not establish clinical effectiveness or regulatory approval."}
    for column in args.fairness_columns:
        if column in frame:
            report["subgroups"][column] = fairness_metrics(frame["target"], probability, frame[column], threshold)
    Path(args.output).write_text(json.dumps(report, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
