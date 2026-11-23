"""Reproduce dissertation graphs from the installed legacy proxy model.

Run from repository root with the locked backend environment:
  python scripts/build_repository_graphs.py
This script scores the saved model; it never fits or recalibrates it.
"""

from __future__ import annotations

import csv
import hashlib
import html
import json
import platform
import shutil
import subprocess
import sys
from datetime import UTC, datetime
from itertools import pairwise
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.calibration import calibration_curve
from sklearn.metrics import (
    average_precision_score,
    confusion_matrix,
    precision_recall_curve,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import GroupShuffleSplit

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from ml_engine.features import ENGINEERED_FEATURES, engineer_features

OUT = ROOT / "docs/dissertation/graphs-reproduced"
OUT.mkdir(parents=True, exist_ok=True)
artifact = ROOT / "backend/artifacts/ml/model.joblib"
evaluation = ROOT / "backend/artifacts/ml/evaluation.json"
data_a = ROOT / "backend/data/physionet-2012/train.csv"
data_b = ROOT / "backend/data/physionet-2012/external.csv"
report = json.loads(evaluation.read_text())
model = joblib.load(artifact)["classifier"]
threshold = float(report["operating_threshold"])


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def write_csv(name, headers, rows):
    with (OUT / name).open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(headers)
        w.writerows(rows)


def esc(s):
    return html.escape(str(s))


NAVY = "#17334b"
BLUE = "#225da2"
TEAL = "#087e78"
GREY = "#607182"
GRID = "#d6e0e7"
RED = "#ad3d3d"


def txt(x, y, s, size=32, color=NAVY, weight="normal", anchor="start"):
    return f'<text x="{x}" y="{y}" fill="{color}" font-family="Arial" font-size="{size}" font-weight="{weight}" text-anchor="{anchor}">{esc(s)}</text>'


def svg(name, items, w=2400, h=1400):
    p = OUT / (name + ".svg")
    p.write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><rect width="{w}" height="{h}" fill="white"/>'
        + "".join(items)
        + "</svg>",
        encoding="utf-8",
    )


def axis(a, x, y, w, h, xlabel, ylabel, xmax=1.0, ymax=1.0):
    a.append(
        f'<path d="M{x} {y}V{y - h}M{x} {y}H{x + w}" fill="none" stroke="{NAVY}" stroke-width="3"/>'
    )
    for i in range(6):
        xx = x + w * i / 5
        yy = y - h * i / 5
        a.append(f'<path d="M{x} {yy}H{x + w}" stroke="{GRID}" stroke-width="2"/>')
        a.append(
            txt(
                xx,
                y + 43,
                f"{xmax * i / 5:.2f}" if xmax < 1 else f"{xmax * i / 5:.1f}",
                24,
                GREY,
                anchor="middle",
            )
        )
        a.append(
            txt(
                x - 25,
                yy + 8,
                f"{ymax * i / 5:.2f}" if ymax < 1 else f"{ymax * i / 5:.1f}",
                24,
                GREY,
                anchor="end",
            )
        )
    a.append(txt(x + w / 2, y + 100, xlabel, 31, anchor="middle"))
    a.append(
        f'<text x="{x - 108}" y="{y - h / 2}" transform="rotate(-90 {x - 108} {y - h / 2})" fill="{NAVY}" font-family="Arial" font-size="29" text-anchor="middle">{esc(ylabel)}</text>'
    )


def coords(points, x, y, w, h):
    return " ".join(
        f"{x + float(px) * w:.2f},{y - float(py) * h:.2f}" for px, py in points
    )


