# Phase 8 deployment and dissertation evidence report

Date: 2026-09-14

## Scope

This phase assembled the final dissertation evidence pack, documented the
implemented architecture, added a repeatable production smoke runner, and
checked the public deployment without using or recording credentials.

## Production observation

- The Vercel frontend and `/login` returned HTTP 200 and exposed CSP, HSTS,
  `X-Content-Type-Options`, and `X-Frame-Options` headers.
- The configured Render API returned HTTP 503 for both `/health/live` and
  `/health/ready`; the response was classified as `service_suspended`.
- The authenticated chain was therefore skipped. It was not represented as a
  successful production test.
- The machine-readable result is in
  `docs/dissertation-evidence/deployment/production-smoke-2026-09-14.json`.

## Local production preflight

Against disposable PostgreSQL 16, the full migration chain reached
`20260914_0018`, downgraded to `20260728_0005`, and returned to head. A
production-shaped configuration then passed `backend/scripts/preflight.py`.
The disposable stack and data were removed after verification.

Withings configuration was also checked in fresh processes. Omitting
`WITHINGS_WEBHOOK_SECRET` from an otherwise complete configuration was
rejected, while a complete configuration passed. The value is documented as
an independent secret and is never included in evidence output.

## Final regression results

- Backend: 111 passed, 0 failed, 0 skipped against PostgreSQL 16.
- Migrations: empty upgrade, downgrade rehearsal, re-upgrade, and head check
  passed.
- Frontend lint: passed.
- Frontend production build: passed (3,272 modules transformed).
- Dependency audit: 0 vulnerabilities.
- Playwright: 18 passed and 1 deployment-dependent authenticated test skipped.
- Evidence integrity: all JSON parsed, the evaluation CSV contained 12 rows,
  and `scripts/production_smoke.py` compiled.

Three SHAP/Matplotlib pending-deprecation warnings remain non-failing upstream
warnings.

## Release blocker

The repository is ready for the documented provider-side cutover, but the
production backend is not operational while the Render service is suspended.
Reactivation or creation of the Render service, configuration of Neon and the
provider secret values, and an authorized test account are external actions.
After those actions, rerun `scripts/production_smoke.py` with credentials
supplied only through process environment variables to complete the
authenticated chain.
