import risk_assessment
import early_warning

from evaluation_suite import experiments
from evaluation_suite import runner
from evaluation_suite.scenarios import SUPPORTED_SCENARIOS


def test_scenario_outcomes_cover_every_named_fixture_without_model(
    monkeypatch,
):
    monkeypatch.setattr(experiments, "_latest_model_signal", lambda *_: None)
    monkeypatch.setattr(
        risk_assessment,
        "model_status",
        lambda: {"available": False, "operating_threshold": 0.5},
    )

    rows = experiments.scenario_outcomes(seed=123)

    assert [row["scenario"] for row in rows] == list(SUPPORTED_SCENARIOS)
    assert all(row["baseline_ready"] for row in rows)
    assert rows[0]["synthetic_label"] == "normal"
    assert all(row["synthetic_label"] == "abnormal" for row in rows[1:])


def test_personalization_interprets_same_value_relative_to_patient():
    patient_a, patient_b = experiments.baseline_personalization(seed=7)

    assert patient_a["current_heart_rate_bpm"] == patient_b["current_heart_rate_bpm"]
    assert patient_a["z_score"] > patient_b["z_score"] * 3
    assert patient_a["canonical_level"] == "moderate"
    assert patient_b["canonical_level"] == "low"


def test_persistence_records_duplicate_alert_updates_without_duplicate_cases():
    isolated, persistent = experiments.persistence_comparison(seed=7)

    assert isolated["alert_count"] == 1
    assert persistent["alert_count"] == 1
    assert persistent["duplicate_updates"] > isolated["duplicate_updates"]


def test_combined_signal_has_stronger_patient_relative_result():
    heart_only, combined = experiments.multi_signal_comparison(seed=7)

    assert combined["relative_score"] > heart_only["relative_score"]
    assert combined["canonical_level"] == "high"
    assert len(combined["baseline_reasons"]) > len(heart_only["baseline_reasons"])


def test_every_deterministic_critical_override_passes():
    rows = experiments.critical_override_results(seed=7)

    assert {row["injected_abnormality"] for row in rows} == {
        "spo2",
        "heart_rate",
        "blood_pressure",
    }
    assert all(row["passed"] for row in rows)


def test_shadow_mode_stores_evidence_without_review_case():
    result = experiments.shadow_mode_result(seed=7)

    assert result["passed"] is True
    assert result["stored_predictions"] == 2
    assert result["review_cases"] == 0
    assert result["active_alert_eligible"] is False


def test_canonical_risk_is_independent_of_groq():
    result = experiments.groq_independence_result(seed=7)

    assert result["passed"] is True
    assert result["canonical_identical"] is True
    assert result["alert_identical"] is True


def test_security_boundary_denies_outsider_and_pseudonymizes_ai_context():
    result = experiments.security_boundary_result(seed=7)

    assert result["passed"] is True
    assert result["unauthorized_canonical_access_status"] == 404
    assert result["assistant_context_patient_name_absent"] is True
    assert result["assistant_context_pseudonym_present"] is True


def test_false_alert_rate_uses_normal_synthetic_sequences():
    summary, rows = experiments.false_alert_evaluation(seed=7, trials=3)

    assert summary["normal_sequences"] == 3
    assert summary["false_alerts"] == 0
    assert summary["false_alert_rate"] == 0
    assert len(rows) == 3


def test_attribution_evaluation_calculates_top_k_rates(monkeypatch):
    def controlled_prediction(vitals, patient_id, include_explanation=True):
        latest = vitals[0]
        feature = "spo2_delta" if latest.spo2 == 90 else "heart_rate_delta"
        return {
            "probability": 0.8,
            "prediction_level": "High",
            "model_version": "controlled-v1",
            "anomaly_detected": True,
            "explanations": [
                {"feature": feature, "contribution": 1.0, "method": "SHAP"}
            ],
        }

    monkeypatch.setattr(experiments, "model_predict", controlled_prediction)

    summary, rows = experiments.shap_attribution_evaluation(
        seed=7, repeats_per_abnormality=2
    )

    assert len(rows) == 4
    assert summary["top_1_rate"] == 1
    assert summary["top_3_rate"] == 1
    assert summary["shap_available_for_all"] is True


def test_performance_evaluation_reports_all_samples_without_model(monkeypatch):
    unavailable = lambda: {"available": False, "operating_threshold": 0.5}
    monkeypatch.setattr(early_warning, "model_status", unavailable)
    monkeypatch.setattr(risk_assessment, "model_status", unavailable)

    summary, rows = experiments.performance_evaluation(seed=7, iterations=2)

    assert summary["iterations"] == 2
    assert summary["mean_ms"] > 0
    assert summary["p95_ms"] >= summary["median_ms"]
    assert summary["environment"]["database"] == "SQLite in-memory"
    assert len(rows) == 2


def test_runner_writes_json_and_csv_evidence(tmp_path, monkeypatch):
    unavailable = {"available": False, "operating_threshold": 0.5}

    def controlled_prediction(*_args, **_kwargs):
        return {
            "probability": 0.2,
            "prediction_level": "High",
            "model_version": "controlled-v1",
            "anomaly_detected": False,
            "drift": {"score": 0.1},
            "explanations": [
                {
                    "feature": "heart_rate",
                    "value": 100,
                    "contribution": 0.5,
                    "method": "SHAP",
                }
            ],
        }

    monkeypatch.setattr(experiments, "model_predict", controlled_prediction)
    monkeypatch.setattr(experiments, "model_status", lambda: unavailable)
    monkeypatch.setattr(early_warning, "model_status", lambda: unavailable)
    monkeypatch.setattr(risk_assessment, "model_status", lambda: unavailable)
    monkeypatch.setattr(runner, "model_status", lambda: unavailable)

    manifest = runner.run_evaluation_suite(
        tmp_path,
        seed=7,
        false_alert_trials=2,
        attribution_repeats=1,
        performance_iterations=2,
    )

    assert "summary.json" in manifest["files"]
    assert "scenario_outcomes.csv" in manifest["files"]
    assert (tmp_path / "manifest.json").is_file()
    assert (tmp_path / "summary.json").is_file()
    assert (tmp_path / "performance_samples.csv").read_text().count("\n") == 3
