# Machine-learning pipeline validation report

**19 October 2026.** Corrected-target candidate trained and evaluated; **not approved for inference**. The installed July `physionet-critical-v1` artifact remains intact and is labelled as the legacy forward-filled proxy. All results below are retrospective ICU research, not clinical or outpatient wearable validation.

**5 November local update:** Artifact loading now independently requires every recorded acceptance gate to be present and true, even if `approved_for_inference` is set. The observed-target candidate remains blocked. This is a fail-closed software check; it does not improve the model's sensitivity, false-prompt burden or external clinical validity.

## Source and outcome policy

The [PhysioNet/CinC 2012 source](https://physionet.org/content/challenge-2012/1.0.0/) provides Sets A and B. Both ZIPs passed `ZipFile.testzip()`. Set A raw SHA-256: `1433638192fda622e8bb11a4559b8af2dbb1c69f0e1c3b5b606cc12aabd0a4c5`; Set B: `54094c39631797af554ad4233164e004a699521351bd2f2bed50d6564ebc56dc`. A direct Set A scan found 8,185 `SaO2` entries and **zero `SpO2` entries**. Arterial SaO2 is not mapped to wearable SpO2.

`backend/scripts/prepare_physionet_2012.py` supports `observed_next_window` and preserved `legacy_forward_fill`. The observed target is positive only when a newly observed **next six-hour bin** contains HR <40 or >140 bpm, systolic BP >=180 mmHg, or diastolic BP >=120 mmHg. Bins without next-bin HR/BP are unresolved and excluded. A negative row only means no critical value among observed fields; it does not prove no event occurred between samples. Source values outside the repository's vital plausibility ranges are excluded before feature and label construction. This matters because Set A contains zero-valued HR/BP records. Features carry forward for at most two later bins (12 hours), never from a future bin. The legacy mode remains for comparison; its artifact was not overwritten.

The ignored local cohort is `backend/data/physionet-2012-observed/`; `manifest.json` records raw/CSV hashes, counts, policy and missingness. Set A has **27,299 windows, 3,935 patients, 364 positive windows**; Set B has **27,340 windows, 3,935 patients, 506 positive windows**. Patient IDs do not overlap between sets. Every prepared row lacks `spo2`, steps, sleep, activity and calories. Set A CSV SHA-256: `01b5c54cc2c02519292da4c5040f100d79eb8d3d05d4737247cf2ceec8e3c144`; Set B: `89566d4a70f0cd4ea78724ad46921f02ddabd72ca4e7c346ad7287477cce5548`. The generated CSVs are ignored by Git; their hashes support reproducibility.

An independent raw-archive coverage pass (`backend/scripts/audit_physionet_label_coverage.py`) verified both archive and prepared CSV hashes and reconciled its eligible, positive and patient counts with the manifest. Each of the 4,000 source records per set offers seven possible six-hour prediction windows. A source record with no eligible window is absent from the prepared dataset. “Negative” below means no critical **observed** HR/BP in that next bin; it cannot exclude an event between samples.

| Coverage item | Set A | Set B |
|---|---:|---:|
| Raw patient records / parameter rows | 4,000 / 1,757,980 | 4,000 / 1,762,535 |
| Possible prediction windows | 28,000 | 28,000 |
| Eligible windows with observed next-bin HR/BP | 27,299 | 27,340 |
| Excluded unresolved future windows | 701 | 660 |
| Positive / observed-field negative windows | 364 / 26,935 | 506 / 26,834 |
| Patients with no eligible window | 65 | 65 |
| Follow-up observed fraction | 97.50% | 97.64% |
| Invalid source measurements excluded | 1,931 | 1,682 |
| Eligible current windows with stale carried HR / systolic BP / diastolic BP | 49 / 76 / 76 | 65 / 72 / 72 |

All eligible windows have missing wearable SpO2; the prepared feature missing counts for HR/BP are in the manifest. The coverage JSON also records field-specific missing next-bin observations and valid measurements outside the first 48 hours. To reproduce without modifying training inputs, run from `backend`: `venv\Scripts\python.exe -m scripts.audit_physionet_label_coverage --archive-directory ..\.runtime\physionet\verified --prepared-directory data\physionet-2012-observed --output data\physionet-2012-observed\label_coverage.json`. The output is ignored with the patient-level research data; this report records the aggregate evidence.

## Training and evaluation

`backend/scripts/train_ml_models.py` uses five patient-disjoint partitions: fitting, model selection, calibration, threshold selection and held-out Set A test. It checks both CSV hashes against the manifest and refuses to overwrite an existing artifact directory. The separate candidate `backend/artifacts/ml-observed-v1/` is version `physionet-observed-hrbp-v1`. Fit/selection/calibration/threshold/test row counts are **13,624 / 2,739 / 2,741 / 2,744 / 5,451**. Evidence includes ROC and precision–recall coordinates, calibration, confusion matrices, false-positive prompt burden, subgroup estimates and untouched Set B results. `scripts/augment_model_evaluation.py` added 200-iteration **patient-level bootstrap** 95% intervals; these describe uncertainty but do not repair cohort shift or outcome uncertainty.

| Measure | Held-out Set A | Set B external check |
|---|---:|---:|
| ROC-AUC | 0.744 (95% bootstrap 0.645–0.823) | 0.795 (0.765–0.824) |
| PR-AUC | 0.064 (0.027–0.120) | 0.109 (0.086–0.140) |
| Precision | 0.0194 (0.0118–0.0289) | 0.0463 (0.0407–0.0522) |
| Sensitivity | 0.585 (0.422–0.769) | 0.751 (0.712–0.798) |
| Specificity | 0.710 | 0.708 |
| Confusion matrix TN / FP / FN / TP | 3,832 / 1,566 / 22 / 31 | 19,008 / 7,826 / 126 / 380 |

The saved threshold is **0.010**. Held-out false-positive classifications equal **287.3 per 1,000 evaluated windows**. These are hypothetical research prompts, not delivered alerts. The candidate **failed** the configured Set A sensitivity gate of 0.60 (observed 0.585), so `approved_for_inference=false`. It was **not promoted**. The July model's higher held-out ROC-AUC (0.833) and precision (0.0377) measure a different target; direct headline comparison would be misleading. The UI exposes both as separately labelled research evidence.

## Reproduction and limits

From `backend`, run `venv\Scripts\python.exe scripts\prepare_physionet_2012.py --archive-directory ..\.runtime\physionet\verified --output data\physionet-2012-observed --label-mode observed_next_window`, then the new-output training command in `docs/ML_MODEL_CARD.md`. `scripts/augment_model_evaluation.py` reproduces confidence intervals from the saved model and exact dataset hashes. The official archives are in ignored `.runtime/physionet/verified`; do not commit raw patient-level source files. Tests cover carried-forward labels, bin boundaries, hour-48 exclusion, missing observations, SaO2 distinction, zero values, feature age, partition isolation and manifest mismatch.

Outstanding work: threshold and alert-burden review, adjudicated outcomes, temporal/site and wearable validation, missingness sensitivity, subgroup sample adequacy, prospective usability and population drift monitoring. `SaO2` could only be analysed as a **separate arterial feature** with a new contract and research rationale. The candidate remains a non-diagnostic research result.

The runtime shadow-outcome reconciliation was also corrected in this development batch. An expired prediction with **no subsequent timestamped observation inside its six-hour window** now remains unresolved instead of becoming a false-positive or true-negative by default. A reading measured inside the window may establish an observed-field proxy negative after expiry; a critical reading inside the window establishes a positive even if delivered late. A later critical delivery corrects an earlier proxy negative. Future-dated readings and readings outside the window do not reconcile the prediction. Six SQLite regression cases cover these boundaries. This change concerns prospective record classification, not the saved Set A/B retrospective candidate metrics above.

Existing shadow prediction rows classified before this fix were **not** silently rewritten. Their recorded negative outcomes require a separate provenance review against original observation timestamps before use in any prospective metric.

The restricted research API now aggregates global SHAP only from local explanations explicitly marked `method="SHAP"` **for the installed model version**; other versions, coefficient/importance fallbacks and unknown methods are counted separately and excluded from the SHAP figure. An empty SHAP panel means no genuine matching-version SHAP values were stored, not that the model has no important features. The prospective adjudication API also requires an expired window, at least one observed in-window vital and a source-based note before recording an observed-field proxy negative; a critical observed vital blocks that negative. Positive adjudication must have a timestamp inside the prediction window. This guards research record integrity but does not replace independent clinical outcome adjudication.
