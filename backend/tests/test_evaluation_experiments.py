import risk_assessment

from evaluation_suite import experiments
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
