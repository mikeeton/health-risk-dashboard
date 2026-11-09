"""Add reproducible patient-bootstrap intervals to an observed-target artifact."""

import argparse
import json
from pathlib import Path
import sys

import joblib
import pandas as pd

sys.path.append(str(Path(__file__).resolve().parents[1]))
from ml_engine.evaluation import patient_bootstrap_intervals
from ml_engine.features import ENGINEERED_FEATURES, engineer_features
from scripts.train_ml_models import file_sha256, split


def run(dataset: Path, external_dataset: Path, artifact_dir: Path):
    report_path = artifact_dir / "evaluation.json"
    report = json.loads(report_path.read_text(encoding="utf-8"))
    if report.get("preparation", {}).get("label_mode") != "observed_next_window":
        raise ValueError("Only an observed-target artifact may be augmented")
    manifest = report["preparation"]["sets"]
    if manifest["set-a"]["csv_sha256"] != file_sha256(dataset) or manifest["set-b"]["csv_sha256"] != file_sha256(external_dataset):
        raise ValueError("Dataset hashes do not match the artifact manifest")
    bundle = joblib.load(artifact_dir / "model.joblib")
    frame = engineer_features(pd.read_csv(dataset))
    _, _, _, _, test = split(frame)
    if len(test) != report["records"]["test"]:
        raise ValueError("Held-out partition no longer matches the saved evaluation")
    threshold = float(report["operating_threshold"])
    scores = bundle["classifier"].predict_proba(test[ENGINEERED_FEATURES])[:, 1]
    report["test_confidence_intervals"] = patient_bootstrap_intervals(test["target"], scores, test["patient_id"], threshold)
    external = engineer_features(pd.read_csv(external_dataset))
    scores = bundle["classifier"].predict_proba(external[ENGINEERED_FEATURES])[:, 1]
    report["external_validation"]["confidence_intervals"] = patient_bootstrap_intervals(external["target"], scores, external["patient_id"], threshold)
    report["evaluation_revision"] = "patient-bootstrap-v1"
    staged = report_path.with_suffix(".json.tmp")
    staged.write_text(json.dumps(report, indent=2), encoding="utf-8")
    staged.replace(report_path)
    return report["test_confidence_intervals"], report["external_validation"]["confidence_intervals"]


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=Path, required=True)
    parser.add_argument("--external-dataset", type=Path, required=True)
    parser.add_argument("--artifact-dir", type=Path, required=True)
    options = parser.parse_args()
    print(json.dumps(run(options.dataset, options.external_dataset, options.artifact_dir), indent=2))
