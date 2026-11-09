# Health Risk Dashboard 2.0 — comprehensive codebase audit

**Audit date:** 19 October 2026. **Scope:** repository state in the current working tree, including uncommitted changes. **Decision:** audit only; no application, database, model, or infrastructure changes were made for this review. **Overall engineering estimate:** **61% complete** against the dissertation-oriented rubric in section 16. This is not a clinical validation, production certification, or university grade.

Evidence labels used below: **confirmed** means directly visible in source or an artifact; **demonstrated** means supported by a dated test or screenshot; **unverified** means the repository does not establish the claim. Test results quoted here were recorded earlier on **19 October 2026**; this audit did not rerun destructive database operations or a live production test. The existing worktree is not clean, so conclusions apply to the files inspected, not necessarily a deployed commit.

## 1. Executive summary

The project has a substantial full-stack foundation: role-scoped workflows, PostgreSQL/Alembic, MFA and rotating refresh sessions, deterministic clinical alerts, a versioned research model, evidence-constrained AI, automated tests, and recently differentiated role workspaces. Its strongest risk is **scientific integrity**: the installed `physionet-critical-v1` artifact is still tied to the older prepared target, while the model card describes an observed next-window target. The second major risk is **data reliability**: Withings groups missing any field required by the wide vital schema are discarded, and a vital is committed before its alert evaluation. The last recorded production smoke (14 September 2026) found backend 503, so production operation is unverified. These risks should be resolved before expanding the interface.

The 15 November target is feasible as an **approximately 80% dissertation prototype**, provided the scope remains on correctness, reproducible evidence, integrated workflows, and a defensible demonstration using synthetic data. It is not a target for clinical deployment.

## 2. Overall software assessment

| Area | Assessment | Basis |
|---|---|---|
| Role-oriented frontend | Strong prototype, uneven depth | 24 page components, role guards in `frontend/src/app/routes.tsx`; eight redesigned areas documented in `docs/evidence/WORKSPACE_REVIEW.md`. Secondary screens remain denser and less consistently themed. |
| Backend/API | Functional prototype | FastAPI route modules, shared access helpers, Postgres configuration, ingestion pipeline and workflow APIs; see `backend/routes/`, `backend/access_control.py`, `backend/database.py`. Transaction and recovery gaps remain. |
| Database/migrations | Partially verified | PostgreSQL-only guard in `backend/config.py`; CI upgrades, downgrades to a pinned revision, then upgrades (`.github/workflows/ci.yml`). This is narrower than a restore rehearsal on production-like data. |
| Security | Good controls, incomplete assurance | Argon2, MFA, refresh rotation, staff-patient access rules, socket tickets; manual negative access review and deployment verification remain. |
| ML | Research prototype with a serious provenance discrepancy | `backend/scripts/prepare_physionet_2012.py`, `backend/scripts/train_ml_models.py`, `backend/artifacts/ml/evaluation.json`, `docs/ML_MODEL_CARD.md`. |
| AI | Guarded optional integration | `backend/routes/assistant.py` validates structured output and governance; client history is session-only, provider-enabled production path unverified. |
| Operations | Incomplete production evidence | Render/Vercel configuration and CI exist; latest archived production smoke shows backend 503. |

## 3. Current strengths

1. **Enforced server-side patient scoping:** `backend/access_control.py` builds role-specific patient queries and returns 404 for inaccessible records; guards are not solely frontend navigation.
2. **Authentication foundation:** Argon2 verification, MFA, short-lived route-scoped WebSocket tickets, and persisted refresh-token rotation in `backend/auth_utils.py` and `backend/routes/auth.py`.
3. **Research separation:** deterministic urgent vital thresholds run independently of model inference in `backend/early_warning.py`; model governance includes shadow-mode concepts.
4. **Reproducible training structure:** patient-grouped splits, candidate comparison, sigmoid calibration, threshold selection, external Set B evaluation, and versioned metadata in `backend/scripts/train_ml_models.py`.
5. **Clinical provenance:** vital sources and synthetic labels appear in the UI; the AI schema requires evidence citations, timestamps, missing information and safety warnings (`frontend/src/app/components/DataProvenanceBadge.tsx`, `backend/routes/assistant.py`).
6. **Recent interface improvements:** shared light/dark tokens and focus styles in `frontend/src/styles/index.css`; doctor, nurse, patient, admin, ML, AI, device and monitoring pages now have distinct layouts. Dated screenshots are in `docs/evidence/workspace-review-2026-10-19/`.
7. **Automated baseline:** recorded 19 October results: backend `118 passed` with one deprecation warning, frontend lint/build passed, Playwright `25 passed, 1 skipped`; CI runs PostgreSQL, Redis, migration and browser jobs (`.github/workflows/ci.yml`). These are local/CI-style checks, not live production validation.

