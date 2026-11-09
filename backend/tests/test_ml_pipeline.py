from datetime import datetime, timedelta, timezone
from importlib.util import find_spec
from types import SimpleNamespace

import numpy as np
import pandas as pd
import joblib
import json
import pytest

from ml_engine.evaluation import classification_metrics, fairness_metrics, patient_bootstrap_intervals
from ml_engine.features import ENGINEERED_FEATURES, engineer_features
from ml_engine.registry import explain
from ml_engine import registry
from scripts.train_ml_models import run, split
from routes.ml import get_research_candidate


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


def test_training_partitions_never_share_patient_ids():
    partitions = split(sample_frame(patient_count=40))
    patient_sets = [set(part["patient_id"]) for part in partitions]
    assert all(patient_sets)
    assert sum(map(len, patient_sets)) == len(set.union(*patient_sets))


def test_training_refuses_dataset_without_matching_manifest(tmp_path):
    dataset = tmp_path / "train.csv"
    sample_frame(patient_count=15).to_csv(dataset, index=False)
    manifest = tmp_path / "manifest.json"
    manifest.write_text(json.dumps({"sets": {"set-a": {"csv_sha256": "wrong"}}}))
    with pytest.raises(ValueError, match="does not match"):
        run(SimpleNamespace(dataset=str(dataset), dataset_manifest=str(manifest), output=str(tmp_path / "model"), external_dataset=None))


def test_metrics_include_discrimination_calibration_and_confusion_matrix():
    y_true = np.array([0, 0, 0, 1, 1, 1])
    probability = np.array([0.05, 0.2, 0.4, 0.6, 0.8, 0.95])
    metrics = classification_metrics(y_true, probability, include_curves=True)
    assert metrics["roc_auc"] == 1.0
    assert metrics["brier_score"] < 0.2
    assert metrics["confusion_matrix"] == {"tn": 3, "fp": 0, "fn": 0, "tp": 3}
    assert metrics["calibration"]
    assert metrics["roc_curve"][0]["false_positive_rate"] == 0.0
    assert metrics["precision_recall_curve"]


def test_bootstrap_intervals_resample_patients_and_are_reproducible():
    labels = np.array([0, 1] * 8)
    scores = np.array([0.2, 0.8] * 8)
    patients = np.repeat(np.arange(8), 2)
    first = patient_bootstrap_intervals(labels, scores, patients, 0.5, iterations=20)
    second = patient_bootstrap_intervals(labels, scores, patients, 0.5, iterations=20)
    assert first == second
    assert first["patients"] == 8
    assert first["metrics"]["roc_auc"]["lower"] == 1.0


def test_research_candidate_requires_observed_target_provenance(tmp_path, monkeypatch):
    monkeypatch.setenv("ML_CANDIDATE_ARTIFACT_DIR", str(tmp_path))
    (tmp_path / "evaluation.json").write_text(json.dumps({"model_version": "candidate", "preparation": {"label_mode": "legacy_forward_fill"}}))
    assert get_research_candidate(current_user=object())["available"] is False
    (tmp_path / "evaluation.json").write_text(json.dumps({"model_version": "candidate", "preparation": {"label_mode": "observed_next_window"}}))
    response = get_research_candidate(current_user=object())
    assert response["available"] is True
    assert response["serving_inference"] is False


def test_inference_metadata_cannot_override_a_failed_acceptance_gate(tmp_path, monkeypatch):
    monkeypatch.setattr(registry, "ARTIFACT_DIR", tmp_path)
    (tmp_path / "model.joblib").write_bytes(b"not loaded by status check")
    report = {
        "schema_version": "wearable-risk-v1",
        "approved_for_inference": True,
        "acceptance_gates": {"test_sensitivity_at_least_0_60": False},
    }
    (tmp_path / "evaluation.json").write_text(json.dumps(report))
    registry.artifact_status.cache_clear()
    try:
        assert registry.model_status()["available"] is False
        report["acceptance_gates"]["test_sensitivity_at_least_0_60"] = True
        (tmp_path / "evaluation.json").write_text(json.dumps(report))
        registry.artifact_status.cache_clear()
        assert registry.model_status()["available"] is True
    finally:
        registry.artifact_status.cache_clear()


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
    expected_method = "SHAP" if find_spec("shap") else "model coefficient fallback"
    assert all(item["method"] == expected_method for item in explanations)
