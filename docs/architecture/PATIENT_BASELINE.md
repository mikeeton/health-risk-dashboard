# Patient Baseline v2

## Purpose

The backend-owned baseline answers two bounded proof-of-concept questions:

1. What has recently been normal for this patient during recorded resting
   observations?
2. How far is the current reading from that reference distribution?

It is not a clinical validation claim, diagnosis, or replacement for clinician
assessment. The implementation is `backend/baseline_service.py`; the canonical
risk response exposes its result.

## Cohort and ordering

The service queries one patient's vitals with explicit ascending timestamp and
ID ordering, parses timestamps, normalizes them to UTC, and deterministically
sorts oldest-to-newest again in Python. Invalid-timestamp observations do not
enter the reference set.

The current reading is excluded. Eligible reference observations must:

- belong to the same patient;
- precede the current reading by parsed timestamp and ID;
- have `activity_state` equal to `resting`, case-insensitively;
- contain the relevant metric within the repository's existing accepted range.

Synthetic/demo readings are not silently discarded because they are required
for repeatable project evaluation. Their source remains visible elsewhere in the
assessment, and results must not be represented as real-patient evidence.

## Window and readiness

Baseline v2 uses the 30 most recent eligible observations. An observation-count
window was selected instead of 14 days because repository sources have very
different densities: simulator streams may produce readings seconds apart while
manual/wearable histories may be sparse.

Each metric requires at least 10 retained samples. The overall baseline is ready
only when all supported metrics meet this threshold and the current values are
available. Otherwise the response returns `ready=false` and
`reason="insufficient_history"`; it does not convert missing history into a
patient-relative Low result.

## Metrics and units

| Metric | Internal unit |
|---|---|
| Heart rate | bpm |
| SpO2 | percent |
| Systolic/diastolic blood pressure | mmHg |
| Sleep | hours |
| Steps | count |

For each metric the response provides mean, sample standard deviation, current
value, absolute deviation, percentage deviation, z-score, raw sample count,
retained sample count, and excluded-outlier count. If retained variance is zero,
z-score is `null` because division by zero would imply false precision.

## Outlier policy

Outliers are filtered independently per metric using median absolute deviation
(MAD):

```text
modified_z = 0.6745 × |value - median| / MAD
retain when modified_z ≤ 3.5
```

When MAD is zero, median-equal observations are used only if at least 10 remain;
otherwise all values are retained rather than removing observations without a
defensible variability estimate. This protects a stable reference series from a
single broken-sensor value without duplicating the multivariate Isolation Forest.

## Known limitations

- No baseline rows or historical versions are persisted.
- No fixed calendar-day window is applied.
- Filtering is univariate and does not determine clinical plausibility.
- There is no freeze policy preventing gradual deterioration from entering a
  future baseline.
- Data-source-specific reliability weighting is not implemented.
- The method has not been clinically validated.
