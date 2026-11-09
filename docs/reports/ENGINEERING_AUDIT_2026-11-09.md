# Engineering audit: 9 November 2026

## Scope and result

This pass reviewed routes, authentication and patient scoping, database migrations and test setup, the frontend API client, AI evidence, saved ML evaluations, integration handling, CI, and the README. It builds on commit `f9c7bc3`, which made active care-team assignments authoritative and split the oversized API client. Routes and response shapes remain stable; access-granting behavior was tightened as described below. Live deployment remains paused.

## Findings and decisions

| Status / severity | Location | Finding and action | Evidence |
| --- | --- | --- | --- |
| Confirmed / High | `backend/tests/conftest.py:11`, `backend/tests/test_security.py:25` | Plain pytest inherited the application database URL; security fixtures commit and delete records. Collection now requires `APP_ENV=test`, a loopback PostgreSQL URL, and a `*_test` name. The local runner creates and removes a fresh database. | Unsafe invocation exited before collection. The disposable database passed migration rehearsal and 166 tests. |
| Confirmed / Medium | `backend/routes/auth.py:169` | Refresh rotation queried an active session without locking it. Two workers could race to rotate the same token. The query now locks the session row before rotating it. | Existing replay and logout tests pass. A true two-worker PostgreSQL race test remains to be added. |
| Confirmed / Low | `backend/middleware.py:42` | An arbitrary caller-supplied request ID was returned in a response header. The middleware now accepts only UUIDs and generates a UUID otherwise. | `backend/tests/test_request_ids.py` covers valid and invalid values. |
| Confirmed / Medium | `backend/main.py:70` | A background monitor exception rolled back without a diagnostic. It now logs only the exception class, avoiding SQL parameter values in exception text. | Backend suite passed; the new message contains no patient values. |
| Confirmed / Medium | `backend/routes/analytics.py:93` | The analytics summary returned the global audit-log count to any authenticated role. Clinical users now see only their own audit count; administrators retain the operations total. | New role-scoping regression test in `backend/tests/test_security.py:929`. |
| Confirmed / High | `backend/main.py:332`, `backend/routes/notifications.py:110` | Existing socket connections rechecked account and patient scope but not session revocation. Delivery checks now reject revoked login sessions; legacy tickets without a session binding expire at their ticket deadline. A disconnect log no longer includes a patient ID. | Logout regression tests cover both socket delivery checks. |
| Confirmed / High | `backend/routes/patients.py:27` | Doctor-created patient records could link any existing patient account and assign a nurse without an administrator action; an omitted nurse ID also selected a default nurse. Creation now assigns only the creating doctor. Staff and account links use administrator workflows. The now-unused role-validation helper was removed. | Negative tests reject account and staff IDs and confirm no automatic nurse assignment. |
| Confirmed / High | `backend/early_warning.py`, `backend/routes/care_workflows.py` | A stale active assignment could still route alerts or care-team messages to a user whose role had changed. Recipient selection now requires the assignment role to match the user's current clinical role and status. | Changed-role alert and care-team tests. |
| Confirmed / Medium | `backend/routes/referrals.py` | A referral recipient could become suspended after request creation but before approval. Approval now rechecks the recipient before creating an assignment. | Existing referral workflow now tests suspended-then-restored approval. |
| Confirmed / Medium | `backend/routes/patients.py` | A global name match returned 409 for an unrelated patient, revealing whether that name existed and incorrectly treating names as unique identifiers. Creation now allows shared names; database IDs identify records. | Duplicate-name creation regression. |
| Confirmed / Low | `frontend/src/app/services/healthService.ts`, `frontend/src/app/utils/liveMonitoring.ts`, `frontend/src/app/utils/storage.ts` | Unused mock data, random vital generation, prompt examples, and local health-data storage code remained in the app. Removed only paths with no application or test references; compatible API exports remain. | Frontend lint and production build. |
| Confirmed / Low | `README.md` | The test count and backend test command were stale, and the plain command could use the development database. The README now points to the disposable runner. | Runner and migration rehearsal executed locally. |
| Confirmed / Low | `frontend/src/app/services/clinicalApi.ts:87`, `frontend/src/app/pages/ReviewCases.tsx` | Review-case API calls used `unknown` payloads and an independently copied page type. Shared request and response types now follow the FastAPI review-case schema. | TypeScript build and ESLint. |
| Reviewed / no defect found | `backend/access_control.py:26`, `backend/routes/assistant.py:702`, `backend/routes/integrations_withings.py:395` | Active assignments scope clinical reads; AI routes check access before context construction. Withings ingestion checks a webhook secret and keeps partial observations separate. | Backend regression suite passed; live provider delivery remains untested. |
| Reviewed / clinical limit | `backend/artifacts/ml-observed-v1/evaluation.json:2479` | Candidate held-out sensitivity 0.5849 misses its 0.60 gate, so `approved_for_inference=false`. Saved ROC-AUC 0.7436, precision 0.0194, threshold 0.0100, and 287.3 false-positive classifications per 1,000 windows agree with the validation report after rounding. | Compared directly with the saved evaluation JSON. No model or prediction behavior changed. |

