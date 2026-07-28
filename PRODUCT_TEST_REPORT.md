# Product Test and Deployment Readiness Report

Date: 28 July 2026

## Executive summary

The Health Risk Dashboard is a credible full-stack prototype with working
role-based access controls, responsive UI coverage, PostgreSQL migrations,
security middleware, audit logging, and a useful clinical workflow surface.
It is not yet ready for handling real patient data in production.

The principal release blockers are:

1. AI privacy, safety, validation, and governance are incomplete.
2. Frontend dependencies include known high-severity vulnerabilities.
3. Authentication/session handling needs hardening.
4. Test coverage is too narrow for the number of clinical and administrative
   workflows.
5. Deployment, monitoring, backup, recovery, and compliance controls are not
   yet demonstrated.

Readiness assessment:

- Portfolio or controlled demonstration: ready after dependency updates.
- Internal testing with synthetic data: nearly ready.
- Pilot using identifiable health data: not ready.
- General clinical production deployment: not ready.

No security review can prove that every vulnerability has been found. This
report records the issues found through executed automated tests, API checks,
dependency analysis, and source-level inspection.

## Tests executed

| Check | Result | Notes |
|---|---:|---|
| TypeScript production build | Pass | Vite production bundle generated |
| ESLint | Pass | No reported errors |
| Backend Python compilation | Pass | Route and core modules compile |
| Backend security suite | Pass after migration | 6 tests passed |
| Playwright public/responsive tests | Pass | 5 tests passed initially |
| Playwright authenticated admin test | Pass | Full suite: 6 tests passed |
| Admin login through live API | Pass | Token accepted by protected routes |
| Admin and audit API access | Pass | Correctly protected |
| Admin clinical patient access | Pass by design | Returned no accessible patients |
| Metrics endpoint without token | Pass | Correctly returned 401 |
| Dependency audit | Fail | 6 known issues: 4 high, 1 moderate, 1 low |
| Live AI model test | Blocked | `GROQ_API_KEY` is not configured locally |

The local database was behind the application schema. Before migration, all
six backend security tests failed because `users.public_id` did not exist.
Applying `alembic upgrade head` corrected the database and all tests passed.
This demonstrates that migration enforcement is a release-critical control.

## P0: release blockers

### AI privacy and third-party processing

- The AI feature sends patient name, age, condition, risk classification,
  vitals, medication details, and recent events to Groq.
- There is no visible consent, data-processing notice, retention explanation,
  provider-region control, or de-identification step.
- A production release needs a legal basis for processing, an approved data
  processing agreement, documented subprocessor review, retention controls,
  and confirmation that the chosen provider and hosting arrangement are
  acceptable for the target jurisdiction.
- Prefer sending the minimum necessary structured data and replacing direct
  identifiers with a short-lived pseudonymous reference.

### AI clinical safety

- Model output is displayed as a structured risk assessment even though the
  model is not required to return a validated schema.
- The parser infers headings from free text. When parsing fails, it inserts the
  generic recommendation "Continue monitoring and review patient vitals
  regularly." That fallback may be unsafe during an emergency.
- There is no deterministic emergency pathway for severe readings or symptoms.
- The UI does not require clinician acknowledgement before AI text is copied
  into a handover or report.
- There is no explicit output confidence, evidence trace, source data timestamp,
  missing-data warning, contraindication check, or distinction between
  measured facts and generated interpretation.
- AI results should never silently change clinical state, diagnoses,
  medications, or escalation status.

Required controls:

1. Use a versioned JSON response schema and reject invalid responses.
2. Run deterministic clinical safety rules before and after model inference.
3. Show the exact source observations and their timestamps beside each claim.
4. Display missing/stale data and uncertainty prominently.
5. Add a persistent "AI-generated—verify before clinical use" notice.
6. Require human confirmation before copying or saving output.
7. Create a clinical safety case and evaluate outputs with qualified clinicians.
8. Add an emergency message independent of the language model.
9. Define prohibited uses and escalation rules per role.

### AI prompt injection and untrusted content

- User questions are concatenated directly into the prompt.
- Patient names, conditions, medication names, and event titles are also
  untrusted database content and are concatenated without delimiters or
  instruction isolation.
- A malicious question or imported clinical field can tell the model to ignore
  its instructions, reveal context, or produce unsafe recommendations.
- Add explicit data delimiters, treat all patient content as quoted data, limit
  question length, reject instruction-like content where appropriate, and run
  adversarial prompt-injection tests.
- Do not depend on a system prompt alone for safety or access control.

### AI request and error leakage

- The Q&A endpoint uses `GET` and places the user's question in the query
  string. Questions may contain symptoms or other health data and can leak into
  browser history, proxy logs, analytics, and infrastructure logs.
- Change AI Q&A to `POST` with a validated JSON body.
- When every provider model fails, the API returns the provider's final error
  text to the user. This may disclose provider details, request identifiers, or
  operational information.
- Return a stable public error code and retain sanitized details only in
  restricted server logs.

### Dependency vulnerabilities

