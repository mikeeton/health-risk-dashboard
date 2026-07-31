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

from ml_engine.evaluation import classification_metrics, fairness_metrics
from ml_engine.features import ENGINEERED_FEATURES, engineer_features


SCHEMA_VERSION = "wearable-risk-v1"


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def split(frame):
    splitter = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    train_idx, test_idx = next(splitter.split(frame, frame["target"], groups=frame["patient_id"]))
    train = frame.iloc[train_idx]
    test = frame.iloc[test_idx]
    inner = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=43)
    fit_idx, validation_idx = next(inner.split(train, train["target"], groups=train["patient_id"]))
    return train.iloc[fit_idx], train.iloc[validation_idx], test


def candidates():
    return {
        "logistic_regression": Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scale", StandardScaler()),
            ("model", LogisticRegression(max_iter=2000, class_weight="balanced", random_state=42)),
        ]),
        "random_forest": Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("model", RandomForestClassifier(n_estimators=350, min_samples_leaf=3, class_weight="balanced", random_state=42, n_jobs=-1)),
        ]),
    }


def run(args):
    dataset_path = Path(args.dataset).resolve()
    frame = engineer_features(pd.read_csv(dataset_path))
    if "target" not in frame or not set(frame["target"].dropna().astype(int).unique()).issubset({0, 1}):
        raise ValueError("target must be a binary 0/1 outcome column")
    frame["target"] = frame["target"].astype(int)
    train, validation, test = split(frame)
    results = {}
    trained = {}
    for name, model in candidates().items():
        model.fit(train[ENGINEERED_FEATURES], train["target"])
        probabilities = model.predict_proba(validation[ENGINEERED_FEATURES])[:, 1]
        results[name] = classification_metrics(validation["target"], probabilities)
        trained[name] = model
    best_name = max(results, key=lambda name: (results[name]["roc_auc"] or 0, results[name]["f1"]))
    best = trained[best_name]
    calibrated = CalibratedClassifierCV(FrozenEstimator(best), method="sigmoid")
    calibrated.fit(validation[ENGINEERED_FEATURES], validation["target"])
    test_probability = calibrated.predict_proba(test[ENGINEERED_FEATURES])[:, 1]
    anomaly = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
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
        "outcome_definition": args.outcome_definition,
        "selected_model": best_name,
        "records": {"total": len(frame), "train": len(train), "validation": len(validation), "test": len(test)},
        "candidate_validation": results,
        "test_metrics": classification_metrics(test["target"], test_probability),
        "fairness": {},
        "external_validation": None,
        "limitations": [
            "Performance applies only to the documented outcome and dataset population.",
            "Subgroup estimates with small samples are unstable.",
            "Clinical safety thresholds remain deterministic and independent of this model.",
        ],
    }
    for column in args.fairness_columns:
        if column in test:
            report["fairness"][column] = fairness_metrics(test["target"], test_probability, test[column])
    if args.external_dataset:
        external = engineer_features(pd.read_csv(args.external_dataset))
        external_probability = calibrated.predict_proba(external[ENGINEERED_FEATURES])[:, 1]
        report["external_validation"] = {
            "dataset": str(Path(args.external_dataset).name),
            "metrics": classification_metrics(external["target"].astype(int), external_probability),
        }
    output = Path(args.output)
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
    parser.add_argument("--output", default="artifacts/ml")
    parser.add_argument("--version")
    parser.add_argument("--contamination", type=float, default=0.05)
    parser.add_argument("--fairness-columns", nargs="*", default=["gender", "age_group"])
    return parser.parse_args()


if __name__ == "__main__":
    run(parse_args())