## Architecture for review

The browser uses domain API modules and `httpClient.ts` for authentication, refresh coordination, and error parsing. FastAPI authenticates the caller; patient-scoped routes use the central assignment-aware query. PostgreSQL stores patients, measurements, alerts, care activity, and audit events. The AI assistant receives controlled pseudonymized context and validates citation IDs and timestamps; deterministic emergency rules run separately. The ML registry requires recorded acceptance gates before loading an artifact for inference. See the [request and risk walkthrough](../architecture/REQUEST_FLOW.md).

## Remaining risks and next work

1. Run a two-worker PostgreSQL refresh race test to verify serialization. A sequential replay test cannot prove concurrency behavior.
2. Browser session storage exposes tokens to script execution if an XSS flaw is introduced. A cookie design would need CSRF protection and a deliberate migration plan.
3. Rate-limit buckets and the AI provider circuit breaker are process-local. Multi-worker production operation needs shared state or a gateway policy.
4. AI citation validation proves a source ID and timestamp exist; it cannot prove every generated clinical statement is supported. Human review and prospective evaluation remain required.
5. Backend dependencies have broad version ranges. Locking and cross-platform rebuild checks are still needed for a reproducible production image.
6. Real wearable delivery, alert recovery, external ML validity, and clinical safety approval remain outside local fixture evidence.
7. The background monitor loop runs once per API worker; database deduplication helps, but a dedicated worker or shared lease is preferable for multi-worker operation.
8. `joblib` deserializes the installed model artifact. Only trusted, verified artifacts should be placed in the configured artifact directory; an untrusted file is a code-execution risk.

## Compatibility

No REST path, response shape, database schema, or model result was changed. Doctor patient-creation requests that try to link a patient account or assign other staff now return 403; omission no longer auto-assigns a nurse. Shared patient names are now allowed. Administrators should use the approval and assignment flows. Referral approval rejects an inactive named recipient until they are active again or a new target is chosen. Backend test invocations now need an explicit local test database; use the provided runner. A legacy WebSocket ticket without a login-session binding now closes at its short ticket expiry, so older clients should sign in again to obtain a bound ticket.

Before the guard was added, the initial focused security run used the configured local development database (`health_ai`); its fixtures created and cleaned up synthetic records. This is the unsafe workflow the guard now blocks. The subsequent full verification used a fresh disposable database, which was removed. No hosted database or saved model artifact was changed.

## Verification commands

- `backend/venv/Scripts/python.exe scripts/run-local-backend-tests.py` from the repository root: clean Alembic upgrade, downgrade to `20260728_0005`, upgrade, **166 passed**. The temporary PostgreSQL database was removed.
- `npm.cmd run lint` and `npm.cmd run build` from `frontend`: both passed.
- `npm.cmd run test:e2e -- --reporter=line` with a separate local Vite server: **40 passed, 1 skipped**. The skipped test needs `E2E_RUN_AUTH=1`, a running backend, and a seeded admin account. Other browser API calls used synthetic fixtures. This browser run preceded the verified-unused frontend cleanup; lint and build were rerun after that cleanup.
- Plain pytest without a test URL and an invocation pointed at a non-test local database both exited before collection as designed.
