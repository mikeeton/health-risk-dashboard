# Health-risk model card and dataset contract

## Selected outcome

The currently installed `physionet-critical-v1` research artifact was trained
from the **legacy forward-filled next-bin proxy**. Its saved metrics must not
be described as results for the newer observed-next-window policy. The
preparation script now offers that newer policy: a next six-hour bin with a
newly observed heart rate below 40 or above 140 bpm, systolic blood pressure
at least 180 mmHg, or diastolic blood pressure at least 120 mmHg. Bins without
any observed next-bin HR/BP are excluded. A negative row only means no event
among the observed fields; it does not establish that every vital was normal.
Neither policy is a clinically adjudicated outcome or outpatient validation.
The target is not trained from the application's risk score.

## Required CSV columns

`patient_id,timestamp,heart_rate,spo2,systolic_bp,diastolic_bp,steps,sleep_hours,active_minutes,calories,target`

Optional fairness fields include `gender` and `age_group`. Each patient must
have multiple chronologically ordered observations. Patients, rather than rows,
are separated between training, validation, and testing.

## Public dataset

The project uses PhysioNet/CinC Challenge 2012 v1.0.0 Sets A and B. The source
contains timestamped measurements from adult ICU stays. Set A is used for
patient-separated training/validation/testing and Set B is an independent
external check. The project records the source URL, prepared-data SHA-256,
outcome definition, model version, and creation time in the artifact. Fields not
present in PhysioNet (steps, sleep, activity, calories) remain missing.

The source records contain `SaO2` (arterial oxygen saturation), not wearable
`SpO2`; the preparation script intentionally leaves `spo2` missing rather than
equating these measurements. The current artifact therefore cannot support an
oxygen-based performance claim. Prepare an observed-target research cohort with
`python scripts/prepare_physionet_2012.py --output data/physionet-2012-observed`.
Its `manifest.json` records source and CSV hashes, cohort size, missingness and
the outcome policy. Preserve `data/physionet-2012/` and the installed artifact.
The observed-target preparation excludes non-numeric or out-of-range HR/BP
values before constructing labels (notably zero-valued source records) and
carries input features forward for no more than two later six-hour bins.

## Training

```powershell
cd backend
.\venv\Scripts\python.exe scripts\train_ml_models.py `
  --dataset data\physionet-2012-observed\train.csv `
  --dataset-name "PhysioNet/CinC Challenge 2012 Set A v1.0.0" `
  --source-url "https://physionet.org/content/challenge-2012/1.0.0/" `
  --outcome-definition "Observed HR/BP critical proxy in next six-hour bin" `
  --external-dataset data\physionet-2012-observed\external.csv `
  --dataset-manifest data\physionet-2012-observed\manifest.json `
  --output artifacts\ml-observed-v1 `
  --version physionet-observed-hrbp-v1
```

Use a new output directory: training refuses to overwrite an existing model.
The command performs feature engineering, five disjoint patient-grouped subsets
(fit, model selection, calibration, threshold choice and held-out test), candidate
model comparison, probability calibration, Isolation Forest fitting, test-set
evaluation, subgroup evaluation, optional external validation, and artifact
versioning. The API only loads the model when both `model.joblib` and
`evaluation.json` are present and share the same schema version.

The observed-target candidate was trained on 19 October 2026 and saved in
`artifacts/ml-observed-v1`. Held-out sensitivity is 0.585, below the configured
0.60 gate, and held-out precision is 0.0194. It is **not approved for
inference** and was not promoted to the installed `artifacts/ml` path. The
installed model remains a legacy research proxy. The analytics workspace
presents the two artifacts separately. See [the validation report](reports/ML_PIPELINE_VALIDATION_REPORT.md)
for hashes, complete results and patient-bootstrap intervals.

## Metrics and limitations

The evaluation artifact includes accuracy, precision, sensitivity/recall,
specificity, F1, ROC-AUC, PR-AUC, Brier score, a confusion matrix, calibration
points, subgroup gaps, and external-validation results. These values apply only
to the named outcome and population. They do not establish clinical efficacy.

Critical SpO2, heart-rate, and blood-pressure readings bypass model inference
and continue through deterministic escalation rules.

Runtime shadow predictions use a separate observed-field outcome record. An expired
six-hour window with no recorded in-window follow-up remains unresolved. A
negative is recorded only after an observed, non-critical follow-up in the
window; a delayed critical reading can correct that proxy negative. Manually
adjudicated records are not silently overwritten by automatic reconciliation.
Existing shadow classifications created before this policy change need a
source-timestamp review before prospective analysis.

Local explanations explicitly state whether genuine SHAP was available or a
coefficient/feature-importance fallback was used. The restricted global SHAP
view aggregates only records marked `SHAP` and reports excluded fallback
records separately. A single-record outlier score must not be described as
population-level drift without a suitable reference cohort and monitoring
window.