## 4. Confirmed defects and evidence

| ID | Confirmed observation | Consequence |
|---|---|---|
| D01 | `backend/scripts/prepare_physionet_2012.py:71-79` retains `legacy_forward_fill` labels; the installed `backend/artifacts/ml/evaluation.json:3-18` is the July `physionet-critical-v1` artifact. `docs/ML_MODEL_CARD.md` calls the deployed outcome *genuinely observed*, but no new artifact or raw-data regeneration is evidenced. | Current artifact performance cannot be described as performance on the corrected observed-next-window target. |
| D02 | `prepare_physionet_2012.py:20-29` maps `SpO2`, not the dataset's `SaO2` field discussed in `ML_PIPELINE_VALIDATION_REPORT.md`; the prepared historical data reports oxygen missing. | Oxygen is effectively absent from the model input/target; document and verify against raw source before any model claim. |
| D03 | `backend/routes/integrations_withings.py:399-416` skips a group whenever any `WIDE_VITAL_FIELDS` member is absent. | Normal sparse device measurements may never reach the patient timeline; a connected device can show zero usable readings. |
| D04 | `backend/measurement_ingestion.py:157-173` commits the vital before calling `evaluate_new_vital`. | A later evaluation failure can leave a stored reading without its expected alert; retry/reconciliation is not atomic. |
| D05 | `backend/artifacts/ml/evaluation.json:139-153` reports 55 TP and 1,403 FP on the held-out test set at threshold 0.014; precision is 3.77%. Set B precision is 4.71% (`:248-264`). | Alert fatigue and probability interpretation are material concerns even though ROC-AUC is 0.833/0.785. |
| D06 | `backend/ml_engine/registry.py:120-140` catches any SHAP exception and emits a coefficient/importance fallback; the method is labelled but the exception is not surfaced in the response. | A fallback can be mistaken for robust local explanation unless method and failure rate are shown in research evidence. |
| D07 | `frontend/src/app/components/HealthAIAssistant.tsx:221,369-371` keeps conversation history only in component state and explicitly says reload loses it. | The “conversation history” workspace is session-only, not a durable user record. |
| D08 | `frontend/src/app/pages/ResearchWorkspace.tsx:43` exposes a negative-only prospective outcome form. | Positive outcomes require another workflow/API; research collection is asymmetric and easy to misinterpret. |
| D09 | `docs/dissertation-evidence/deployment/production-smoke-2026-09-14.json` records frontend 200, backend liveness/readiness 503, and seven authenticated checks skipped. | There is no archived successful end-to-end production smoke after this failure. It does **not** prove the service is still down today. |
| D10 | `docs/ML_MODEL_CARD.md` and parts of `README.md` describe states that no longer match source/current dated tests. | A supervisor could receive inaccurate model or quality claims. |

## 5. Missing or incomplete functionality

The domain APIs cover medications, appointments, referrals, case review, reports, user management and research, but the UI often combines many jobs on one screen. `frontend/src/app/pages/CareWorkspace.tsx` holds appointments, messages, tasks, documents, consent, observations, medications and alerts in a single large component; the “care” route is functional but cognitively dense. Devices show current status and recent readings, not a persisted per-sync history or field-by-field coverage. `frontend/src/app/pages/DevicesHub.tsx` explicitly counts loaded records, not continuous coverage. Notifications offer read/unread and filtering, while clinical acknowledgement/resolution is deliberately elsewhere (`frontend/src/app/components/NotificationCenter.tsx:269`); the monitoring centre does not yet give a unified case lifecycle. AI answers expose evidence but history is not retained across reloads. Research forms exist, yet human study recruitment, ethics approval, outcome adjudication quality and prospective evaluation are not demonstrated by code alone.

No confirmed dead button is asserted without a browser trace. The current tests use synthetic fixtures for representative pages, so every less-visited form still needs a role-specific interaction pass before demo. “Connected to API” is distinct from “live provider proven”: Withings OAuth/webhook path exists, but complete real-device ingest is unverified.

## 6. Machine-learning findings

