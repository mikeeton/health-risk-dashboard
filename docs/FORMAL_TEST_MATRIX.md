# Formal test matrix

| Risk | Automated coverage | Required deployment exercise |
|---|---|---|
| Patient-to-patient leakage | API authorization and assignment tests | Attempt cross-patient access for every endpoint and role |
| Assignment removal | Role/assignment tests | Remove doctor and nurse while sessions are active |
| Concurrent acknowledgement | Status workflow and audit trail | Two-browser database concurrency test |
| Duplicate Withings webhook | Idempotency tests | Replay a signed production-shaped webhook |
| Redis outage | Notification fallback behavior | Stop Redis during a WebSocket session |
| Groq timeout/malformed output | Assistant safety/schema tests | Inject timeout and invalid JSON in staging |
| PostgreSQL restart | Readiness endpoint | Restart managed database during staging load |
| Expired sessions | Authentication tests | Browser expiry and refresh behavior |
| Critical overrides ML | Deterministic safety tests | Submit every boundary value in staging |
| Cross-instance deduplication | Database cooldown | Run two API instances against one PostgreSQL/Redis pair |

Deployment exercises are not marked complete by unit tests. Record dates, operators, build SHA, evidence and defects in the testing appendix.
