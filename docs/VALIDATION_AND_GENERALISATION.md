# Validation and generalisation plan

The installed model was developed from ICU data. It must not be described as validated for ordinary outpatient or smartwatch populations.

## Required external cohort

A compatible cohort must contain longitudinal patient identifiers, timestamps, heart rate, oxygen saturation and blood pressure, plus a genuine label for a critical vital event within the following six hours. Device type, age group and gender should be retained where lawfully available. Missing measurements remain missing; they must not be invented.

Validate without retraining:

```powershell
backend\venv\Scripts\python.exe backend\scripts\validate_external_cohort.py `
  --dataset C:\secure-data\external-cohort.csv `
  --artifact-dir backend\artifacts\ml `
  --cohort-name "Independent outpatient cohort" `
  --output docs\evidence\external-validation.json
```

Review ROC-AUC, PR-AUC, sensitivity, specificity, calibration, false-negative rate, missingness shift and subgroup/device results. The runtime computes a maximum reference z-score. Three consecutive predictions outside the administrator's drift limit automatically suspend inference when auto-suspension is enabled.

Public wearable datasets without the defined six-hour clinical outcome can measure signal or missingness shift, but cannot honestly validate deterioration performance.

## Evidence that still requires people or clinical follow-up

- A completed usability study requires recruited participants, consent, recorded tasks and SUS responses.
- Prospective clinical validation requires future observations and a prespecified protocol.
- Clinical effectiveness requires an appropriate comparative study and outcome analysis.
- Regulatory approval is granted by the relevant authority; it cannot be implemented in source code.

Until those activities are completed, the product remains AI-assisted research/decision support and deterministic critical thresholds remain authoritative.
