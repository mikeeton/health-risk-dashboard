# Canonical Patient Risk Assessment

`GET /patients/{patient_id}/risk-assessment` is the versioned patient-level
presentation contract used to answer: **what is this patient's current overall
assessed risk, and why?** The current policy version is `canonical-risk-v1`.

This is a proof-of-concept decision-support contract. It is not a clinical
validation claim and it does not turn its component values into a weighted
average.

## Canonical overall assessment

The response exposes one prominent `overall_level` while retaining the
different meanings of its inputs. `overall_score` is deliberately `null`:
patient-relative points, model probability, Isolation Forest score, and alert
severity are not mathematically interchangeable.

The deterministic policy is evaluated in this order:

1. A critical latest-reading safety rule always produces `critical`.
2. A severe ready patient-relative result, or a latest active-mode prediction
   already marked as notified by the existing alert workflow, produces `high`.
3. A concerning physiological trend, moderate patient-relative deviation, or
   elevated ML proxy signal produces `moderate`.
4. Otherwise the result is `low`. When baseline history is insufficient, the
   reason explicitly states that this is not evidence of reassurance.

An open historical `ReviewCase` is returned separately and does not silently
replace the current assessment.

## Deterministic emergency rules

The assessment reuses the safety rules from `early_warning.py`:

- SpO2 below 90%
- heart rate below 40 or above 140 bpm
- systolic pressure at least 180 mmHg or diastolic pressure at least 120 mmHg

These rules are authoritative. Model, anomaly, baseline, or alert state cannot
downgrade a current deterministic Critical result.

## Patient-relative baseline signal

`baseline-v2` is represented by the method identifier
`recent_resting_prior_observations_v2`. It is owned by `baseline_service.py`.
The service parses timestamps to UTC, orders observations oldest-to-newest, and
compares the current reading with up to 30 preceding resting observations. The
current reading is never included in its own reference baseline.

Each metric requires 10 samples after per-metric median-absolute-deviation
filtering at a modified-z cutoff of 3.5. The response exposes mean, sample
standard deviation, current absolute/percentage deviation, z-score, raw and
retained sample counts, and excluded-outlier count. The original summary values
remain present for compatibility with the canonical patient-relative point
policy.

The observation-count window is intentional because repository data density
varies substantially between simulator, manual, and wearable sources. This is
still a proof-of-concept baseline: it has no historical persistence, fixed-day
window, multivariate outlier treatment, or gradual-deterioration freeze policy.

## ML prediction

The ML component is distinct from overall assessment. It estimates the
probability that the subsequent six-hour window contains a threshold-defined
critical vital event using the repository's proxy target. It is not diagnosis,
mortality, or clinically validated deterioration probability.

The service prefers a stored `ModelPredictionRecord` tied to the latest vital.
If a current artifact is available but such a record is absent, it may perform
bounded, process-cached read-only inference. Calling the endpoint never stores a
prediction or creates an alert. Shadow-mode probability remains visible but
cannot become an active predictive `ReviewCase` through this endpoint.

## Anomaly detection

The anomaly component exposes the existing Isolation Forest score and flag when
available. It means that the engineered feature vector appears unusual relative
to the training distribution; it does not mean that clinical deterioration has
occurred. It is not used as a Critical override.

## SHAP evidence

Stored SHAP contributions from the latest prediction are returned as evidence,
alongside separate deterministic and trend-rule evidence. SHAP is not required
for deterministic emergency rules.

## ReviewCase severity

The latest open `ReviewCase` is exposed under `alert` with its own status,
severity, score, and type. This is operational workflow state and can outlive the
reading that created it; it is not silently treated as the current assessment.

## Data quality

The response marks data incomplete when a latest core metric is absent and stale
when the latest timestamp cannot be parsed or is more than 24 hours old. It also
exposes the source, verification status, last-reading time, and missing metrics.

## Groq separation

Groq is not imported or called by the canonical service. It remains an
explanation/assistant facility outside measurement scoring, deterministic safety
rules, ML probability, anomaly detection, and alert creation.