scores = {}
audit = {}
for name, path, baseline in [
    ("Set A test", data_a, report["test_metrics"]),
    ("Set B", data_b, report["external_validation"]["metrics"]),
]:
    frame = engineer_features(pd.read_csv(path))
    if name == "Set A test":
        split = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
        _, idx = next(split.split(frame, frame["target"], groups=frame["patient_id"]))
        frame = frame.iloc[idx].copy()
    keys = frame[["patient_id", "timestamp"]].astype(str).agg("|".join, axis=1)
    assert keys.is_unique, f"duplicate patient/time keys in {name}"
    y = frame["target"].astype(int).to_numpy()
    p = model.predict_proba(frame[ENGINEERED_FEATURES])[:, 1]
    assert np.isfinite(p).all() and ((p >= 0) & (p <= 1)).all()
    tn, fp, fn, tp = confusion_matrix(y, p >= threshold, labels=[0, 1]).ravel()
    cm = {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)}
    roc = float(roc_auc_score(y, p))
    ap = float(average_precision_score(y, p))
    assert (
        cm == baseline["confusion_matrix"]
        and abs(roc - baseline["roc_auc"]) < 1e-10
        and abs(ap - baseline["pr_auc"]) < 1e-10
    ), f"{name} does not match saved evaluation"
    scores[name] = (y, p)
    audit[name] = {
        "rows": len(y),
        "positives": int(y.sum()),
        "negatives": int((1 - y).sum()),
        "probability_min": float(p.min()),
        "probability_max": float(p.max()),
        "confusion_matrix": cm,
        "roc_auc": roc,
        "average_precision": ap,
        "source_sha256": sha(path),
    }
    fpr, tpr, _ = roc_curve(y, p)
    precision, recall, _ = precision_recall_curve(y, p)
    write_csv(
        ("set_a" if name == "Set A test" else "set_b") + "_roc_points.csv",
        ["false_positive_rate", "true_positive_rate"],
        zip(fpr, tpr),
    )
    write_csv(
        ("set_a" if name == "Set A test" else "set_b") + "_pr_points.csv",
        ["recall", "precision"],
        zip(recall[::-1], precision[::-1]),
    )
    scores[name] += (fpr, tpr, precision, recall)

# Combined empirical ROC and precision-recall curves.
a = [
    txt(120, 95, "ROC and precision–recall", 61, weight="bold"),
    txt(
        120,
        150,
        "Original forward-filled next-bin threshold proxy · retrospective ICU data",
        32,
        GREY,
    ),
]
panels = [
    (210, 1090, "False-positive rate", "True-positive rate"),
    (1380, 1090, "Recall", "Precision"),
]
for x, y, xl, yl in panels:
    axis(a, x, y, 800, 750, xl, yl)
a.append(txt(600, 240, "ROC", 43, weight="bold", anchor="middle"))
a.append(txt(1780, 240, "Precision–recall", 43, weight="bold", anchor="middle"))
a.append(
    f'<path d="M210 1090L1010 340" stroke="{GREY}" stroke-width="3" stroke-dasharray="13 10" fill="none"/>'
)
for name, color, dash in [
    ("Set A test", BLUE, ""),
    ("Set B", TEAL, 'stroke-dasharray="16 8"'),
]:
    y, p, fpr, tpr, precision, recall = scores[name]
    a.append(
        f'<polyline points="{coords(zip(fpr, tpr), 210, 1090, 800, 750)}" fill="none" stroke="{color}" stroke-width="5" {dash}/>'
    )
    pr = list(zip(recall[::-1], precision[::-1]))
    segments = [f"M{1380 + pr[0][0] * 800:.2f} {1090 - pr[0][1] * 750:.2f}"]
    for _, (r1, p1) in pairwise(pr):
        segments.append(f"H{1380 + r1 * 800:.2f}V{1090 - p1 * 750:.2f}")
    a.append(
        f'<path d="{"".join(segments)}" fill="none" stroke="{color}" stroke-width="5" {dash}/>'
    )
    base = float(y.mean())
    by = 1090 - base * 750
    a.append(
        f'<path d="M1380 {by}H2180" stroke="{color}" stroke-width="2" stroke-dasharray="6 9"/>'
    )
    pred = p >= threshold
    fp = int(((pred == 1) & (y == 0)).sum())
    tn = int(((pred == 0) & (y == 0)).sum())
    tp = int(((pred == 1) & (y == 1)).sum())
    fn = int(((pred == 0) & (y == 1)).sum())
    rx = 210 + 800 * fp / (fp + tn)
    ry = 1090 - 750 * tp / (tp + fn)
    px = 1380 + 800 * tp / (tp + fn)
    py = 1090 - 750 * tp / (tp + fp)
    for xx, yy in [(rx, ry), (px, py)]:
        a.append(
            f'<circle cx="{xx:.2f}" cy="{yy:.2f}" r="12" fill="white" stroke="{color}" stroke-width="5"/>'
        )
for idx, (name, color, dash) in enumerate(
    [("Set A test", BLUE, ""), ("Set B", TEAL, 'stroke-dasharray="16 8"')]
):
    a.append(
        f'<path d="M{250 + idx * 930} 1255H{325 + idx * 930}" stroke="{color}" stroke-width="6" {dash}/>'
    )
    a.append(
        txt(
            340 + idx * 930,
            1265,
            f"{name}: ROC-AUC {audit[name]['roc_auc']:.3f}; AP {audit[name]['average_precision']:.3f}",
            29,
        )
    )
a.append(
    txt(
        120,
        1350,
        "Open circles: operating threshold 0.014. PR dashed lines: observed positive rates.",
        26,
        GREY,
    )
)
svg("fig_06_01_roc_pr", a)

