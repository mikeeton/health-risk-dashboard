# Visualisation review — 19 October 2026

The current workspaces use charts where they convey measured trends or saved research results. This review describes the current working tree; its browser captures use synthetic fixtures and intercepted APIs, not live clinical records. The shared rules are in `FRONTEND_DESIGN_SYSTEM.md`.

| View | Data and presentation | Verification and limit |
|---|---|---|
| Doctor observed vital trends | Recorded HR, oxygen saturation and blood pressure with units, timestamps and gaps; an accessible table remains available at narrow widths. | Representative desktop/mobile captures and browser reflow tests pass. Missing values are not interpolated. Reference ranges require separate provenance before display. |
| Model intelligence | Saved observed-candidate ROC and precision–recall coordinates, calibration bins, confusion matrix and candidate comparison. Version, outcome and sample context appear with a non-serving research notice. | Coordinates come from `backend/artifacts/ml-observed-v1/evaluation.json`; the candidate failed its inference gate. The installed legacy model is presented separately because its outcome differs. |
| Connected devices | Connection and freshness states, recent device-sourced readings, sparse fields and a provider-attempt timeline with accepted/rejected counts. | Synthetic fixtures verify labels and responsive presentation. Counts describe stored provider groups, not continuous monitoring coverage. |
| Monitoring | Prioritised event list with clinical/system filtering and links to the underlying case register. | Browser tests verify the clinical filter and keyboard operation. Reading a notification is not treated as clinical acknowledgement. |

The research page uses actual saved evaluation coordinates rather than reconstructed curves. Its ROC/PR chart components include coordinate tables; calibration and confusion views have textual values. No figure establishes clinical effectiveness. Missingness, threshold analysis, feature attribution and population drift need further work only when supported by a suitable versioned dataset and evaluation contract. `ML_PIPELINE_VALIDATION_REPORT.md` records the model numbers and methodological limits.

The restricted administrator research page's global SHAP view now excludes coefficient/importance fallback records and other model versions; the view names how many genuine matching-version SHAP and excluded records underpin the figure. An absent SHAP dataset is shown as unavailable rather than relabelled fallback attribution.

Screenshot mapping and capture commands are in `docs/evidence/WORKSPACE_REVIEW.md`. The historical and current images use different data sources, so they document interface progression, not a controlled same-data comparison.
