"""Train and evaluate the versioned health-risk model.

The input CSV must contain the columns documented in docs/ML_MODEL_CARD.md.
Splits are patient-grouped to prevent records from one patient leaking across
training and test sets.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
import sys

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.frozen import FrozenEstimator
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

sys.path.append(str(Path(__file__).resolve().parents[1]))

from ml_engine.evaluation import classification_metrics, fairness_metrics, patient_bootstrap_intervals
from ml_engine.features import ENGINEERED_FEATURES, engineer_features


SCHEMA_VERSION = "wearable-risk-v1"


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def split(frame):
    """Patient-disjoint fit, selection, calibration, threshold and test sets."""
    remaining = frame
    partitions = {}
    for name, fraction, seed in (
        ("test", 0.20, 42),
        ("threshold", 0.125, 43),
        ("calibration", 1 / 7, 44),
        ("selection", 1 / 6, 45),
    ):
        splitter = GroupShuffleSplit(n_splits=1, test_size=fraction, random_state=seed)
        fit_idx, held_idx = next(splitter.split(remaining, remaining["target"], groups=remaining["patient_id"]))
        partitions[name] = remaining.iloc[held_idx]
        remaining = remaining.iloc[fit_idx]
    return remaining, partitions["selection"], partitions["calibration"], partitions["threshold"], partitions["test"]


def candidates():
    return {
        "logistic_regression": Pipeline([
            ("imputer", SimpleImputer(strategy="median", keep_empty_features=True)),
            ("scale", StandardScaler()),
            ("model", LogisticRegression(max_iter=2000, class_weight="balanced", random_state=42)),
        ]),
        "random_forest": Pipeline([
            ("imputer", SimpleImputer(strategy="median", keep_empty_features=True)),
            ("model", RandomForestClassifier(n_estimators=350, min_samples_leaf=3, class_weight="balanced", random_state=42, n_jobs=-1)),
        ]),
    }


def choose_operating_threshold(y_true, probabilities) -> float:
    """Prefer sensitivity while retaining useful specificity."""
    best = (float("-inf"), 0.5)
    y_true = np.asarray(y_true, dtype=int)
    probabilities = np.asarray(probabilities, dtype=float)
    candidates = np.unique(
        np.concatenate((np.linspace(0.001, 0.25, 250), np.quantile(probabilities, np.linspace(0.01, 0.99, 99))))
    )
    for threshold in candidates:
        predicted = probabilities >= threshold
        tp = int(((predicted == 1) & (y_true == 1)).sum())
        fn = int(((predicted == 0) & (y_true == 1)).sum())
        tn = int(((predicted == 0) & (y_true == 0)).sum())
        fp = int(((predicted == 1) & (y_true == 0)).sum())
        sensitivity = tp / (tp + fn) if tp + fn else 0
        specificity = tn / (tn + fp) if tn + fp else 0
        score = sensitivity + specificity - 1
        if sensitivity >= 0.7 and score > best[0]:
            best = (score, float(threshold))
    return best[1]


def run(args):
    dataset_path = Path(args.dataset).resolve()
    output = Path(args.output)
    if (output / "model.joblib").exists() or (output / "evaluation.json").exists():
        raise FileExistsError(f"Refusing to overwrite an existing model artifact in {output}")
    manifest_path = getattr(args, "dataset_manifest", None)
    dataset_manifest = None
    if manifest_path:
        dataset_manifest = json.loads(Path(manifest_path).read_text(encoding="utf-8"))
        expected = dataset_manifest.get("sets", {}).get("set-a", {}).get("csv_sha256")
        if expected != file_sha256(dataset_path):
            raise ValueError("Training CSV hash does not match the dataset manifest")
        if args.external_dataset:
            external_expected = dataset_manifest.get("sets", {}).get("set-b", {}).get("csv_sha256")
            if external_expected != file_sha256(Path(args.external_dataset)):
                raise ValueError("External CSV hash does not match the dataset manifest")
    frame = engineer_features(pd.read_csv(dataset_path))
    if "target" not in frame or not set(frame["target"].dropna().astype(int).unique()).issubset({0, 1}):
        raise ValueError("target must be a binary 0/1 outcome column")
    frame["target"] = frame["target"].astype(int)
    train, selection, calibration, threshold_set, test = split(frame)
    results = {}
    trained = {}
    for name, model in candidates().items():
        model.fit(train[ENGINEERED_FEATURES], train["target"])
        probabilities = model.predict_proba(selection[ENGINEERED_FEATURES])[:, 1]
        results[name] = classification_metrics(selection["target"], probabilities)
        trained[name] = model
    best_name = max(results, key=lambda name: (results[name]["roc_auc"] or 0, results[name]["f1"]))
    best = trained[best_name]
    calibrated = CalibratedClassifierCV(FrozenEstimator(best), method="sigmoid")
    calibrated.fit(calibration[ENGINEERED_FEATURES], calibration["target"])
    threshold_probability = calibrated.predict_proba(threshold_set[ENGINEERED_FEATURES])[:, 1]
    operating_threshold = choose_operating_threshold(threshold_set["target"], threshold_probability)
    test_probability = calibrated.predict_proba(test[ENGINEERED_FEATURES])[:, 1]
    anomaly = Pipeline([
        ("imputer", SimpleImputer(strategy="median", keep_empty_features=True)),
        ("scale", StandardScaler()),
        ("model", IsolationForest(n_estimators=300, contamination=args.contamination, random_state=42, n_jobs=-1)),
    ])
    anomaly.fit(train.loc[train["target"] == 0, ENGINEERED_FEATURES])
    version = args.version or datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    report = {
        "schema_version": SCHEMA_VERSION,
        "model_version": version,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "dataset": {"name": args.dataset_name, "source_url": args.source_url, "sha256": file_sha256(dataset_path)},
        "preparation": dataset_manifest,
        "research_only": True,
        "clinical_approval": False,
        "outcome_definition": args.outcome_definition,
        "selected_model": best_name,
        "records": {"total": len(frame), "train": len(train), "selection": len(selection), "calibration": len(calibration), "threshold": len(threshold_set), "test": len(test)},
        "candidate_validation": results,
        "operating_threshold": operating_threshold,
        "test_metrics": classification_metrics(test["target"], test_probability, operating_threshold, include_curves=True),
        "test_confidence_intervals": patient_bootstrap_intervals(test["target"], test_probability, test["patient_id"], operating_threshold),
        "fairness": {},
        "external_validation": None,
        "reference_profile": {
            feature: {
                "mean": float(train[feature].dropna().mean()),
                "std": float(train[feature].dropna().std() or 0),
                "missing_rate": float(train[feature].isna().mean()),
            }
            for feature in ENGINEERED_FEATURES
            if not train[feature].dropna().empty
        },
        "limitations": [
            "Performance applies only to the documented outcome and dataset population.",
            "Subgroup estimates with small samples are unstable.",
            "Clinical safety thresholds remain deterministic and independent of this model.",
        ],
    }
    for column in args.fairness_columns:
        if column in test:
            report["fairness"][column] = fairness_metrics(test["target"], test_probability, test[column], operating_threshold)
    if args.external_dataset:
        external = engineer_features(pd.read_csv(args.external_dataset))
        external_probability = calibrated.predict_proba(external[ENGINEERED_FEATURES])[:, 1]
        report["external_validation"] = {
            "dataset": str(Path(args.external_dataset).name),
            "metrics": classification_metrics(external["target"].astype(int), external_probability, operating_threshold, include_curves=True),
            "confidence_intervals": patient_bootstrap_intervals(external["target"].astype(int), external_probability, external["patient_id"], operating_threshold),
        }
    test_metrics = report["test_metrics"]
    external_metrics = (report["external_validation"] or {}).get("metrics")
    gates = {
        "test_roc_auc_at_least_0_65": (test_metrics["roc_auc"] or 0) >= 0.65,
        "test_sensitivity_at_least_0_60": test_metrics["recall_sensitivity"] >= 0.60,
        "test_specificity_at_least_0_60": test_metrics["specificity"] >= 0.60,
        "external_roc_auc_at_least_0_60": external_metrics is None or (external_metrics["roc_auc"] or 0) >= 0.60,
    }
    report["acceptance_gates"] = gates
    report["approved_for_inference"] = all(gates.values())
    output.mkdir(parents=True, exist_ok=True)
    explanation_pipeline = best
    explanation_background = explanation_pipeline[:-1].transform(
        train[ENGINEERED_FEATURES].sample(min(100, len(train)), random_state=42)
    )
    joblib.dump(
        {
            "schema_version": SCHEMA_VERSION,
            "classifier": calibrated,
            "anomaly_detector": anomaly,
            "explanation_pipeline": explanation_pipeline,
            "explanation_background": explanation_background,
        },
        output / "model.joblib",
    )
    (output / "evaluation.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--dataset-name", required=True)
    parser.add_argument("--source-url", required=True)
    parser.add_argument("--outcome-definition", required=True)
    parser.add_argument("--external-dataset")
    parser.add_argument("--dataset-manifest", help="Manifest from prepare_physionet_2012.py; verifies the training CSV hash")
    parser.add_argument("--output", default="artifacts/ml")
    parser.add_argument("--version")
    parser.add_argument("--contamination", type=float, default=0.05)
    parser.add_argument("--fairness-columns", nargs="*", default=["gender", "age_group"])
    return parser.parse_args()


if __name__ == "__main__":
    run(parse_args())
