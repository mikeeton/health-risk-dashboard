# Dissertation evidence pack

This directory contains reproducible evidence for the Health Risk Dashboard dissertation. It does not contain clinical-validation or regulatory evidence.

## Evidence boundaries

- Model charts are generated from `backend/artifacts/ml/evaluation.json` or recorded SHAP exports.
- Interface screenshots are captured from the running application with seeded synthetic demonstration patients.
- Architecture diagrams explain the implemented code and deployment design; they are not experimental results.
- Synthetic demonstration data was not used to train the committed six-hour model.
- `approved_for_inference` is a software governance gate, not clinical or regulatory approval.

## Main sources

- `backend/artifacts/ml/evaluation.json`: locked retrospective evaluation and dataset hash.
- `backend/artifacts/ml/model.joblib`: versioned runtime artifact.
- `docs/dissertation/figures/`: dissertation-ready PNG figures and diagrams.
- `docs/dissertation/screenshots/`: real locally captured UI evidence using synthetic demo accounts.
- `figure-manifest.json`: machine-readable provenance for evidence artifacts.

Regenerate analytical figures with `python scripts/generate_dissertation_visuals.py`. Regenerate screenshots using `frontend/scripts/capture_dissertation_screenshots.mjs` while the local API and frontend are running.
