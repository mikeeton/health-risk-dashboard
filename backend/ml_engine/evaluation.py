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
)


def classification_metrics(y_true, probabilities, threshold: float = 0.5) -> dict:
    y_true = np.asarray(y_true, dtype=int)
    probabilities = np.asarray(probabilities, dtype=float)
    predicted = (probabilities >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, predicted, labels=[0, 1]).ravel()
    fraction_positive, mean_predicted = calibration_curve(
        y_true, probabilities, n_bins=min(10, max(2, len(y_true) // 5)), strategy="quantile"
    )
    return {
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
        "calibration": [
            {"predicted": float(predicted_value), "observed": float(observed_value)}
            for predicted_value, observed_value in zip(mean_predicted, fraction_positive)
        ],
    }


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