`npm audit` reports six vulnerable packages, including high-severity findings
in React Router, Vite, PostCSS, and brace-expansion. Run the compatible updates,
review lockfile changes, rebuild, rerun tests, and enforce dependency scanning
in CI. Do not expose the Vite development server publicly.

### Secret and environment validation

- `SECRET_KEY` falls back to `dev-secret-change-me`. Production startup should
  fail if this value is missing, weak, or still set to the default.
- Environment variables are parsed with direct `int(...)` calls, which produces
  unclear startup failures for malformed configuration.
- Add environment-aware validation using a typed settings model.
- Confirm `.env`, database exports, test traces, and API keys are excluded from
  source control and deployment artifacts.

### Password and session security

- Password hashing uses PBKDF2-SHA256 with 100,000 iterations and a custom
  storage format. Move to Argon2id or a maintained password library with
  automatic rehashing and configurable work factor.
- Registration requires only eight characters and does not check common or
  compromised passwords.
- Bearer and refresh tokens are stored in `localStorage`, so any successful XSS
  can steal them.
- Refresh tokens appear stateless: add rotation, reuse detection, server-side
  revocation, logout invalidation, and session/device management.
- Prefer short-lived access tokens held in memory and Secure, HttpOnly,
  SameSite cookies for refresh/session material, with CSRF protection where
  applicable.
- Add MFA for administrators and preferably clinicians.

## P1: high-priority improvements

### Test isolation and migration reliability

- Tests currently use the configured local database rather than an obviously
  isolated disposable test database.
- A failed test left the SQLAlchemy session in a failed transaction and caused
  teardown errors, obscuring the original problem.
- Use a dedicated database created per CI run, apply migrations from zero, wrap
  each test in a rollback transaction, and explicitly roll back after setup
  failures.
- Make startup schema validation mandatory in production. The Render
  configuration currently sets `RUN_STARTUP_SCHEMA_CHECK=false`.
- Add a CI migration test covering both a clean install and upgrade from the
  previous release.

### Missing functional coverage

Only six backend tests and six browser smoke tests cover a product with many
routes and roles. Add tests for:

- Login, refresh, logout, token expiry, revocation, inactive accounts, and
  concurrent sessions.
- Rate limiting, including distributed/multi-instance deployment behavior.
- Every admin route with admin, doctor, nurse, patient, and anonymous callers.
- Object-level authorization for every patient-scoped endpoint.
- Referral approval/denial, assignment start/end dates, and race conditions.
- Registration duplication, replay, malformed values, and approval races.
- Medication, event, diagnosis, note, review, escalation, wearable, upload,
  notification, report, and WebSocket workflows.
- Empty, stale, extreme, impossible, and partially missing vital values.
- CSV formula injection, oversized upload, malformed CSV, encoding, duplicate
  rows, and partial transaction failure.
- Pagination, sorting, filtering, bulk datasets, and concurrent edits.
- Browser back/forward, expired sessions, offline behavior, API timeouts, and
  server errors.
- Keyboard-only navigation, screen readers, zoom, reduced motion, high contrast,
  and WCAG 2.2 AA automated/manual checks.
- Chrome, Firefox, Safari/WebKit, Edge, iOS, and Android breakpoints.

The current authenticated responsive browser test injects a fake token and
mocks API responses. Keep it as a layout test, but add genuine role journeys
against a seeded test backend.

### AI evaluation suite

Create a versioned, clinician-reviewed evaluation set covering:

- Normal, borderline, and emergency observations.
- Conflicting, stale, missing, and unit-mismatched data.
- Medication allergies, interactions, renal/hepatic risk, pregnancy, children,
  older adults, and comorbidities.
- Requests to diagnose, prescribe, change doses, or ignore a clinician.
- Self-harm, chest pain, stroke symptoms, sepsis indicators, anaphylaxis, and
  other urgent scenarios.
- Prompt injection, context extraction, cross-patient disclosure, and encoded
  attacks.
- Hallucinated observations, invented medications, incorrect arithmetic, and
  unsupported risk claims.
- Differences among patient, nurse, and doctor response modes.
- Provider outage, timeout, rate limit, malformed output, and model retirement.

Measure factual consistency, omission of critical facts, harmful advice,
escalation recall, calibration, demographic performance, latency, cost, and
inter-rater agreement. Pin an approved model/version; the current fallback list
can change behavior significantly between requests and makes validation harder.

### AI operational controls

- Add strict provider timeouts and bounded retries.
- Use a circuit breaker and queue/concurrency limits.
- Cache only when privacy-safe and keyed to an immutable input version.
- Record model, model version, prompt-template version, input record versions,
  output, reviewer, outcome, latency, and failure code in a protected AI audit
  trail.
- Do not log full prompts or health data in general application logs.
- Add cost budgets, usage monitoring, provider health alerts, and a kill switch.
- Define what happens when the AI provider or internet connection is down.

### Rate limiting

- Rate limits are stored in process memory. They reset on restart and do not
  coordinate across multiple workers or instances.
- Move to a shared store such as Redis and key sensitive operations by a safe
  combination of IP, account, and action.
- Apply stricter limits to AI, password reset, registration, exports, uploads,
  and WebSocket connections.
- Confirm trusted proxy parsing for the actual hosting topology.