**Scientific issues.** The preparation script now defaults to `observed_next_window`: only next-bin HR/BP observations determine a target; windows without those readings are excluded (`backend/scripts/prepare_physionet_2012.py:60-82`). This is a defensible correction to the legacy forward-filled label, but it changes cohort size/prevalence and omits oxygen from the observed label. The installed July artifact was not retrained against it. The source cohort is ICU stays; transfer to outpatient wearable monitoring is unproven. Neither high ROC-AUC nor calibration on Set A establishes clinical utility, prospective validity or acceptable alert burden. The held-out test has 55 TP/1,403 FP, and independent Set B 373 TP/7,551 FP at the saved threshold. Report prevalence, confidence intervals, PR curves, calibration and alerts per patient-day before choosing a workflow threshold. Do not tune against Set B or relabel records for a better headline.

**Engineering issues.** `backend/scripts/train_ml_models.py:34-44` separates patient IDs in fit, validation and test; this limits same-patient leakage. Candidate selection and sigmoid calibration use the validation split, then the threshold is selected on that same split (`:106-124`), so validation is reused for several decisions; the test remains held out. The current split is random by patient, not temporal/site-based. The evaluation JSON records Set B, a good external-set check, but source-population shift is not solved. `backend/ml_engine/registry.py:101-112` uses a maximum reference z-score for **single-record drift**, which is an outlier indicator rather than population drift monitoring. Anomaly detection is an Isolation Forest trained on non-target rows (`train_ml_models.py:125-130`); it needs distinct evaluation and cannot inherit classifier metrics. The SHAP fallback is explicitly labelled in the API, but both methods need a reproducible sample audit. Model loading uses joblib; only trusted, version-controlled artifacts should be installed. `approved_for_inference` is based on simple ROC/sensitivity/specificity gates (`train_ml_models.py:174-183`), not safety or clinical approval.

**Correctable with existing data:** validate raw column inventory; decide and document `SaO2`/`SpO2` mapping or explicitly exclude oxygen; regenerate observed-target Sets A/B with manifest and hashes; rerun grouped training, fixed threshold protocol, bootstrap intervals, PR/calibration, alert-burden and missingness analyses; compare SHAP with fallback labels; add dataset and artifact provenance tests. **Requires additional data/study:** outpatient/wearable generalisation, adjudicated clinical outcomes, site/temporal validation, subgroup fairness with adequate sample size, prospective workflow impact and clinician usability. Present all current metrics as **retrospective proxy research**.

## 7. Backend and database findings

The API is split by function (`backend/routes/`) and uses SQLAlchemy models, PostgreSQL, Alembic and shared `ingest_vital`. The shared ingestion path validates with Pydantic and deduplicates provider external IDs; concurrent duplicate delivery is recovered after an integrity error (`backend/measurement_ingestion.py:69-176`). Legacy no-external-ID deduplication scans patient/source rows in Python and has no database uniqueness guarantee, creating both race and scale risk. Timestamp normalisation is called out as incomplete in `_normalise_measurement` (`:48-62`), despite duplicate comparison normalising timestamps. Source adapters need a coherent time-zone/idempotency policy.

The ingestion commit precedes early-warning evaluation; `backend/early_warning.py` logs evaluation failures. Use a transactional alert intent/outbox or a durable pending-assessment state plus idempotent retry worker. Clinical events, notifications and audit entries must be reconciled after process restarts. Socket change messages are hints; the notification REST endpoint is the source of truth (`backend/routes/notifications.py:91-153`). Redis is optional in `backend/config.py`; disabling it falls back to polling, but cross-process delivery and outage recovery need explicit tests. A single Withings group can be partially useful; current wide-row schema blocks it. Prefer sparse measurement entities or validated merge-by-time with per-field source/quality metadata rather than fabricated values. Record rejected groups for audit and safe retry.

## 8. Security findings

**Implemented controls:** PostgreSQL-only configuration, production secret/HTTPS/CORS checks (`backend/config.py:121-181`), Argon2 hashing and MFA secret encryption (`backend/auth_utils.py`), MFA on login and refresh-session rotation (`backend/routes/auth.py`), role and patient assignment scope (`backend/access_control.py`), short-lived scoped WebSocket tickets, admin-only direct notification creation, audit logging and configured security headers. These are meaningful controls; frontend route guards are convenience only and do not replace them.

