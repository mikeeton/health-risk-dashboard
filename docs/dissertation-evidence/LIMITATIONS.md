# Dissertation evidence limitations

- No prospective clinical validation, clinical-effectiveness study, regulatory
  approval, or real-care safety claim has been completed.
- The supervised ML outcome is a threshold-derived six-hour proxy, not an
  independently adjudicated clinical deterioration endpoint.
- Scenario, false-alert, persistence, and critical-override experiments use
  fixed synthetic data. They test software behaviour rather than population
  sensitivity, specificity, calibration, or clinical false-alert burden.
- The training/evaluation cohort and intended outpatient/wearable setting differ.
  Performance may change under demographic, device, workflow, and domain shift.
- Withings delivery is not an emergency-monitoring service. The wide vital schema
  cannot safely persist sparse provider groups, so missing values are reported
  as unavailable instead of being imputed with invented normal values.
- Baseline v2 assumes enough recent, valid, patient-specific observations and
  uses documented readiness/fallback behaviour when history is insufficient.
- Deterministic and canonical alert thresholds are engineering safety rules;
  they have not been calibrated by clinicians for a deployment population.
- Feature attribution may use a model-coefficient fallback in the recorded
  environment. Attribution describes model contribution, not causality.
- Latency results use an in-memory database on one workstation and do not
  represent Render cold starts, Neon network latency, concurrent load, or uptime.
- Groq is configuration-gated advisory text only. Provider access, governance
  flags, and schema validation do not establish clinical approval.
- Formal clinician-led calibration, human-factors evaluation, screen-reader user
  testing, penetration testing, backup restoration, and multi-instance load and
  failure exercises remain future work.
