"""Verify the deployed readiness and authenticated ML evidence endpoints."""
from __future__ import annotations

import argparse
import json
import urllib.request


def fetch(url: str, token: str | None = None):
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=45) as response:
        return json.load(response)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--api-url", required=True)
    parser.add_argument("--token", help="Access token for the protected ML evaluation endpoints")
    args = parser.parse_args()
    base = args.api_url.rstrip("/")
    ready = fetch(f"{base}/health/ready")
    if ready.get("ml_model") != "approved" or not ready.get("ml_model_version"):
        raise SystemExit(f"ML readiness check failed: {ready}")
    print(f"Readiness passed: model {ready['ml_model_version']}")
    if args.token:
        evaluation = fetch(f"{base}/ml/evaluation", args.token)
        if not evaluation.get("available") or not evaluation.get("test_metrics"):
            raise SystemExit("Protected evaluation endpoint did not return approved metrics")
        print(
            "Evaluation passed: "
            f"ROC-AUC={evaluation['test_metrics'].get('roc_auc')}, "
            f"sensitivity={evaluation['test_metrics'].get('recall_sensitivity')}, "
            f"specificity={evaluation['test_metrics'].get('specificity')}"
        )


if __name__ == "__main__":
    main()
