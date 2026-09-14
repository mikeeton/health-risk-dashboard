from datetime import datetime

import pytest

from evaluation_suite.scenarios import SUPPORTED_SCENARIOS, generate_scenario


def test_all_named_scenarios_are_reproducible_and_chronological():
    for name in SUPPORTED_SCENARIOS:
        first = generate_scenario(name, seed=1234)
        second = generate_scenario(name, seed=1234)

        assert first == second
        assert len(first) >= 11
        timestamps = [datetime.fromisoformat(item.timestamp) for item in first]
        assert timestamps == sorted(timestamps)
        assert all(item.timestamp.endswith("+00:00") for item in first)


def test_different_seed_changes_normal_noise():
    assert generate_scenario("normal_stable", seed=1) != generate_scenario(
        "normal_stable", seed=2
    )


def test_injected_scenarios_have_expected_dominant_change():
    assert generate_scenario("single_spike")[-1].heart_rate == 115
    assert generate_scenario("falling_spo2")[-1].spo2 == 93
    assert generate_scenario("bp_spike")[-1].systolic_bp == 165
    combined = generate_scenario("combined_hr_spo2")[-1]
    assert combined.heart_rate == 110
    assert combined.spo2 == 93


def test_unknown_scenario_and_naive_start_are_rejected():
    with pytest.raises(ValueError, match="Unsupported scenario"):
        generate_scenario("unknown")
    with pytest.raises(ValueError, match="timezone-aware"):
        generate_scenario("normal_stable", start=datetime(2026, 9, 11))
