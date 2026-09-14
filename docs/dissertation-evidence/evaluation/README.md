# Dissertation Evaluation Results

## Method

`dissertation-evaluation-v1` runs fixed-seed synthetic observations through the
real shared ingestion, baseline-v2, early-warning, canonical-risk-v1, and
installed ML inference code. In-memory SQLite isolates every experiment. Only
the shadow-mode experiment uses a controlled elevated prediction because its
purpose is to guarantee and test a governance state.

Default run parameters are seed `20260911`, 30 normal-sequence trials, five
attribution repetitions per injected abnormality, 30 measured performance
iterations, and one unmeasured warm-up iteration.

These are synthetic software experiments, not clinical ground truth or clinical
validation.

## Results from the committed run

- The same heart rate of 95 bpm produced a patient-relative z-score of 23.925
  for the approximately 60 bpm baseline and 4.1413 for the approximately 90 bpm
  baseline—a 5.7772× difference. Canonical levels were Moderate and Low.
- All three injected deterministic critical cases triggered: SpO2, heart rate,
  and blood pressure (3/3, 100%).
- The combined heart-rate and SpO2 case produced canonical High with two
  patient-relative reasons; heart rate alone produced Moderate with one.
- One isolated abnormal reading created one Moderate review case. Five
  consecutive readings still produced one case and three duplicate updates.
  This demonstrates deduplication, but also shows that the current trend rule
  can alert on the first sufficiently large isolated change.
- No alert was produced in 30 fixed-seed normal sequences under live rule
  evaluation with ML disabled (0/30). This is a synthetic false-alert estimate,
  not a population rate.
- The controlled shadow-mode experiment stored two elevated predictions and
  created no ReviewCase.
- Canonical risk and alert state were identical with a fail-if-called Groq stub;
  no external AI request was made.
- Unauthorized canonical access returned 404 and assistant context used a
  pseudonym without the synthetic patient name.
- Local ingestion-to-assessment performance was recorded in
  `performance_summary.json`; results are specific to the documented machine
  and in-memory SQLite environment.

## Attribution finding

The installed runtime used `model coefficient fallback`, not SHAP. Consequently
the run must not be presented as a successful SHAP evaluation. Observed feature
alignment was 5/10 for top 1 and 5/10 for top 3: all heart-rate injections
matched, while none of the SpO2 injections did.

This is an actionable environment/evaluation finding for Phase 6. Attribution
is model evidence, not causal explanation.

## Notable limitations

- Scenario labels are injected synthetic labels.
- Reduced activity remained canonical Low in this run.
- Falling SpO2 produced Moderate through trend evidence but a Low ML signal.
- The persistence experiment exposes first-change sensitivity rather than
  proving consecutive-reading gating.
- The model target is a threshold-derived six-hour proxy.
- Performance is not a production-hosting benchmark.
- No clinician-led calibration, patient cohort evaluation, or clinical
  validation is claimed.

`summary.json` contains headline results. CSV files retain experiment-level rows
for dissertation tables, while JSON files retain methodology and structured
summaries.
