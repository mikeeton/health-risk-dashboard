# Security and reliability evidence

Generated evaluation artifacts:

- [`../evaluation/security_boundary.json`](../evaluation/security_boundary.json)
- [`../evaluation/groq_independence.json`](../evaluation/groq_independence.json)
- [`../evaluation/shadow_mode.json`](../evaluation/shadow_mode.json)

The 14 September 2026 isolated-PostgreSQL run completed 111 backend tests with
zero failures and zero skips. It included patient-scope authorization,
pseudonymised assistant context, Withings webhook shared-secret verification,
short-lived WebSocket ticket scoping, Redis failure fallback, deterministic
critical overrides, ingestion validation, and ML governance tests.

This supports claims about implemented and tested controls. It does not prove
penetration-test coverage, regulatory compliance, resistance to every attacker,
provider availability, or safety with identifiable clinical data.
