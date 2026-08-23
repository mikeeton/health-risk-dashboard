# Claims-versus-Code Audit

Date: 19 August 2026

## Purpose and scope

This audit compares the final dissertation wording with the current repository. It distinguishes implemented behaviour from test evidence, retrospective evaluation, intended deployment topology and future work. It does not infer clinical validation, production operation or regulatory status from the presence of source code.

## Verified implementation claims

| Dissertation claim | Current implementation evidence | Audit conclusion |
|---|---|---|
| Patient data access is enforced on the backend. | `backend/access_control.py`: `patient_query_for_user` and `get_accessible_patient`; patient-specific routes call the latter before querying records. | Supported. This is server-side policy enforcement, not merely hidden frontend navigation. |
| A trained model predicts a qualifying critical-vital event in the next six hours. | `backend/ml_engine/registry.py`: `load_bundle` and `predict`; `backend/artifacts/ml/model.joblib`; `backend/artifacts/ml/evaluation.json`. | Supported when the artifact and evaluation report exist, their schema versions match and `approved_for_inference` is true. |
| Emergency values bypass ML inference. | `backend/routes/ml.py`: `predict_deterioration` checks SpO2, heart rate and blood-pressure thresholds before calling `predict`. | Supported. The response source is `deterministic_safety_override`. |
| Missing or unusable ML artifacts produce a labelled fallback. | `backend/routes/ml.py`: `calculate_prediction_from_latest` and the two `deterministic_fallback` branches. | Supported. The fallback explicitly states that no trained-model probability is available. |
| Runtime output identifies the model and local explanation method. | `backend/ml_engine/registry.py`: `predict` returns probability, model version, anomaly result, drift and explanations; `explain` labels either `SHAP` or `model coefficient fallback`. | Supported. The coefficient path must not be described as SHAP. |
| The interface distinguishes probability from confidence. | `frontend/src/app/components/MLPredictionPanel.tsx`: displays `Predicted 6-hour critical-event probability` only for `versioned_model`. | Supported, although the derived `/10` score remains the most visually prominent number and is therefore a residual presentation limitation. |
| Synthetic input is disclosed in the prediction panel. | `backend/routes/ml.py` derives `contains_synthetic_data` from `simulator` or `demo_seed`; `MLPredictionPanel.tsx` displays a synthetic-data warning. | Supported for this workflow. Synthetic data are not claimed as training evidence. |
| Groq is a pre-trained external LLM rather than a model trained by this project. | `backend/routes/assistant.py`: provider invocation, bounded context, output validation, circuit breaker and fallback. No Groq training or fine-tuning pipeline exists. | Supported. |
| Assistant memory is patient-specific and reset on patient change. | `backend/routes/assistant.py`: encrypted, patient-keyed memory helpers; `frontend/src/app/components/HealthAIAssistant.tsx`: patient-change effect clears the previous patient memory and resets visible state. | Supported as an implemented boundary. |
| Notifications use durable state plus live update hints. | `backend/routes/notifications.py`, `backend/notification_broadcast.py` and the frontend notification components. | Supported. PostgreSQL remains authoritative; WebSocket/Redis delivery must not be described as guaranteed merely because the code exists. |
| Withings notifications are deduplicated and followed by provider-backed retrieval. | `backend/routes/integrations_withings.py`: `webhook` looks up a known connection, retrieves measurements using stored OAuth credentials and deduplicates external measurement identities. | Supported with qualification: the current public webhook does not implement a separate cryptographic webhook-signature verification step. |
| Active model version is enforced. | `backend/early_warning.py` and governance routes/settings reject a loaded artifact whose version differs from the configured active version. | Supported as version enforcement. It is not evidence of a tested multi-artifact rollback facility because only one committed model artifact exists. |
| Backup utilities exist. | `backend/scripts/backup_postgres.py`, `backup_crypto.py` and `verify_backup.py`, plus workflow configuration. | Supported as infrastructure. Repository presence does not prove that a production backup and restoration exercise succeeded. |

## Corrections made during the audit

1. **Model rollback:** wording was reduced from a demonstrated rollback capability to active-version enforcement, with multi-artifact rollback identified as not demonstrated.
2. **Withings security:** wording now states known-connection lookup, OAuth-backed retrieval and deduplication. It no longer implies cryptographic webhook-signature validation that the route does not implement.
3. **Groq limit:** `enforce_daily_budget` is described as a daily request boundary, not a monetary cost-control mechanism.
4. **Backups:** the dissertation now distinguishes implemented backup/verification scripts from evidence of a successful production restoration exercise.
5. **Deployment:** Figure 4.5 is described as the intended production topology, not proof that every depicted external service is currently enabled.
6. **Browser evidence:** the final rerun is reported as 3 passed, 12 failed and 1 skipped. Earlier passing browser evidence is retained only as historical evidence and is not presented as the current result.

## Current verification evidence

- Backend: `backend/venv/Scripts/python.exe -m pytest backend/tests -q` returned **50 passed** with three warnings.
- Frontend: the production build completed successfully.
- Frontend lint: ESLint completed successfully.
- Browser suite: the latest `npm run test:e2e` rerun returned **3 passed, 12 failed and 1 skipped**. Most failures involved development-server navigation or dynamically imported module timeouts. This means current end-to-end browser assurance is incomplete.
- Accessibility: the two browser Axe cases did not complete in the final rerun because of the same timeout class. A previous zero-finding run is historical and was not reproduced in this final check.

## Claims that remain deliberately limited

- PhysioNet internal and Set B results are retrospective model evidence, not prospective clinical validation.
- Set B is a related ICU cohort, not a representative smartwatch or ordinary outpatient population.
- Automated tests do not demonstrate clinical effectiveness, human usability, assistive-technology usability or regulatory approval.
- SHAP and coefficient-based attributions explain model behaviour; they do not establish causation or clinical correctness.
- Groq schema/evidence validation reduces unsupported output but does not prove that every generated clinical statement is medically correct.
- Research, usability and prospective-validation screens are infrastructure. Empty or unadjudicated records are not completed studies.
- The deployment diagram and operational scripts describe architecture and readiness work, not proof of sustained production reliability.

## Residual presentation issue

`MLPredictionPanel.tsx` correctly labels the trained probability, but it renders `prediction_score/10` as the largest value. For a versioned-model response, `prediction_score` is the probability multiplied by ten. The dissertation therefore treats the percentage probability as the scientifically meaningful quantity and identifies the score-first visual hierarchy as a remaining usability improvement.

## Audit conclusion

After the corrections above, no sentence reviewed in the dissertation was found to claim clinical validation, demonstrated effectiveness, regulatory approval, Groq training, synthetic-data model training or verified production operation. The document now reports the current browser-test failure transparently and distinguishes code presence, automated verification, retrospective model evaluation and future validation.
