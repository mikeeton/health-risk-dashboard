# Security overview

This page describes the current design. For private vulnerability reporting and deployment conditions, use the [security policy](security/SECURITY.md).

| Boundary | Current control | Limit |
| --- | --- | --- |
| Accounts | Approval workflow, role checks, MFA support, password hashing | Organisational identity review is external to the code |
| Patient records | Backend assignment and ownership checks | Must be maintained on every new patient-scoped route |
| Browser sessions | HttpOnly refresh cookie, request-verification token, short-lived bearer access token, server-side session revocation | Access tokens remain readable to browser script until expiry; XSS prevention remains essential |
| API clients | Rotating refresh token with hashed session identifier and PostgreSQL row lock | JSON refresh tokens are still available to non-browser clients |
| AI assistant | Governed opt-in, bounded context, schema and citation checks, deterministic emergency path | Citations cannot prove that generated medical statements are clinically supported |
| Operations | Audit records, request limits, TLS and host configuration, optional Redis shared state | Without Redis, rate limits and AI circuit state are process-local |

The [engineering audit](reports/ENGINEERING_AUDIT_2026-11-09.md) records dated findings; the [deployment checklist](setup/DEPLOYMENT_CHECKLIST.md) lists gates that still require accountable review. Local automated tests do not establish penetration-test completion, real-world clinical safety, or regulatory approval.
