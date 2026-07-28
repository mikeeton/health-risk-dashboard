# Deployment hardening implementation status

Date: 28 July 2026

## Implemented

- Frontend dependency tree updated to zero known npm vulnerabilities.
- React Router upgraded to the patched major release.
- Production build, lint, and browser tests remain green.
- Argon2id password hashing added with transparent legacy PBKDF2 migration.
- Strong password validation added to user, registration-request, and admin
  password-reset payloads.
- Direct public account creation disabled; access requires approval workflow.
- Rotating refresh-token sessions added with hashed token identifiers, reuse
  rejection, expiry, logout revocation, and database migrations.
- Browser auth storage reduced from persistent `localStorage` to
  tab/session-scoped `sessionStorage`.
- Production configuration now rejects default/weak secrets, HTTP CORS,
  unsafe schema-repair mode, missing HTTPS enforcement, invalid request limits,
  and invalid AI timeouts.
- Trusted-host validation, request-size limits, CSP, HSTS, cache prevention,
  frame protection, referrer policy, MIME protection, and permissions policy
  configured.
- Public API docs disabled by default.
- AI question endpoint changed from URL-leaking GET to validated POST.
- AI patient context pseudonymized and reduced to the latest necessary data.
- AI provider model pinned and provider timeout/retry bounds added.
- Untrusted patient/question blocks isolated in prompts.
- AI output constrained to a validated JSON schema before display.
- Provider errors sanitized; detailed provider exceptions are not returned.
- Deterministic emergency keyword response added ahead of model invocation.
- Persistent AI warning and explicit human verification required before copy.
- AI use, prompt version, model, user, and patient reference added to audit log.
- AI remains disabled by default, including the deployment blueprint.
- Backend test suite expanded from 6 to 11 tests.
- AI POST-only, emergency, and pseudonymization tests added.
- Refresh rotation/replay, weak-password, and privilege-registration tests added.
- Database migration upgrade/downgrade cycle verified.
- GitHub CI added with disposable PostgreSQL, migration tests, backend tests,
  frontend audit/build/lint/browser tests, and secret scanning.
- Dependabot configuration added.
- Production preflight script added and included in the Render start command.
- Vercel security headers added.
- Generated Python bytecode, browser reports, results, builds, environments,
  and local databases are ignored; previously tracked bytecode is removed from
  version control.
- Security policy, deployment checklist, production settings, and frontend
  documentation added or updated.
- Default credentials removed from the main README.

## Verified locally

| Gate | Result |
|---|---:|
| Backend tests | 11 passed |
| Authenticated Playwright tests | 6 passed |
| Frontend production build | Passed |
| ESLint | Passed |
| npm audit | 0 vulnerabilities |
| Alembic downgrade/upgrade cycle | Passed |
| Created admin login | Passed |

## Intentionally left for the deployer or qualified reviewers

These cannot be honestly completed by code or by a local development agent:

- Choose and purchase production-grade hosting/database capacity.
- Set production domains, `ALLOWED_HOSTS`, `CORS_ORIGINS`, database URL, and
  secret-manager values.
- Configure DNS and verify HTTPS at the actual production endpoints.
- Configure backup/PITR retention and perform a witnessed restoration drill.
- Connect monitoring/on-call destinations and assign incident owners.
- Complete an independent penetration test.
- Complete a manual WCAG 2.2 AA assessment.
- Obtain privacy/data-protection and clinical-safety approval.
- Decide medical-device/regulatory classification with qualified advisers.
- Sign the AI provider agreement and approve its data residency/retention.
- Build and approve the clinician-reviewed AI evaluation dataset and thresholds.
- Enable `AI_ENABLED=true` only after all AI activation gates pass.
- Execute the final staged deployment, smoke test, and go-live sign-off.

Follow `DEPLOYMENT_CHECKLIST.md` for these remaining actions. Until the human
approval items are complete, deploy only with synthetic data and keep AI
disabled.
