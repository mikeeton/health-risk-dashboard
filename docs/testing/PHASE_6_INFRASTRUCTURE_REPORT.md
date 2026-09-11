# Phase 6 infrastructure and CI verification

Verification date: 11 September 2026

## Scope and environment

This verification used Docker Engine 29.7.2, Docker Compose 5.4.0,
PostgreSQL 16 Alpine, Python 3.14.5, Node.js 22.22.0, and npm 10.9.4 on
Windows. The database was the disposable `health-risk-dashboard-test` Compose
stack; no developer or hosted database was used. Redis was not started for the
core backend run.

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| Empty-database migration | Pass | All revisions from baseline through `20260807_0017` applied. |
| Downgrade/upgrade rehearsal | Pass | Downgraded from head to `20260728_0005`, upgraded to head, and `alembic current --check-heads` reported `20260807_0017 (head)`. |
| Backend pytest suite | Pass | 107 passed, 0 failed, 0 skipped; 3 SHAP/Matplotlib pending-deprecation warnings; 71.52 seconds. |
| npm clean install | Pass | 301 packages installed and 302 audited. |
| npm security audit | Pass after compatible lock update | 0 vulnerabilities. |
| ESLint | Pass | `npm run lint` exited 0. |
| TypeScript and Vite production build | Pass | 3,271 modules transformed; build completed in 12.97 seconds. |
| Playwright Chromium suite | Pass with one documented conditional skip | 18 passed, 1 skipped; 48.1 seconds. |
| CI gate inspection | Pass | Migrations, pytest, npm audit, lint, build, Chromium Playwright, and gitleaks are present. |

## Dependency remediation

The first `npm audit --audit-level=high` reported three transitive findings:

- high: `nanoid` 3.3.16 through PostCSS/Vite;
- moderate: `dompurify` 3.4.12 through jsPDF; and
- moderate: `fflate` 0.8.2 through jsPDF.

A non-forced `npm audit fix` updated only the lockfile resolutions to
`nanoid` 3.3.19, `dompurify` 3.4.15, and `fflate` 0.8.3. Direct dependency
ranges and `package.json` did not change. A subsequent clean install and audit
reported zero vulnerabilities.

## Failure classification

No application assertion failed in the final backend or frontend runs.

Environment and runner issues were kept separate:

- Docker Desktop was initially stopped; starting its engine made the isolated
  database available.
- The machine's PowerShell policy rejected unsigned `.ps1` files. The documented
  process-scoped `-ExecutionPolicy Bypass` invocation ran without changing the
  machine or user policy.
- The first Playwright run used four workers and produced three Windows Chromium
  worker exits plus two navigation timeouts: 13 passed, 5 failed, and 1 skipped.
  All five failed cases passed immediately with one worker. The committed
  Playwright configuration now uses one worker, after which the complete suite
  passed with 18 tests and the existing deployment-dependent test skipped.

The three backend warnings originate in SHAP's colour-map setup and do not
represent test assertions or PostgreSQL failures. Playwright's expected
expired-session scenario logs two failed patient fetches while verifying clean
redirect behaviour.

## Reproduction

Run the database migration and backend checks from the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\test-postgresql.ps1
```

Run the frontend checks from `frontend`:

```powershell
npm.cmd ci
npm.cmd audit --audit-level=high
npm.cmd run lint
npm.cmd run build
npm.cmd run test:e2e -- --project=chromium
```

The `.cmd` form avoids this Windows installation's unsigned PowerShell shim;
CI continues to use the platform-neutral npm commands already in the workflow.
