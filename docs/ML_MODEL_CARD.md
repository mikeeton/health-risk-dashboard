# Health-risk model card and dataset contract

## Intended outcome

The training target must be a binary, prospectively defined outcome. A value of
`1` must mean that the documented outcome occurred inside the specified time
horizon. It must not be created from the application's existing risk score,
because doing so would train the model to reproduce its own rule engine.

## Required CSV columns

`patient_id,timestamp,heart_rate,spo2,systolic_bp,diastolic_bp,steps,sleep_hours,active_minutes,calories,target`

Optional fairness fields include `gender` and `age_group`. Each patient must
have multiple chronologically ordered observations. Patients, rather than rows,
are separated between training, validation, and testing.

## Public datasets

The project records the dataset name, canonical source URL, SHA-256 checksum,
outcome definition, model version, and creation time in every artifact. The
[UCI MHEALTH dataset](https://archive.ics.uci.edu/dataset/319/mhealth%2Bdataset.)
is a suitable public wearable-data benchmark for activity-recognition work and
is licensed CC BY 4.0. It does **not** contain the dashboard's full vital schema
or a clinical-deterioration outcome, so it must not be silently relabelled or
used to claim deterioration performance.

To train the operational model, supply a public dataset that genuinely contains
the declared outcome and compatible inputs, or an approved mapped extract whose
missing fields and mapping decisions are documented. This safeguard prevents a
technically successful but scientifically invalid model.

## Training

```powershell
cd backend
.\venv\Scripts\python.exe scripts\train_ml_models.py `
  --dataset data\wearable_outcomes.csv `
  --dataset-name "Dataset name and release" `
  --source-url "https://canonical-public-source.example/dataset" `
  --outcome-definition "Outcome within N hours" `
  --external-dataset data\independent_validation.csv `
  --output artifacts\ml
```

The command performs feature engineering, patient-grouped splitting, candidate
model comparison, probability calibration, Isolation Forest fitting, test-set
evaluation, subgroup evaluation, optional external validation, and artifact
versioning. The API only loads the model when both `model.joblib` and
`evaluation.json` are present and share the same schema version.

## Metrics and limitations

The evaluation artifact includes accuracy, precision, sensitivity/recall,
specificity, F1, ROC-AUC, PR-AUC, Brier score, a confusion matrix, calibration
points, subgroup gaps, and external-validation results. These values apply only
to the named outcome and population. They do not establish clinical efficacy.

Critical SpO2, heart-rate, and blood-pressure readings bypass model inference
and continue through deterministic escalation rules.

