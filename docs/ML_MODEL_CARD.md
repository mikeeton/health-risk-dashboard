# Health-risk model card and dataset contract

## Selected outcome

The deployed research artifact predicts a genuinely observed critical vital
event in the following six-hour window: SpO2 below 90%, heart rate below 40 or
above 140 bpm, systolic blood pressure at least 180 mmHg, or diastolic blood
pressure at least 120 mmHg. It is not trained from the application's risk score.

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

Prepare it with `python scripts/prepare_physionet_2012.py`.

## Training

```powershell
cd backend
.\venv\Scripts\python.exe scripts\train_ml_models.py `
  --dataset data\physionet-2012\train.csv `
  --dataset-name "PhysioNet/CinC Challenge 2012 Set A v1.0.0" `
  --source-url "https://physionet.org/content/challenge-2012/1.0.0/" `
  --outcome-definition "Critical vital event in the following six-hour window" `
  --external-dataset data\physionet-2012\external.csv `
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
