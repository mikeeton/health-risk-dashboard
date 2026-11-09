# November 80% engineering milestone

Date: 19 October 2026. Target review: **15 November 2026**. This measures verified prototype deliverables, not clinical deployment or percentage of code written.

| Area | Weight | Full-credit acceptance evidence |
|---|---:|---|
| Core workflows | 20 | Patient, clinician, nurse and admin browser flows work on current API contracts; empty/error states verified. |
| Security and integrity | 15 | Negative access checks, migrations, idempotency and data-source provenance pass on disposable tests. |
| Model evaluation integrity | 15 | Original and revised targets separately defined; raw mapping audited; patient-separated results, confusion matrices, calibration and workload documented. |
| Front-end quality | 15 | Shared tokens, four coherent role views, light/dark and representative mobile/desktop screenshots reviewed. |
| Automated quality | 10 | Dated backend, lint/build, browser and accessibility checks with failures recorded. |
| Integration reliability | 10 | Sparse provider fixtures and failed/retried alert delivery have tested recovery. |
| Reproducibility | 10 | Locked environment, input/artifact hashes, commands and versioned outputs reproduce key results. |
| Documentation/demo | 5 | Supervisor can follow the architecture, limitations and working demonstration from current evidence. |

Score each area from 0 to 1 using its verified acceptance evidence; total is the sum of weight × score. **80/100 requires no open P0 scientific misrepresentation or patient-isolation failure**, even if the arithmetic total reaches 80. No present score is asserted: this is the scoring rubric to apply at the review.

| Week | Planned focus | Exit gate |
|---|---|---|
| 19–25 October | Baseline, P0 label/mapping audit, design tokens and shell | Comparative data-preparation tests; saved original artifacts; lint/build and initial visual checks. |
| 26 October–1 November | Clinician/nurse views, sparse ingestion, alert recovery | Mock provider fixtures, migration and failure/retry tests, role flows. |
| 2–8 November | Patient/admin views, assistant evidence UI, charts and accessibility | Four-role screenshot review, mobile reflow and Axe/manual findings. |
| 9–15 November | Full regression, reproducibility, dependency and deployment preflight | Recorded results, final gap score and supervisor demo; production only with separate authorisation. |

Scientific correction precedes any claim of improved predictive performance. Future prospective clinical studies and regulatory approval are explicitly outside this BEng prototype score.
