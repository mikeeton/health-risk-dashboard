"""Generate versioned SVG/JSON evidence from the installed evaluation artifact."""
from __future__ import annotations
import argparse, html, json, sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

sys.path.append(str(Path(__file__).resolve().parents[1]))
from ml_engine.features import ENGINEERED_FEATURES, engineer_features


def svg_bars(title, labels, values, output, color="#2563eb"):
    width, row, margin = 900, 42, 240
    height = 90 + row * len(labels)
    maximum = max(values or [1]) or 1
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" role="img" aria-label="{html.escape(title)}"><rect width="100%" height="100%" fill="white"/><text x="24" y="38" font-family="Arial" font-size="24" font-weight="700">{html.escape(title)}</text>']
    for index, (label, value) in enumerate(zip(labels, values)):
        y = 70 + index * row; bar = (width-margin-80) * value / maximum
        parts += [f'<text x="24" y="{y+20}" font-family="Arial" font-size="14">{html.escape(str(label))}</text>', f'<rect x="{margin}" y="{y}" width="{bar:.1f}" height="24" rx="5" fill="{color}"/>', f'<text x="{margin+bar+8:.1f}" y="{y+18}" font-family="Arial" font-size="13">{value:.4f}</text>']
    parts.append('</svg>'); Path(output).write_text("".join(parts), encoding="utf-8")


def main():
    parser=argparse.ArgumentParser(); parser.add_argument("--evaluation", default="artifacts/ml/evaluation.json"); parser.add_argument("--model", default="artifacts/ml/model.joblib"); parser.add_argument("--dataset"); parser.add_argument("--global-shap"); parser.add_argument("--output-dir", required=True); args=parser.parse_args()
    report=json.loads(Path(args.evaluation).read_text(encoding="utf-8")); out=Path(args.output_dir); out.mkdir(parents=True, exist_ok=True)
    matrix=report["test_metrics"]["confusion_matrix"]; svg_bars("Confusion matrix counts", list(matrix), [matrix[key] for key in matrix], out/"confusion-matrix.svg", "#7c3aed")
    calibration=report["test_metrics"]["calibration"]; svg_bars("Calibration: observed event rate by probability bin", [f"Predicted {item['predicted']:.3f}" for item in calibration], [item["observed"] for item in calibration], out/"calibration.svg", "#059669")
    fairness=report.get("fairness", {}); (out/"fairness-table.json").write_text(json.dumps(fairness, indent=2), encoding="utf-8")
    if args.dataset:
        import shap
        bundle=joblib.load(args.model); frame=engineer_features(pd.read_csv(args.dataset)); sample=frame[ENGINEERED_FEATURES].sample(min(100,len(frame)),random_state=42); pipeline=bundle["explanation_pipeline"]; transformed=pipeline[:-1].transform(sample); explanation=shap.Explainer(pipeline.named_steps["model"],bundle["explanation_background"])(transformed); values=np.asarray(explanation.values)
        if values.ndim == 3: values=values[:,:,1]
        means=np.mean(np.abs(values),axis=0); order=np.argsort(means)[::-1][:15]; features=[{"feature":ENGINEERED_FEATURES[index],"mean_absolute_shap":float(means[index]),"observations":len(sample)} for index in order]
        shap_report={"model_version":report["model_version"],"method":"mean absolute SHAP over deterministic evaluation sample","features":features,"warning":"SHAP describes model behaviour, not causation."}; (out/"global-shap.json").write_text(json.dumps(shap_report,indent=2),encoding="utf-8"); svg_bars("Global SHAP: mean absolute contribution",[item["feature"] for item in features],[item["mean_absolute_shap"] for item in features],out/"global-shap.svg")
    elif args.global_shap and Path(args.global_shap).exists():
        shap=json.loads(Path(args.global_shap).read_text(encoding="utf-8")); features=shap.get("features", [])[:15]; svg_bars("Global SHAP: mean absolute contribution", [item["feature"] for item in features], [item["mean_absolute_shap"] for item in features], out/"global-shap.svg")
    manifest={"model_version":report["model_version"],"dataset_sha256":report["dataset"]["sha256"],"generated_files":[item.name for item in out.iterdir()],"warning":"Figures describe retrospective research evaluation, not clinical effectiveness."}; (out/"figure-manifest.json").write_text(json.dumps(manifest,indent=2),encoding="utf-8")


if __name__ == "__main__": main()