# Internal confusion matrix from the exact scored rows.
cm = audit["Set A test"]["confusion_matrix"]
a = [
    txt(130, 110, "Internal test confusion matrix", 58, weight="bold"),
    txt(130, 165, "Original proxy · threshold 0.014 · n = 5,600", 30, GREY),
]
for j, label in enumerate(["Predicted negative", "Predicted positive"]):
    a.append(txt(900 + j * 620, 285, label, 34, weight="bold", anchor="middle"))
for i, label in enumerate(["Actual negative", "Actual positive"]):
    a.append(txt(135, 525 + i * 440, label, 34, weight="bold"))
for i, row in enumerate([["tn", "fp"], ["fn", "tp"]]):
    for j, key in enumerate(row):
        x = 590 + j * 620
        y = 335 + i * 440
        a.append(
            f'<rect x="{x}" y="{y}" width="570" height="370" rx="22" fill="#f3f8fa" stroke="{GRID}" stroke-width="3"/>'
        )
        a.append(
            txt(
                x + 285,
                y + 185,
                f"{cm[key]:,}",
                100,
                RED if key in ("fp", "fn") else TEAL,
                "bold",
                "middle",
            )
        )
        a.append(
            txt(
                x + 285,
                y + 265,
                {
                    "tn": "True negative",
                    "fp": "False positive",
                    "fn": "False negative",
                    "tp": "True positive",
                }[key],
                31,
                GREY,
                anchor="middle",
            )
        )
svg("fig_06_02_confusion_matrix", a)

# Calibration: original quantile-bin rule; no invented smoothing.
a = [
    txt(125, 95, "Internal test calibration", 59, weight="bold"),
    txt(125, 150, "Ten quantile bins of the original proxy predictions", 31, GREY),
]
axis(
    a,
    330,
    1100,
    900,
    800,
    "Mean predicted probability",
    "Observed proxy-positive fraction",
    0.1,
    0.1,
)
y, p = scores["Set A test"][:2]
obs, mean = calibration_curve(y, p, n_bins=10, strategy="quantile")
points = list(zip(mean, obs))
a.append(
    f'<path d="M330 1100L1230 300" stroke="{GREY}" stroke-width="3" stroke-dasharray="14 10"/>'
)
a.append(
    f'<polyline points="{coords(((x / 0.1, z / 0.1) for x, z in points), 330, 1100, 900, 800)}" fill="none" stroke="{BLUE}" stroke-width="5"/>'
)
for px, py in points:
    a.append(
        f'<circle cx="{330 + px / 0.1 * 900:.2f}" cy="{1100 - py / 0.1 * 800:.2f}" r="10" fill="{BLUE}"/>'
    )
bins = pd.qcut(pd.Series(p), q=10, labels=False, duplicates="drop")
counts = [int((bins == i).sum()) for i in range(int(bins.max()) + 1)]
write_csv(
    "fig_06_03_calibration_points.csv",
    ["bin", "count", "mean_predicted_probability", "observed_proxy_fraction"],
    [(i + 1, counts[i], float(px), float(py)) for i, (px, py) in enumerate(points)],
)
a.append(txt(1410, 420, "Dots: observed quantile bins", 32, BLUE))
a.append(txt(1410, 475, "Dashed line: ideal calibration", 32, GREY))
a.append(txt(1410, 560, "Each bin contains 560 rows.", 30, GREY))
svg("fig_06_03_calibration", a)

# Historical per-run latency distribution from saved 30 samples.
latpath = ROOT / "docs/dissertation-evidence/evaluation/performance_samples.csv"
lat = pd.read_csv(latpath)["duration_ms"].sort_values().to_numpy()
assert len(lat) == 30
write_csv(
    "fig_app_latency_ecdf_points.csv",
    ["duration_ms", "cumulative_fraction"],
    [(float(v), (i + 1) / len(lat)) for i, v in enumerate(lat)],
)
a = [
    txt(125, 100, "Sequential local latency distribution", 56, weight="bold"),
    txt(
        125,
        160,
        "30 timed runs · SQLite in memory · Windows 11 · September 2026",
        30,
        GREY,
    ),
]
axis(a, 300, 1100, 1000, 750, "Elapsed milliseconds", "Cumulative fraction", 240, 1)
maxms = 240
step = [(0, 0)]
for i, v in enumerate(lat):
    step.extend(
        [(float(v) / maxms, i / len(lat)), (float(v) / maxms, (i + 1) / len(lat))]
    )
