from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import numpy as np
import pandas as pd
import joblib

from ml_engine.evaluation import classification_metrics, fairness_metrics
from ml_engine.features import ENGINEERED_FEATURES, engineer_features
from ml_engine.registry import explain
from scripts.train_ml_models import run


def sample_frame(patient_count=6, records=8):
    rows = []
    start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    for patient_id in range(patient_count):
        for index in range(records):
            rows.append({
                "patient_id": patient_id,
                "timestamp": (start + timedelta(hours=index)).isoformat(),
                "heart_rate": 65 + patient_id + index,
                "spo2": 98 - (index % 3),
                "systolic_bp": 115 + patient_id + index,
                "diastolic_bp": 75 + patient_id,
                "steps": 1000 + index * 250,
                "sleep_hours": 7.5 - index * 0.1,
                "active_minutes": 20 + index,
                "calories": 1800 + index * 10,
                "target": int(index >= 6),
                "gender": "A" if patient_id % 2 else "B",
            })
    return pd.DataFrame(rows)


def test_feature_engineering_is_patient_scoped_and_complete():
    result = engineer_features(sample_frame())
    assert set(ENGINEERED_FEATURES).issubset(result.columns)
    first_per_patient = result.groupby("patient_id").head(1)
    assert (first_per_patient["heart_rate_delta"] == 0).all()
    assert (result["heart_rate_mean_3"] > 0).all()


def test_metrics_include_discrimination_calibration_and_confusion_matrix():
    y_true = np.array([0, 0, 0, 1, 1, 1])
    probability = np.array([0.05, 0.2, 0.4, 0.6, 0.8, 0.95])
    metrics = classification_metrics(y_true, probability)
    assert metrics["roc_auc"] == 1.0
    assert metrics["brier_score"] < 0.2
    assert metrics["confusion_matrix"] == {"tn": 3, "fp": 0, "fn": 0, "tp": 3}
    assert metrics["calibration"]


def test_fairness_report_marks_small_subgroups_as_insufficient():
    result = fairness_metrics([0, 1, 0, 1, 0, 1], [0.1, 0.9, 0.2, 0.8, 0.3, 0.7], ["A", "A", "A", "B", "B", "B"])
    assert result["groups"]["A"]["status"] == "insufficient_sample"
    assert result["max_recall_gap"] is None


def test_training_writes_versioned_model_and_evaluation(tmp_path):
    dataset = tmp_path / "dataset.csv"
    output = tmp_path / "artifacts"
    sample_frame(patient_count=15, records=10).to_csv(dataset, index=False)

    run(SimpleNamespace(
        dataset=str(dataset),
        dataset_name="Reviewed fixture",
        source_url="https://example.invalid/reviewed-fixture",
        outcome_definition="Fixture outcome within one observation",
        external_dataset=None,
        output=str(output),
        version="test-v1",
        contamination=0.05,
        fairness_columns=["gender"],
    ))
    assert (output / "model.joblib").exists()
    report = __import__("json").loads((output / "evaluation.json").read_text())
    assert report["model_version"] == "test-v1"
    assert report["test_metrics"]["roc_auc"] is not None
    assert report["dataset"]["sha256"]
    bundle = joblib.load(output / "model.joblib")
    latest = engineer_features(sample_frame(patient_count=1, records=8)).iloc[[-1]][ENGINEERED_FEATURES]
    explanations = explain(bundle, latest)
    assert explanations
    assert all(item["method"] == "SHAP" for item in explanations)
