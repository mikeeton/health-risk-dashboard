# Request and risk walkthrough

## Clinical request

1. The React screen calls its domain API module. `httpClient.ts` attaches the short-lived Bearer token and handles one refresh on a 401.
2. FastAPI authenticates the token and identifies the user and role. The browser's selected patient is untrusted input.
3. Patient-scoped routes call the shared access-control functions. A patient may access their own record; a doctor or nurse needs an active `patient_staff_assignments` row. An administrator is not a clinician. Legacy doctor and nurse pointers are not permission grants.
4. The route queries or changes the authorized record, then returns a response. Where applicable, audit events record the actor and action. Alert recipients are selected from active assignments.

For a demonstration, remove a clinician assignment and retry both a read and a write with that clinician's token. The regression test in `backend/tests/test_security.py` also checks that a stale legacy pointer cannot restore access.

## Risk assessment

Validated measurements enter the canonical assessment path described in [Canonical risk assessment](CANONICAL_RISK_ASSESSMENT.md). The application keeps measurement provenance and presents risk output with its evidence and limitations. Model candidates are evaluated using patient-separated partitions and preset gates; a candidate that misses a required threshold is not promoted to inference. See the [model card](../ML_MODEL_CARD.md) and [validation report](../reports/ML_PIPELINE_VALIDATION_REPORT.md) for the exact dataset, metrics, and blocked candidate. These are retrospective research results, not prospective clinical validation.

## Operational boundary

The browser stores access and refresh tokens in session storage. Current session-bound access tokens are rejected after logout or refresh rotation; older unbound tokens can remain usable until expiry. Open live and notification sockets recheck the session before each delivery; legacy unbound tickets expire after their short ticket lifetime. PostgreSQL row locking serializes refresh rotation across workers. Local rate limits are process-local unless shared state is configured. Real wearable, AI, database, and alert-delivery behavior must be verified in the target environment before a deployment claim. Live deployment is paused.