a.append(
    f'<polyline points="{coords(step, 300, 1100, 1000, 750)}" fill="none" stroke="{BLUE}" stroke-width="5"/>'
)
a.append(txt(1450, 460, "Median 10.96 ms", 35, TEAL, "bold"))
a.append(txt(1450, 530, "p95 85.48 ms", 35, RED, "bold"))
a.append(
    txt(
        125,
        1320,
        "Original run timings; HTTP, browser and hosted network are outside this measurement.",
        27,
        GREY,
    )
)
svg("fig_app_latency_ecdf", a)

# Exact saved SHAP ranking, separately identified from coefficient fallbacks.
shpath = ROOT / "docs/evidence/global-shap.json"
sh = json.loads(shpath.read_text())
assert sh["model_version"] == report["model_version"] and sh["method"].startswith(
    "mean absolute SHAP"
)
values = sorted(sh["features"], key=lambda v: v["mean_absolute_shap"], reverse=True)[
    :10
]
write_csv(
    "fig_app_global_shap_points.csv",
    ["feature", "mean_absolute_shap", "observations"],
    [(v["feature"], v["mean_absolute_shap"], v["observations"]) for v in values],
)
a = [
    txt(125, 95, "Global SHAP feature influence", 58, weight="bold"),
    txt(
        125,
        150,
        "Installed model physionet-critical-v1 · deterministic evaluation sample (100 rows)",
        30,
        GREY,
    ),
]
top = values[0]["mean_absolute_shap"]
for i, v in enumerate(values):
    yy = 255 + i * 102
    text = v["feature"].replace("_", " ")
    a.append(txt(125, yy + 30, text, 29))
    ww = 1150 * v["mean_absolute_shap"] / top
    a.append(
        f'<rect x="720" y="{yy}" width="{ww:.2f}" height="52" rx="8" fill="{TEAL}"/>'
    )
    a.append(
        txt(745 + ww, yy + 38, f"{v['mean_absolute_shap']:.3f}", 28, weight="bold")
    )
a.append(
    txt(
        125,
        1350,
        "Mean absolute SHAP values describe model attribution, not clinical causation.",
        27,
        GREY,
    )
)
svg("fig_app_global_shap", a)

write_csv(
    "fig_06_02_confusion_counts.csv",
    ["actual", "predicted", "count"],
    [
        ["negative", "negative", cm["tn"]],
        ["negative", "positive", cm["fp"]],
        ["positive", "negative", cm["fn"]],
        ["positive", "positive", cm["tp"]],
    ],
)
status = subprocess.check_output(["git", "status", "--short"], cwd=ROOT, text=True)
manifest = {
    "generated_date": datetime.now(UTC).date().isoformat(),
    "revision": subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
    ).strip(),
    "working_tree_status": status.splitlines(),
    "model_id": report["model_version"],
    "model_sha256": sha(artifact),
    "evaluation_sha256": sha(evaluation),
    "evaluation_command": "python scripts/build_repository_graphs.py",
    "python": platform.python_version(),
    "pandas": pd.__version__,
    "numpy": np.__version__,
    "scikit_learn": sklearn.__version__,
    "cohorts": audit,
    "threshold_operator": ">=",
    "source_note": "Historical legacy forward-filled next-bin proxy. Original saved model scored without fitting or recalibration.",
    "unavailable": [
        "Observed native-vital plot: native timestamp/parameter/value records are not present locally."
    ],
}
renderer = shutil.which("soffice") or (
    r"C:\Program Files\LibreOffice\program\soffice.exe"
    if Path(r"C:\Program Files\LibreOffice\program\soffice.exe").exists()
    else None
)
if renderer:
    for image in OUT.glob("*.png"):
        image.unlink()
    profile = (ROOT / ".tmp/lo_repository_graph_export").resolve().as_uri()
    subprocess.run(
        [
            renderer,
            f"-env:UserInstallation={profile}",
            "--headless",
            "--convert-to",
            "png",
            "--outdir",
            str(OUT),
            *[str(p) for p in OUT.glob("*.svg")],
        ],
        check=True,
        stdout=subprocess.DEVNULL,
    )
    expected = {p.with_suffix(".png").name for p in OUT.glob("*.svg")}
    actual = {p.name for p in OUT.glob("*.png")}
    if not expected.issubset(actual):
        raise RuntimeError(f"PNG export missing: {expected - actual}")
    manifest["png_renderer"] = "LibreOffice SVG import/export"
else:
    manifest["png_renderer"] = "Unavailable; SVG exports retained"
(OUT / "SOURCE_MANIFEST.json").write_text(
    json.dumps(manifest, indent=2), encoding="utf-8"
)
print("Reconciled cohorts:", audit)
print("Wrote SVGs and points CSVs to", OUT)
