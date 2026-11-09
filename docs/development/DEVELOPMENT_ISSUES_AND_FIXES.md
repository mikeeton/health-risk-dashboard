# Development decisions and verified fixes

This is a concise record of important engineering decisions. Dated reports in
[`../reports/`](../reports/README.md) contain the fuller history.

| Area | Decision and reason | Verification and limit |
| --- | --- | --- |
| Database | Require explicit PostgreSQL and Alembic migrations. Silent fallback previously obscured the real database state. | Disposable PostgreSQL rehearsal is described in [`../testing/LOCAL_POSTGRESQL.md`](../testing/LOCAL_POSTGRESQL.md). |
| Test isolation | A plain pytest run previously used the application `DATABASE_URL`, so fixture cleanup could touch development records. The suite now requires an explicit local `*_test` URL and a local runner creates a new database. | Verified unsafe invocation exits before collection; isolated migration rehearsal and 166 tests pass. |
| Socket revocation | Long-lived sockets previously checked user and patient scope but could outlive a revoked login session. Each delivery now checks the session; older unbound tickets expire at their ticket deadline. | Logout security regression and full backend suite. |
| Clinical access | Active staff assignment rows are authoritative. Legacy patient columns cannot restore revoked access. | Security regression tests cover clinical routes; migration `20261109_0021` imports only roles with no assignment history. |
| Patient creation | Doctors may create a record for their own care, but cannot link another account or assign staff. Names are not unique identifiers. | Negative authorization tests and shared-name regression. Administrator approval and assignment remain the access-granting paths. |
| Registration | Direct staff registration is rejected before user creation; administrator approval creates the staff account. | Backend security tests cover both paths. |
| Role scope | Administrators manage operations while clinical routes require patient ownership or active assignment. | Role and route tests; frontend visibility is not a security boundary. |
| API client | Requests are grouped by domain behind the `api.ts` compatibility facade; `httpClient.ts` handles authentication and errors. | TypeScript build, lint, and browser error-format test. Remaining endpoint types can be strengthened incrementally. |
| Theme and layout | Theme follows the device until changed; pages respond to phone and tablet widths. | Playwright theme, overflow, and accessibility checks; manual assistive-technology review is still needed. |
| Risk model | Inference is gated by evaluation thresholds and provenance. | Model card and [`../reports/ML_PIPELINE_VALIDATION_REPORT.md`](../reports/ML_PIPELINE_VALIDATION_REPORT.md). Retrospective proxy results do not establish clinical validity. |

## Open constraints

- Clinical deployment requires prospective validation, safety review, and governed operating procedures.
- Current session-bound access tokens are rejected after logout or refresh rotation. Older tokens issued without session binding can remain valid until expiry; browser session storage also remains a token-exposure risk under XSS.
- Production readiness depends on real database migration, secrets, monitoring, and provider testing. Live deployment is paused.