**Assurance gaps / risks:** frontend bearer and refresh tokens are in `sessionStorage` (`frontend/src/app/services/api.ts:38-68`), so an XSS could read them; a move to secure cookies would require CSRF controls and careful migration. The Withings webhook relies on a configured secret and provider request path; replay, signature provenance and retry semantics need focused verification. Dynamic role/assignment changes should be tested against open WebSockets and refresh tokens. `backend/routes/auth.py` has unreachable legacy registration code after an unconditional 403 (`:51-88`); remove it in implementation to reduce review ambiguity. Current dependency status is not re-audited here; CI runs `npm audit --audit-level=high`, but a dated passing CI run should be attached to the demo. No penetration test, clinical privacy assessment, or independent security certification is established by the repository. Treat real patient data as out of scope until governance is documented.

## 9. Frontend UI/UX findings — complete route inventory

`frontend/src/app/routes.tsx` defines 24 page components (some reused for two route paths). The table covers every page file. “Current” means source and dated fixture screenshots where available, not a live visual inspection of every backend state.

| Page(s) / route | Current task model and assessment | Best next improvement |
|---|---|---|
| `Login`, `RegisterAccess`, `ResetPassword` / public routes | Dedicated entry forms; distinguish access request from account creation. | Test validation, error recovery, keyboard and mobile on each form. |
| `Dashboard` / `/` | Legacy general dashboard still computes client-side risk, alerts, prediction and report (`frontend/src/app/pages/Dashboard.tsx:77-130`), parallel to newer role workspaces. | Remove ambiguity: route each role to its purpose-built home or label local calculations as estimates; consolidate duplicated clinical meanings. |
| `DoctorDashboard` / `/doctor` | Clinical command layout with review emphasis; representative light/dark captures exist. | Validate live patient selection, ranges, urgent action and empty/error states. |
| `NurseDashboard` / `/nurse` | Worklist-oriented layout; representative captures exist. | Verify observation/medication completion transitions with role-scoped API. |
| `PatientDashboard` / `/patient` | Simpler personal view; representative captures exist. | Plain-language ranges, freshness and device caveats on live data. |
| `AdminDashboard` / `/admin` | Operations entry layout; counts are API snapshot, not uptime proof. | Link status summaries to actionable drill-down and timestamps. |
| `AdminUsers`, `AdminApprovals`, `AdminAssignments` | Management tables/forms connected to API. | Harmonise validation, filters, confirmation and narrow-screen table handling. |
| `AdminOperations` | Powerful governance controls but many sections/forms on one page. | Split into clearly titled operational tabs and show save/audit result per control. |
| `ResearchWorkspace` / `/admin/research` | Research data entry; negative-only prospective shortcut. | Separate study setup, outcomes, evidence quality and audit; fix asymmetric adjudication. |
| `AdvancedAnalytics` / `/analytics` | Model intelligence visuals use real evaluation metadata where available; captured in both themes. | Show current artifact version, target lineage, threshold confusion matrix and missingness conspicuously. |
| `AIAssistantPage` | Evidence-focused two-column composition; session-only history in child component. | Durable history only with approved retention; better source navigation and generation-state audit. |
| `DevicesHub` | Connection, status and recent reading layout; source labels; no sync history. | Add provider attempt timeline and field coverage after sparse ingestion is fixed. |
| `Notifications` | Monitoring centre wrapper around `NotificationCenter`; filters and read states. | Present linked clinical case timeline/acknowledgement without conflating read with resolved. |
| `CareWorkspace` | Broad care tools in one long surface. | Task-based tabs or routes for appointments, medication, documents and observations. |
| `ReviewCases` | Case workflow available to clinician roles. | Verify transitions, ownership, time order and failure rollback in browser/API tests. |
| `Referrals` | Shared clinician/admin route. | Role-specific table/action visibility and status explanation. |
| `Reports` | Clinician reporting view. | State data lineage, export time and uncertainty; test print/export at all widths. |
| `UploadData` | CSV preview and upload workflow. | Stronger row-level validation feedback, duplicate summary and progress/retry UX. |
| `AuditLogs` | Admin audit history. | Filter by actor/entity/time and clarify immutable vs editable records. |
| `AccountSecurity` | Profile, password, MFA and sessions in one page. | Verify sensitive action confirmation, focus after errors and small-screen form layout. |

The light clinical design foundation is stronger than the older screenshots, but secondary pages still mix bold-heavy headings, raw utility colours, dense forms and long card stacks. The user’s earlier “light and dark theme is broken” report should be considered **partly addressed, not universally closed**: the current representative theme tests pass, while all 24 pages and their error/empty/modal states have not been visually reviewed. The sidebar/top navigation in `frontend/src/app/components/Layout.tsx` has role-aware destinations; check actual role journeys for duplicate links and route hierarchy rather than adding more sidebar items.