### API and browser hardening

- Add a Content Security Policy. Current headers include frame, MIME, referrer,
  permissions, and cache protections, but no CSP or HSTS.
- Add HSTS only after HTTPS is enforced for all production subdomains.
- Disable or protect `/docs` and `/openapi.json` in production if public API
  documentation is not intended.
- Validate allowed hosts and proxy headers.
- Add explicit maximum request/body/upload sizes.
- Avoid hard-coded HTTP and WebSocket localhost fallbacks in production builds;
  validate frontend environment configuration during build.

### Data integrity

- Validate medically plausible ranges and measurement units on the server.
- Preserve source, device, unit, timestamp, timezone, verification state, and
  correction history for every observation.
- Use optimistic locking or version columns to prevent silent lost updates.
- Make destructive and safety-relevant changes append-only or fully audited.
- Define duplicate detection and idempotency keys for device and upload inputs.
- Store times consistently in UTC and display the user's clinical timezone.

## P2: product and operational improvements

### Observability

- Replace `print()` calls with structured, severity-based logging.
- Do not print provider exception bodies directly.
- Add error aggregation, distributed traces, database pool metrics, migration
  status, queue/provider metrics, and business-level safety alerts.
- Protect metrics and avoid high-cardinality or patient-identifying labels.
- Create dashboards and alerts for authentication attacks, access denials,
  unusual exports, AI failures, latency, database capacity, and backup failures.

### Backup and disaster recovery

- Document automated encrypted backups, retention, restoration, point-in-time
  recovery, and region failure strategy.
- Perform and record restoration drills.
- Define RPO, RTO, incident ownership, breach response, and downtime workflows.
- A free hosting/database plan is unsuitable for a clinical production service
  without verified availability, backup, support, and data-processing terms.

### Privacy and compliance

- Complete data mapping, retention/deletion rules, subject-access/export
  processes, purpose limitation, and least-privilege review.
- Encrypt data in transit and at rest and define key rotation.
- Add audit-log retention and tamper-evidence.
- Review UK GDPR/Data Protection Act requirements and, depending on intended
  use, NHS DSPT/DTAC, clinical safety standards, and medical-device
  classification with qualified legal and clinical-safety professionals.
- Avoid claiming diagnosis or treatment capability until the regulatory
  position and evidence support it.

### Accessibility and UX

- Run automated axe checks and manual assistive-technology testing.
- Ensure dynamic toasts, validation errors, loading states, notifications, risk
  changes, and AI responses have appropriate live-region behavior.
- Ensure risk is not communicated by color alone.
- Verify chart alternatives, table headers, focus management, modal trapping,
  touch target sizes, error recovery, and session-expiry messaging.
- Add clear data freshness, timezone, source, and connection-status indicators.
- Separate simulated readings visibly and permanently from real device data.

### Documentation and release engineering

- Replace the frontend's template README with project-specific instructions or
  link clearly to the root documentation.
- Remove development credentials from prominent production documentation and
  ensure seed scripts cannot run accidentally in production.
- Pin Python dependencies with hashes or use a lockfile and automate updates.
- Add CI gates for lint, build, unit/integration tests, browser tests,
  migrations, dependency scanning, secret scanning, SAST, and artifact review.
- Use separate development, test, staging, and production databases/accounts.
- Add a release checklist, rollback procedure, data-migration plan, and
  post-deployment smoke tests.
- Remove tracked `__pycache__`, test reports, browser traces, builds, local
  databases, and virtual environments.

## Suggested delivery sequence

### Phase 1: secure engineering baseline

1. Update vulnerable dependencies.
2. Enforce strong production settings and schema checks.
3. Move tests to disposable databases and expand authorization coverage.
4. Harden passwords, sessions, rate limiting, headers, and secrets.
5. Add CI/CD security and release gates.

### Phase 2: safe AI redesign

1. Complete privacy/provider assessment.
2. Replace GET Q&A with validated POST requests.
3. Minimize and pseudonymize model inputs.
4. Introduce schema-constrained outputs and deterministic safety rules.
5. Add human verification and an AI audit trail.
6. Build and pass the clinician-reviewed evaluation suite.

### Phase 3: clinical and operational readiness

1. Validate all clinical rules and workflows with qualified users.
2. Complete accessibility and usability testing.
3. Implement monitoring, backup, recovery, and incident procedures.
4. Complete legal, privacy, clinical-safety, and regulatory assessments.
5. Run a synthetic-data staging pilot, then a tightly controlled real-world
   pilot only after formal approval.

## Exit criteria for deployment with real health data

- Zero unresolved critical/high dependency or application vulnerabilities, or
  formally accepted mitigations.
- Full migrations from clean and previous-release databases pass in CI.
- Every protected route has role and object-level authorization tests.
- AI safety/privacy controls and clinician-reviewed evaluations pass agreed
  thresholds.
- Backups and disaster recovery are tested.
- Monitoring, alerting, incident response, and rollback are operational.
- WCAG 2.2 AA assessment is complete.
- Privacy, security, clinical safety, and regulatory approvals are documented.
- A staging environment passes end-to-end, load, failure, and penetration tests.

