import io
import zipfile

import pandas as pd

from scripts.audit_physionet_label_coverage import audit_archive, audit_record


def make_record(*observations):
    return pd.DataFrame(
        [("00:00", "RecordID", 42), ("00:00", "Gender", 0), ("00:00", "Age", 60), *observations],
        columns=["Time", "Parameter", "Value"],
    )


def test_coverage_separates_observed_negative_from_unresolved_followup():
    raw = make_record(
        ("00:30", "HR", 70),
        ("06:30", "HR", 0),  # Invalid, so this next bin remains unresolved.
        ("12:30", "HR", 75),
        ("18:30", "HR", 150),
        ("24:30", "SaO2", 88),  # Arterial saturation is not wearable SpO2.
    )
    counts = audit_record(raw)
    assert counts["possible_windows"] == 7
    assert counts["eligible_windows"] == 2
    assert counts["excluded_unresolved_windows"] == 5
    assert counts["negative_windows"] == 1
    assert counts["positive_windows"] == 1
    assert counts["invalid_source_measurements"] == 1
    assert counts["missing_current_features"]["spo2"] == 2
    assert counts["stale_current_features"]["heart_rate"] == 1
    assert counts["missing_next_observations"]["systolic_bp"] == 2


def test_coverage_archive_reports_records_without_eligible_followup():
    first = make_record(("00:30", "HR", 70), ("06:30", "HR", 75))
    second = make_record(("00:30", "HR", 70))
    second.loc[second["Parameter"] == "RecordID", "Value"] = 43
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, "w") as archive:
        archive.writestr("42.txt", first.to_csv(index=False))
        archive.writestr("43.txt", second.to_csv(index=False))
    counts = audit_archive(stream.getvalue())
    assert counts["source_records"] == 2
    assert counts["distinct_patients"] == 2
    assert counts["records_with_no_eligible_windows"] == 1
    assert counts["possible_windows"] == 14
    assert counts["eligible_windows"] == 1
    assert counts["followup_observed_fraction"] == round(1 / 14, 6)
