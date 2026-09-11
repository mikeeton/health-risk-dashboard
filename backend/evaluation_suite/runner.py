"""Run the dissertation evaluation suite and write machine-readable evidence."""
from __future__ import annotations

import csv
from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any

from ml_engine.registry import model_status
from .experiments import (
    EVALUATION_VERSION,
    baseline_personalization,
    critical_override_results,
    false_alert_evaluation,
    groq_independence_result,
    multi_signal_comparison,
    performance_evaluation,
    persistence_comparison,
    scenario_outcomes,
    shadow_mode_result,
    shap_attribution_evaluation,
)
from .scenarios import SCENARIO_VERSION


DEFAULT_OUTPUT = (
    Path(__file__).resolve().parents[2]
    / "docs"
    / "dissertation-evidence"
    / "evaluation"
)


def _json_default(value: Any):
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat()
    raise TypeError(f"Cannot serialize {type(value).__name__}")


def _write_json(path: Path, value: Any) -> None:
    path.write_text(
        json.dumps(value, indent=2, sort_keys=True, default=_json_default) + "\n",
        encoding="utf-8",
    )


def _csv_value(value: Any) -> Any:
    if isinstance(value, (list, dict)):
        return json.dumps(value, sort_keys=True)
    return value


def _write_csv(path: Path, rows: list[dict]) -> None:
    if not rows:
        path.write_text("", encoding="utf-8")
        return
    fieldnames = list(dict.fromkeys(key for row in rows for key in row))
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(
            {key: _csv_value(row.get(key)) for key in fieldnames} for row in rows
        )


def run_evaluation_suite(
    output_dir: Path = DEFAULT_OUTPUT,
    *,
    seed: int = 20260911,
    false_alert_trials: int = 30,
    attribution_repeats: int = 5,
    performance_iterations: int = 30,
) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)

    scenarios = scenario_outcomes(seed)
    personalization = baseline_personalization(seed)
    persistence = persistence_comparison(seed)
    multi_signal = multi_signal_comparison(seed)
    critical = critical_override_results(seed)
    shadow = shadow_mode_result(seed)
    groq = groq_independence_result(seed)
    false_alert_summary, false_alert_rows = false_alert_evaluation(
        seed, false_alert_trials
    )
    attribution_summary, attribution_rows = shap_attribution_evaluation(
        seed, attribution_repeats
    )
    performance_summary, performance_rows = performance_evaluation(
        seed, performance_iterations
    )

    critical_passes = sum(1 for row in critical if row["passed"])
    summary = {
        "evaluation_version": EVALUATION_VERSION,
        "scenario_version": SCENARIO_VERSION,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "seed": seed,
        "classification": {
            "software_correctness": True,
            "ml_proof_of_concept": True,
            "performance": True,
            "security": False,
            "reliability": True,
            "clinical_validation": False,
        },
        "headline_results": {
            "scenario_count": len(scenarios),
            "baseline_personalization_z_ratio": round(
                personalization[0]["z_score"] / personalization[1]["z_score"], 4
            ),
            "critical_override_passes": critical_passes,
            "critical_override_cases": len(critical),
            "critical_override_rate": critical_passes / len(critical),
            "false_alert_rate": false_alert_summary["false_alert_rate"],
            "attribution_top_1_rate": attribution_summary["top_1_rate"],
            "attribution_top_3_rate": attribution_summary["top_3_rate"],
            "attribution_methods": attribution_summary["methods_observed"],
            "shadow_mode_passed": shadow["passed"],
            "groq_independence_passed": groq["passed"],
            "performance_mean_ms": performance_summary["mean_ms"],
            "performance_median_ms": performance_summary["median_ms"],
            "performance_p95_ms": performance_summary["p95_ms"],
        },
        "model_artifact": {
            key: model_status().get(key)
            for key in (
                "available",
                "model_version",
                "schema_version",
                "operating_threshold",
                "selected_model",
            )
        },
        "limitations": [
            "Scenario labels are synthetic fixtures, not clinical ground truth.",
            "The committed ML target is a threshold-derived six-hour proxy outcome.",
            "Attribution describes model feature contribution and is not causal explanation.",
            "Performance uses SQLite in-memory on one development workstation, not production hosting.",
            "False-alert estimates cover generated normal sequences and do not estimate a clinical population rate.",
            "No clinician-led calibration or clinical validation is claimed.",
        ],
    }
    methodology = {
        "evaluation_version": EVALUATION_VERSION,
        "seed": seed,
        "scenario_version": SCENARIO_VERSION,
        "data": "Synthetic, fixed-seed observations only; no patient-identifiable data.",
        "system_under_test": (
            "Shared ingestion, baseline-v2, early warning, canonical-risk-v1, "
            "the installed versioned ML artifact, and its attribution implementation."
        ),
        "false_alert_trials": false_alert_trials,
        "attribution_repeats_per_abnormality": attribution_repeats,
        "performance_iterations": performance_iterations,
        "performance_warmup_iterations": 1,
        "notes": [
            "Controlled ML outputs are used only for the shadow-governance experiment.",
            "Groq is never called; the independence test installs a fail-if-called stub.",
            "All other ML probabilities, anomaly signals, and attributions use the installed artifact.",
        ],
    }

    csv_outputs = {
        "scenario_outcomes.csv": scenarios,
        "baseline_personalization.csv": personalization,
        "persistence_comparison.csv": persistence,
        "multi_signal_comparison.csv": multi_signal,
        "critical_override.csv": critical,
        "false_alert_trials.csv": false_alert_rows,
        "shap_attribution.csv": attribution_rows,
        "performance_samples.csv": performance_rows,
    }
    json_outputs = {
        "summary.json": summary,
        "methodology.json": methodology,
        "shadow_mode.json": shadow,
        "groq_independence.json": groq,
        "false_alert_summary.json": false_alert_summary,
        "shap_attribution_summary.json": attribution_summary,
        "performance_summary.json": performance_summary,
    }
    for filename, rows in csv_outputs.items():
        _write_csv(output_dir / filename, rows)
    for filename, value in json_outputs.items():
        _write_json(output_dir / filename, value)

    manifest = {
        "evaluation_version": EVALUATION_VERSION,
        "output_directory": str(output_dir.resolve()),
        "files": sorted([*csv_outputs, *json_outputs]),
    }
    _write_json(output_dir / "manifest.json", manifest)
    return manifest
