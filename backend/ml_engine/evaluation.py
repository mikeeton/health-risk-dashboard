from __future__ import annotations

import numpy as np
from sklearn.calibration import calibration_curve
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
    precision_recall_curve,
)


def classification_metrics(y_true, probabilities, threshold: float = 0.5, *, include_curves: bool = False) -> dict:
    y_true = np.asarray(y_true, dtype=int)
    probabilities = np.asarray(probabilities, dtype=float)
    predicted = (probabilities >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, predicted, labels=[0, 1]).ravel()
    fraction_positive, mean_predicted = calibration_curve(
        y_true, probabilities, n_bins=min(10, max(2, len(y_true) // 5)), strategy="quantile"
    )
    report = {
        "accuracy": float(accuracy_score(y_true, predicted)),
        "precision": float(precision_score(y_true, predicted, zero_division=0)),
        "recall_sensitivity": float(recall_score(y_true, predicted, zero_division=0)),
        "specificity": float(tn / (tn + fp)) if tn + fp else 0.0,
        "f1": float(f1_score(y_true, predicted, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_true, probabilities)) if len(set(y_true)) > 1 else None,
        "pr_auc": float(average_precision_score(y_true, probabilities)),
        "brier_score": float(brier_score_loss(y_true, probabilities)),
        "threshold": threshold,
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
        "observed_positive_rate": float(y_true.mean()) if len(y_true) else None,
        "hypothetical_positive_prompts_per_1000_windows": float((tp + fp) / len(y_true) * 1000) if len(y_true) else None,
        "false_positive_prompts_per_1000_windows": float(fp / len(y_true) * 1000) if len(y_true) else None,
        "calibration": [
            {"predicted": float(predicted_value), "observed": float(observed_value)}
            for predicted_value, observed_value in zip(mean_predicted, fraction_positive)
        ],
    }
    if include_curves:
        def sampled(points):
            indices = np.unique(np.linspace(0, len(points) - 1, min(120, len(points)), dtype=int))
            return indices

        if len(set(y_true)) > 1:
            false_positive_rate, true_positive_rate, _ = roc_curve(y_true, probabilities)
            report["roc_curve"] = [
                {"false_positive_rate": float(false_positive_rate[i]), "true_positive_rate": float(true_positive_rate[i])}
                for i in sampled(false_positive_rate)
            ]
        precision, recall, _ = precision_recall_curve(y_true, probabilities)
        report["precision_recall_curve"] = [
            {"recall": float(recall[i]), "precision": float(precision[i])}
            for i in sampled(precision)
        ]
    return report


def fairness_metrics(y_true, probabilities, groups, threshold: float = 0.5) -> dict:
    y_true = np.asarray(y_true)
    probabilities = np.asarray(probabilities)
    groups = np.asarray(groups).astype(str)
    report = {}
    for group in sorted(set(groups)):
        mask = groups == group
        if int(mask.sum()) < 5:
            report[group] = {"count": int(mask.sum()), "status": "insufficient_sample"}
            continue
        metrics = classification_metrics(y_true[mask], probabilities[mask], threshold)
        report[group] = {
            "count": int(mask.sum()),
            "positive_prediction_rate": float((probabilities[mask] >= threshold).mean()),
            "recall_sensitivity": metrics["recall_sensitivity"],
            "specificity": metrics["specificity"],
        }
    valid = [value for value in report.values() if "recall_sensitivity" in value]
    return {
        "groups": report,
        "max_recall_gap": (
            max(item["recall_sensitivity"] for item in valid)
            - min(item["recall_sensitivity"] for item in valid)
            if len(valid) > 1
            else None
        ),
        "warning": "Subgroup metrics describe this evaluation dataset and do not prove fairness.",
    }


def patient_bootstrap_intervals(y_true, probabilities, patient_ids, threshold: float, *, iterations: int = 200, seed: int = 2026) -> dict:
    """95% percentile intervals from resampling patients, never individual rows."""
    y_true = np.asarray(y_true, dtype=int)
    probabilities = np.asarray(probabilities, dtype=float)
    patient_ids = np.asarray(patient_ids)
    patients = np.unique(patient_ids)
    rng = np.random.default_rng(seed)
    samples: dict[str, list[float]] = {name: [] for name in ("roc_auc", "pr_auc", "precision", "recall_sensitivity")}
    row_indices = {patient: np.flatnonzero(patient_ids == patient) for patient in patients}
    for _ in range(iterations):
        chosen = rng.choice(patients, size=len(patients), replace=True)
        indices = np.concatenate([row_indices[patient] for patient in chosen])
        labels = y_true[indices]
        if len(np.unique(labels)) < 2:
            continue
        scores = probabilities[indices]
        predicted = scores >= threshold
        samples["roc_auc"].append(float(roc_auc_score(labels, scores)))
        samples["pr_auc"].append(float(average_precision_score(labels, scores)))
        samples["precision"].append(float(precision_score(labels, predicted, zero_division=0)))
        samples["recall_sensitivity"].append(float(recall_score(labels, predicted, zero_division=0)))
    return {
        "method": "patient-level bootstrap percentile 95% interval",
        "requested_iterations": iterations,
        "patients": len(patients),
        "metrics": {
            name: {
                "lower": float(np.quantile(values, 0.025)),
                "upper": float(np.quantile(values, 0.975)),
                "valid_iterations": len(values),
            } if values else None
            for name, values in samples.items()
        },
    }