## 10. Section-specific design recommendations

| Workspace | Purpose-built layout and interaction |
|---|---|
| Doctor | Patient identity and risk context first; reference-range trend, recent event rail, prioritised alerts, one clear review action. |
| Nurse | Queue and due-time columns; observation schedule, medication administration states and escalation handoff; minimise decorative charts. |
| Patient | Large plain-language latest reading, measured time, personal trend and device freshness; explanations before technical score. |
| Administrator | Searchable user/assignment tables, integration health, audit timeline and service status with timestamps; management actions require visible result. |
| Model intelligence | Research notebook hierarchy: cohort/target/version, ROC and PR, confusion matrix, calibration, subgroup and missingness; shadow mode banner and attribution method. |
| AI assistant | Conversation and structured evidence pane with timestamp/source links, missing-data disclosure, provider/fallback status; session-only history clearly labelled until retention policy exists. |
| Devices | Connection card, last sync attempt, accepted/rejected group timeline, field coverage, provenance and recoverable errors. |
| Alerts | Event timeline grouped by case, severity and pending action; separate notification read status from clinical acknowledgement, escalation and resolution. |
| Reports/records | Document-style summary with export provenance; care records organised around specific tasks. |
| Account/settings | Calm settings forms with session and MFA security actions, feedback and confirmation. |

## 11. Charts and visualisation improvements

Use **only data-supported views**. Doctor: reference bands plus individual vital trend, event markers. Nurse: time-to-due schedule and completion states. Patient: one-measure trend with units and source; avoid risk radar charts. Admin: service timeline and queue aging; counts require as-of time. ML: ROC/PR with baseline prevalence, confusion matrix at the displayed threshold, calibration with sample counts, model comparison table, missingness grid, attribution bars labelled **SHAP** or **coefficient/importance fallback**, and drift distribution over a population/time period rather than a single z-score. Devices: received-measurement coverage by field and sync attempts; a count is not continuous coverage. Alerts: chronological case trajectory. Include accessible tabular alternatives for charts and no implied clinical certainty from synthetic fixtures.

## 12. Responsiveness and accessibility findings

The shared CSS defines light/dark surface tokens and `:focus-visible` styles (`frontend/src/styles/index.css:3-40,128-151`). The current fixture-based Playwright review exercised eight representative areas at 1440, 768 and 390 px, both themes, keyboard interactions, 200% zoom and axe serious/critical checks (`frontend/tests/e2e/workspace-review.spec.ts`, `frontend/tests/e2e/accessibility.spec.ts`, `docs/evidence/WORKSPACE_REVIEW.md`). This supports representative layout quality; it does not certify all pages or every state. Prioritise horizontal overflow checks for admin tables, care forms, CSV preview and report exports; test full keyboard completion, focus return after dialogs, error announcements, contrast of muted text and non-colour status labels. Clinical red/amber/green must always have text/status symbols. Retain screenshot comparisons as **synthetic fixture** evidence, never as proof of live readings.

## 13. Testing and deployment gaps

There are 16 backend test files and four Playwright spec files (`backend/tests/`, `frontend/tests/e2e/`). Same-day recorded results: 118 backend passed (one Starlette deprecation warning); frontend lint/build passed; Playwright 25 passed, one skipped. Coverage is broad for a prototype but not exhaustive. Add high-value failure tests: transaction interruption after vital commit, Withings sparse and duplicate groups, alert replay/idempotency, Redis disconnect/reconnect, role reassignment mid-session, migration on a production-like anonymised snapshot, assistant provider timeout/fallback and XSS-oriented rendering. The one skipped E2E case needs a reason and owner. The CI workflow runs Postgres/Redis tests, npm audit, browser tests and a migration downgrade/upgrade; capture a specific green run and commit SHA for supervisor evidence. `render.yaml` and `vercel.json` document deployment, but the archived 14 September smoke is red for backend. `.github/workflows/production-health.yml` checks readiness/frontend on a schedule, contingent on repository variables; no passing monitor output is archived here. A fresh **read-only** production smoke, after service availability is established, is required before asserting deployment readiness. No load/performance benchmark or recovery-time measurement was independently verified in this audit.

## 14. Prioritised improvement register

**Classification:** C = confirmed defect/contradiction; G = demonstrated gap; R = risk or design recommendation needing verification. Severity concerns project integrity/reliability, not a claim of patient harm in deployed clinical use. Dates are proposed completion dates in 2026.

