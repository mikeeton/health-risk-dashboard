# Deployment checklist

## Automated gates

- [ ] GitHub CI is green on the exact commit being deployed.
- [ ] `npm audit --audit-level=high` reports zero high/critical findings.
- [ ] Alembic migrates a clean database and the previous release database.
- [ ] Backend, frontend, authorization, AI-safety, and browser tests pass.
- [ ] Secret scanning reports no credentials.

## Required environment

- [ ] `APP_ENV=production`
- [ ] Unique random `SECRET_KEY` of at least 32 characters
- [ ] PostgreSQL production `DATABASE_URL`
- [ ] Private `REDIS_URL` and `REQUIRE_REDIS=true`
- [ ] HTTPS-only `CORS_ORIGINS`
- [ ] Exact production `ALLOWED_HOSTS`
- [ ] `FORCE_HTTPS=true`
- [ ] `PUBLIC_API_DOCS=false`
- [ ] `RUN_STARTUP_SCHEMA_CHECK=false`
- [ ] Exact `FRONTEND_URL` also listed in `CORS_ORIGINS`
- [ ] Withings callback and webhook are public HTTPS URLs on the API domain
- [ ] `REQUIRE_WITHINGS=true` and all Withings secrets supplied
- [ ] `REQUIRE_SENTRY=true` and backend/frontend Sentry DSNs supplied
- [ ] `AI_ENABLED=false` until the AI governance approval below is complete
- [ ] Separate development, staging, and production accounts/databases

## Infrastructure and operations

- [ ] Paid production-grade database/hosting plan selected
- [ ] Encryption in transit and at rest confirmed
- [ ] Automated backups, retention, PITR, and restore drill verified
- [ ] Monitoring, alerting, on-call ownership, incident plan, RPO, and RTO agreed
- [ ] Staging smoke, load, failure, rollback, and penetration tests passed
- [ ] Production admin created with MFA-capable identity controls
- [ ] All demonstration accounts and passwords removed

## AI activation gate

- [ ] Provider data-processing agreement and regional/retention controls approved
- [ ] Data protection impact and subprocessor reviews approved
- [ ] Clinician-reviewed evaluation set passes agreed safety thresholds
- [ ] Prompt/model version is pinned and documented
- [ ] Emergency, prompt-injection, outage, and malformed-output tests pass
- [ ] AI audit trail, monitoring, cost limits, and kill switch verified
- [ ] Human-review workflow and user notices approved

## Human approvals that code cannot complete

- [ ] Data protection/privacy approval
- [ ] Clinical safety officer approval and clinical safety case
- [ ] Regulatory/medical-device classification decision
- [ ] Accessibility audit (WCAG 2.2 AA)
- [ ] Independent penetration test
- [ ] Backup restoration witnessed
- [ ] Go-live and rollback owners sign off
