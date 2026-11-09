import json
from types import SimpleNamespace

import pytest

from routes.research import aggregate_genuine_shap


def stored(*items, model_version="synthetic-test"):
    return SimpleNamespace(shap_json=json.dumps(list(items)), model_version=model_version)


def test_global_shap_excludes_coefficient_and_unknown_fallbacks():
    records = [
        stored({"feature": "heart_rate", "contribution": 0.2, "method": "SHAP"}),
        stored({"feature": "heart_rate", "contribution": -0.4, "method": "SHAP"}),
        stored({"feature": "heart_rate", "contribution": 100, "method": "model coefficient fallback"}),
        stored({"feature": "heart_rate", "contribution": 50}),
        stored({"feature": "heart_rate", "contribution": 5, "method": "SHAP"}, model_version="different-model"),
    ]

    result = aggregate_genuine_shap(records, model_version="synthetic-test")

    assert result["shap_prediction_records"] == 2
    assert result["excluded_non_shap_records"] == 2
    assert result["excluded_other_version_records"] == 1
    assert result["features"][0]["feature"] == "heart_rate"
    assert result["features"][0]["mean_absolute_shap"] == pytest.approx(0.3)
    assert result["features"][0]["observations"] == 2


def test_global_shap_reports_unavailable_without_genuine_values():
    result = aggregate_genuine_shap([stored({"feature": "heart_rate", "contribution": 1, "method": "model coefficient fallback"})], model_version="synthetic-test")
    assert result["features"] == []
    assert result["shap_prediction_records"] == 0
    assert result["excluded_non_shap_records"] == 1
    assert result["method"] == "SHAP unavailable in stored predictions"