| ID/type | Component/problem and evidence | Severity / priority | Improvement | Complexity / academic value | Verification / target |
|---|---|---|---|---|---|
| A01 C | ML target/artifact mismatch; `prepare_physionet_2012.py:71-82`, `artifacts/ml/evaluation.json:3`, `docs/ML_MODEL_CARD.md` | Critical / P0 | Freeze current claims; regenerate and retrain observed-target artifact with manifest | High / scientific validity | Hashes, row counts, new model card and independent rerun / 25 Oct |
| A02 C | Oxygen mapping absent; `prepare_physionet_2012.py:20-29` | High / P0 | Inspect raw `SaO2` semantics and decide documented mapping/exclusion | Medium / data validity | Raw-to-prepared field audit and missingness table / 24 Oct |
| A03 C | Sparse Withings groups dropped; `integrations_withings.py:399-416` | High / P0 | Persist partial measurements with explicit missingness and source | High / real integration | Sparse-group and replay integration tests / 31 Oct |
| A04 C | Vital commit before alert; `measurement_ingestion.py:157-173` | High / P0 | Durable assessment state/outbox plus idempotent reconciliation | High / reliability | Fault-injection recovery test / 2 Nov |
| A05 C | Low model precision/high FP; `evaluation.json:139-153,248-264` | High / P0 | Report alert burden, PR/calibration and cost-aware threshold; keep shadow mode | Medium / evaluation quality | Locked test/Set B report with CIs / 30 Oct |
| A06 C | Model card misstates target; `docs/ML_MODEL_CARD.md` | High / P0 | Align documentation to installed version and later retrain | Low / evidence integrity | Claim-to-artifact checklist / 25 Oct |
| A07 G | Production backend smoke 503; dated JSON | High / P0 | Diagnose host/config, then archive passing readiness/auth workflow | Medium / demonstrability | Dated smoke with status, commit and redacted logs / 7 Nov |
| A08 G | Session-only AI history; `HealthAIAssistant.tsx:221,371` | Medium / P1 | Keep clearly labelled or add retention-governed persistent history | Medium / transparent AI | Reload/retention test / 7 Nov |
| A09 G | Negative-only prospective form; `ResearchWorkspace.tsx:43` | Medium / P1 | Add reviewed positive outcome path or remove misleading shortcut | Medium / research method | Both outcomes with evidence and role checks / 5 Nov |
| A10 R | Single-record z-score called drift; `registry.py:101-112` | Medium / P1 | Relabel as outlier; add cohort/time drift analysis | Medium / monitoring validity | Synthetic shift test and reference plots / 5 Nov |
| A11 R | SHAP blanket fallback; `registry.py:120-140` | Medium / P1 | Log method/failure safely; sample explanation reproducibility | Medium / explainability | Method counts and checked examples / 3 Nov |
| A12 R | No external-ID legacy dedup race; `measurement_ingestion.py:69-94` | Medium / P1 | Add scoped idempotency key/index after migration review | Medium / data integrity | Concurrent duplicate test / 5 Nov |
| A13 R | Wide vital timestamp handling; `measurement_ingestion.py:48-62` | Medium / P1 | UTC normalisation policy at ingress/storage | Medium / data quality | Offset-equivalence tests / 5 Nov |
| A14 G | Legacy `/` client-side risk alongside canonical API; `Dashboard.tsx:77-130` | Medium / P1 | Consolidate role home and label local estimates | Medium / interpretability | Role journey and result consistency tests / 6 Nov |
| A15 G | Care workspace task density; `CareWorkspace.tsx` | Medium / P1 | Split by appointments, medications, observations, documents | Medium / usability | Five role-task walkthroughs at 390/768/1440 / 8 Nov |
| A16 G | Device UI no attempt history; `DevicesHub.tsx`, `WithingsIntegration.tsx` | Medium / P1 | Sync-attempt timeline and per-field coverage | Medium / transparency | Accepted/rejected fixture and live demo states / 8 Nov |
| A17 G | Alerts read vs case action fragmented; `NotificationCenter.tsx:269` | Medium / P1 | Linked case timeline with explicit action status | Medium / clinical workflow | Read/ack/escalate/resolved scenario / 9 Nov |
| A18 R | Token storage readable to page JS; `services/api.ts:38-68` | Medium / P1 | Threat-model XSS; evaluate cookie/CSRF migration | High / security | Security tests and decision record / 10 Nov |
| A19 R | Open socket/role changes and Redis recovery | Medium / P1 | Test revocation, reconnect and polling recovery | Medium / access/reliability | Multi-client disconnect/role-change tests / 10 Nov |
| A20 G | Only representative visual suite; `workspace-review.spec.ts` | Medium / P1 | Audit all 24 page states, themes and keyboard paths | Medium / accessibility | Screenshot/axe matrix with defects resolved / 11 Nov |
| A21 G | No archived green production E2E since red smoke | High / P1 | Re-run redacted full live smoke when backend ready | Low / evidence | Archived pass/fail report / 12 Nov |
| A22 R | Migration/restore assurance narrow; `.github/workflows/ci.yml` | Medium / P1 | Restore rehearsal on synthetic snapshot and schema drift check | Medium / reproducibility | Timed restore + downgrade/upgrade logs / 11 Nov |
| A23 G | Stale README/other reports | Low / P2 | Reconcile claims, dates, screenshots and test counts | Low / supervisor clarity | Traceability review / 13 Nov |
| A24 R | No measured load/recovery budget | Medium / P2 | Define and run safe synthetic performance/failure benchmark | Medium / engineering evidence | p95 and recovery report with environment / 13 Nov |

