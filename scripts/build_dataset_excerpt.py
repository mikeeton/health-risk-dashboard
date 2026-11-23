"""Render an exact, labelled excerpt of the prepared Set A CSV for the dissertation."""

import csv
import hashlib
import html
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "backend/data/physionet-2012/train.csv"
OUT = ROOT / "docs/dissertation/graphs-reproduced"
OUT.mkdir(parents=True, exist_ok=True)
with SOURCE.open(newline="", encoding="utf-8") as file:
    reader = csv.DictReader(file)
    rows = [next(reader) for _ in range(5)]
columns = [
    ("patient_id", "Patient ID", 250),
    ("timestamp", "Six-hour bin timestamp", 580),
    ("heart_rate", "HR", 190),
    ("spo2", "SpO2", 170),
    ("systolic_bp", "Systolic BP", 260),
    ("diastolic_bp", "Diastolic BP", 280),
    ("target", "Proxy label", 240),
]
W, H = 2300, 950
parts = [
    f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><rect width="{W}" height="{H}" fill="white"/>'
]


def text(x, y, value, size=42, color="#17334b", bold=False):
    parts.append(
        f'<text x="{x}" y="{y}" font-family="Arial" font-size="{size}" font-weight="{700 if bold else 400}" fill="{color}">{html.escape(str(value))}</text>'
    )


parts.append('<rect x="70" y="70" width="420" height="64" rx="13" fill="#e6f4f2"/>')
text(94, 116, "PREPROCESSED DATA", 37, "#087e78", True)
text(70, 205, "PhysioNet/CinC Challenge 2012 · prepared Set A CSV", 52, "#17334b", True)
text(70, 268, "Actual rows from backend/data/physionet-2012/train.csv", 32, "#526475")
x = 70
for key, label, width in columns:
    parts.append(
        f'<rect x="{x}" y="325" width="{width}" height="82" fill="#edf4f7" stroke="#ccdbe3"/>'
    )
    text(x + 15, 377, label, 30, "#17334b", True)
    x += width
for i, row in enumerate(rows):
    y = 407 + i * 84
    x = 70
    for key, label, width in columns:
        parts.append(
            f'<rect x="{x}" y="{y}" width="{width}" height="84" fill="{"white" if i % 2 == 0 else "#f7fafb"}" stroke="#d8e2e8"/>'
        )
        text(x + 15, y + 55, row[key] if row[key] else "—", 33, "#253f52")
        x += width
text(
    70,
    885,
    "Selected columns only; blank source fields are shown as —. Six-hour timestamps are derived bins, not raw observation times.",
    28,
    "#526475",
)
svg = OUT / "fig_03_01_preprocessed_csv.svg"
svg.write_text("".join(parts) + "</svg>", encoding="utf-8")
digest = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
(OUT / "fig_03_01_source.txt").write_text(
    f"Source: {SOURCE.relative_to(ROOT)}\nSHA-256: {digest}\nRows: first five data rows in file order\nColumns: "
    + ", ".join(k for k, _, _ in columns)
    + "\nBlank cells displayed as an em dash; no nonblank values changed.\n",
    encoding="utf-8",
)
renderer = shutil.which("soffice") or (
    r"C:\Program Files\LibreOffice\program\soffice.exe"
    if Path(r"C:\Program Files\LibreOffice\program\soffice.exe").exists()
    else None
)
if renderer:
    png = svg.with_suffix(".png")
    if png.exists():
        png.unlink()
    subprocess.run(
        [
            renderer,
            f"-env:UserInstallation={(ROOT / '.tmp/lo_dataset_excerpt').resolve().as_uri()}",
            "--headless",
            "--convert-to",
            "png",
            "--outdir",
            str(OUT),
            str(svg),
        ],
        check=True,
    )
    if not png.exists():
        raise RuntimeError("PNG export did not complete")
print(svg, digest)
