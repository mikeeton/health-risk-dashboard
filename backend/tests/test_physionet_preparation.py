import pandas as pd

from scripts.prepare_physionet_2012 import prepare_record


def record(*observations):
    return pd.DataFrame(
        [("00:00", "RecordID", 42), ("00:00", "Gender", 0), ("00:00", "Age", 60), *observations],
        columns=["Time", "Parameter", "Value"],
    )


def test_observed_target_does_not_turn_carried_forward_reading_into_future_event():
    raw = record(("00:30", "HR", 150), ("12:30", "HR", 75))
    observed = prepare_record(raw, label_mode="observed_next_window")
    legacy = prepare_record(raw, label_mode="legacy_forward_fill")

    # The 06:00–12:00 bin contains no new HR/BP measurement.
    assert observed["timestamp"].iloc[0].startswith("2012-01-01T06:00:00")
    assert observed["target"].tolist() == [0]
    assert legacy["target"].iloc[0] == 1


def test_next_bin_new_critical_reading_is_labelled_and_sao2_is_not_misnamed_spo2():
    raw = record(("00:30", "HR", 75), ("06:30", "HR", 145), ("06:30", "SaO2", 88))
    observed = prepare_record(raw, label_mode="observed_next_window")

    assert observed["target"].tolist() == [1]
    assert pd.isna(observed["spo2"].iloc[0])


def test_final_window_without_future_observations_is_excluded():
    raw = record(("00:30", "HR", 75), ("48:30", "HR", 150))
    observed = prepare_record(raw, label_mode="observed_next_window")
    assert observed.empty


def test_six_hour_boundary_uses_only_next_bin_observations():
    raw = record(("05:59", "HR", 75), ("06:00", "HR", 145))
    observed = prepare_record(raw, label_mode="observed_next_window")
    assert observed["target"].tolist() == [1]
    assert observed["heart_rate"].tolist() == [75]


def test_missing_future_hr_bp_is_unresolved_even_if_sao2_is_present():
    raw = record(("00:30", "HR", 75), ("06:30", "SaO2", 82))
    assert prepare_record(raw, label_mode="observed_next_window").empty


def test_observed_features_do_not_carry_a_reading_beyond_twelve_hours():
    raw = record(("00:30", "HR", 75), ("24:30", "HR", 80), ("30:30", "HR", 85))
    observed = prepare_record(raw, label_mode="observed_next_window")
    row_at_18h = observed[observed["timestamp"].str.contains("T18:00:00")].iloc[0]
    assert pd.isna(row_at_18h["heart_rate"])


def test_zero_valued_source_measurement_does_not_create_critical_label():
    raw = record(("00:30", "HR", 75), ("06:30", "HR", 0))
    assert prepare_record(raw, label_mode="observed_next_window").empty