## 15. November development roadmap

| Window | Deliverable and dependency | Evidence gate |
|---|---|---|
| 19–25 Oct | Correct scientific claims first; audit raw oxygen field, decide target, regenerate observed-target data, retrain with new version. A02 precedes A01. | Manifest, hashes, label examples, source-target diagram, model card. |
| 26 Oct–2 Nov | Evaluate fixed artifact honestly; build sparse measurement persistence and alert outbox/reconciliation. A03 needs schema design; A04 needs idempotency. | Held-out/Set B evaluation, PR/calibration/false-alert analysis, fault-injection tests. |
| 3–9 Nov | Reconcile role landing/dashboard; device and monitoring flows; care task grouping; AI method/status history decision; research form correction. These UI tasks can proceed independently once API contracts are agreed. | Full role walkthroughs, responsive/theme/keyboard screenshots, API contract tests. |
| 10–15 Nov | Security negative paths, Redis/restart/migration recovery, fresh production smoke, documentation and supervisor demo rehearsal. Live smoke depends on deployment availability. | Green CI SHA, dated smoke or explicit blocker, defect register closure and slide-ready evidence. |

Do not add broad new clinical features merely to increase code volume. If time tightens, protect A01–A07 and a reliable role-based demo before secondary polish.

## 16. Estimated project completion

Weights reflect dissertation evidence and technical risk, with ML/data integrity deliberately heavier than cosmetic breadth. Each score is an engineering judgement on this repository state; `contribution = weight × completion / 100`.

| Dimension | Weight | Current completion | Weighted contribution | Basis |
|---|---:|---:|---:|---|
| Core application functionality | 14 | 75% | 10.50 | Many role/workflow APIs and pages; incomplete end-to-end paths. |
| Backend architecture | 10 | 72% | 7.20 | Modular routes and shared access/ingestion; transaction and duplication gaps. |
| Data integrity and security | 14 | 60% | 8.40 | Strong auth/scope controls; sparse loss and incomplete failure assurance. |
| ML methodology and evaluation | 16 | 38% | 6.08 | Good grouped framework, but installed target mismatch and low precision. |
| AI integration | 7 | 65% | 4.55 | Evidence schema and fallback; provider/live governance unverified. |
| UI/UX quality | 10 | 70% | 7.00 | Eight purpose-built spaces; secondary screens uneven. |
| Accessibility | 6 | 68% | 4.08 | Theme/focus and representative axe tests; full inventory unverified. |
| Testing | 9 | 72% | 6.48 | 118 backend and 25 browser passes dated today; key failure paths absent. |
| Reliability | 7 | 50% | 3.50 | REST source of truth; alert retry/recovery and provider gaps. |
| Deployment readiness | 4 | 25% | 1.00 | Archived backend 503; no subsequent passing smoke in repo. |
| Documentation | 3 | 65% | 1.95 | Extensive reports, but model/readme claims stale. |
| **Total** | **100** |  | **60.74 ≈ 61%** | Not an official grade or amount of code completed. |

A plausible 80% gate is: current-target ML package with defensible proxy results, zero silent Withings loss, durable alert reconciliation, complete role/task browser tests and accessibility review, a fresh deployment smoke or documented environmental blocker, and accurate supervisor documents. Raising the categories to approximately core 85, backend 85, security/data 80, ML 70, AI 75, UI 85, accessibility 85, testing 90, reliability 80, deployment 80, documentation 90 yields about **81%** under this rubric. That forecast depends on completing the evidence gates; it is not a promise.

## 17. Top 20 recommended improvements

In priority order: (1) reconcile ML target/artifact; (2) raw `SaO2`/`SpO2` audit; (3) retrain observed-target model; (4) publish honest PR/calibration/alert-burden report; (5) retain shadow mode until validated; (6) persist sparse wearable readings; (7) make assessment/alert processing recoverable; (8) add ingestion idempotency and UTC policy; (9) archive green production smoke; (10) fix model card/README claims; (11) inspect SHAP fallback frequency; (12) separate outlier from population drift; (13) make prospective research outcomes symmetric; (14) consolidate legacy dashboard meanings; (15) redesign dense care tasks; (16) add device sync history; (17) connect alert case lifecycle; (18) full-page theme/responsive/keyboard matrix; (19) negative access/Redis/migration tests; (20) supervisor demo with versioned evidence and explicit limitations. Each maps to the register above; ranking reflects dependencies, not a requirement to ship all 20 by 15 November.

## 18. Suggested implementation order

Start with a **scientific evidence freeze and raw-data audit** (A01/A02/A06): write a one-page current-artifact claim sheet, check actual PhysioNet columns, then regenerate/retrain under a new version. This prevents later UI and documentation from showcasing invalid results. In parallel, design the sparse measurement contract and durable alert assessment state (A03/A04), then implement and fault-test them. Follow with role-flow polish and full visual regression. Finish with a live smoke and reconciled documents. Each stage should have a reviewable artifact and rollback path; do not overwrite the July model artifact before its baseline evidence is preserved.

## 19. Risks and dependencies

Raw PhysioNet access and exact measurement semantics constrain A01/A02; if access is unavailable, explicitly mark the corrected model **not yet trained** and use the July artifact only as a labelled legacy proxy. A sparse schema migration affects ingestion, API response types, risk computation and device UI. Alert outbox/reconciliation affects transaction boundaries and worker deployment. Persistent AI history depends on an approved retention/privacy decision; session-only history is acceptable if clearly labelled. A production smoke depends on provider account/service state, beyond source control. Synthetic screenshots and local tests can support a prototype demonstration but cannot establish clinical efficacy, external generalisation, real-provider success, or production uptime. Worktree changes should be committed in identifiable units before supervisor evidence is tied to a SHA.

## 20. Next supervisor demonstration

Show a synthetic patient journey across doctor, nurse, patient and admin workspaces; a sparse wearable reading received and its missing fields displayed; a deterministic urgent alert created, acknowledged and reconciled after an injected failure; the model intelligence page with **current artifact version, target definition, PR curve, confusion matrix, calibration and shadow-mode label**; an AI answer with sources/missing data/provider state; and light/dark desktop/mobile screenshots. Bring a one-page evidence sheet containing commit SHA, date, backend/browser/CI results, migration and smoke outcome, known limitations, and the weighted completion estimate. If A01/A02 or production smoke remains unresolved, state that plainly rather than implying the system is clinically or operationally validated.

---

### Five decisions for the dissertation plan

1. **Ten most serious weaknesses:** legacy-vs-observed ML artifact claim; oxygen field mismatch; low precision/false alerts; ICU-to-wearable generalisation; sparse Withings data loss; non-atomic vital/alert handling; unverified production backend; incomplete recovery/idempotency; session-only AI history and shallow research outcome collection; incomplete all-route visual/accessibility verification.
2. **Ten most valuable improvements:** raw field audit; observed-target retrain; complete PR/calibration/alert-burden evaluation; sparse measurement model; durable alert outbox; failure/replay tests; fresh production smoke; full role/page accessibility matrix; unambiguous clinical/AI provenance; reconciled model card and supervisor evidence.
3. **Frontend redesign urgency:** first `CareWorkspace` and legacy `/` dashboard, then `AdminOperations`/research forms, device sync and alert case progression; the eight redesigned main workspaces need state-depth testing more than wholesale restyling.
4. **Highest academic value:** valid target construction, grouped and external evaluation with limitations, calibrated threshold/false-alert analysis, reproducible artifact provenance, failure-tolerant ingestion/alerts, and measured role usability/accessibility. Extra charts or AI features add less value without these foundations.
5. **Implement first after audit review:** reconcile the model claim with raw PhysioNet fields and current artifact, then regenerate/retrain the observed-target pipeline. This is the dependency for credible ML results, charts, documentation and the November supervisor demonstration.
