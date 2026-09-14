# Phase 7 integration-hardening report

Verification date: 14 September 2026

## Withings state and missing data

Migration `20260914_0018` adds `last_successful_sync`, `last_error_at`,
`last_error_code`, and `last_error_message` to each Withings connection. The
authenticated status endpoint derives `healthy`, `stale`, `error`, or
`disconnected` state without returning OAuth tokens or provider secrets. The UI
shows the last successful complete sync and explicitly warns about stale,
failed, or unavailable data.

The existing wide vital row requires all clinical and lifestyle fields.
Provider groups that omit any required field remain unpersisted and are now
recorded as `missing_required_fields`; no normal values are invented. Sparse
provider observations require a separately reviewed persistence and risk-model
contract.

## Withings notification security

The official notification guidance was reviewed on 14 September 2026:

- https://developer.withings.com/developer-guide/v3/data-api/notifications/notification-overview/
- https://developer.withings.com/developer-guide/v3/integration-guide/onsite-mode/data-api/notifications/notification-subscribe/

Withings documents a random shared query parameter in the subscribed callback
URL, with dynamic IP allowlisting as an additional network-layer control. It
does not document a signature header for this notification flow. The backend
therefore appends `WITHINGS_WEBHOOK_SECRET` when registering the callback and
uses constant-time comparison for HEAD and POST requests. It does not invent a
signature scheme or expose the secret through configuration/status responses.

Webhook body values continue to act only as a user/category/time-window trigger.
The backend identifies an existing OAuth connection and fetches measurements
from the authenticated Withings Data API before validation and persistence.

## WebSocket separation and authentication

The live WebSocket transport now authenticates, checks patient access,
subscribes, and sends records. Synthetic generation and its risk calculation
live in `simulator_service.py` and retain the previous payload contract.

The main access token is no longer placed in WebSocket URLs. An authenticated
POST exchanges it for a signed 60-second ticket scoped to either notifications
or one patient-specific live-vital stream. The ticket cannot authenticate REST
requests, another socket audience, or another patient. Ticket acquisition uses
the frontend's existing refresh-aware request path.

## Optional Redis resilience

PostgreSQL and REST polling remain authoritative. If Redis is absent, the
notification socket polls as before. If configured Redis fails during an active
subscription, the exception is contained, resources are closed defensively,
and the loop returns to a bounded polling interval rather than closing the
WebSocket. Redis remains optional.

## Verification results

| Check | Result |
| --- | --- |
| Targeted integration tests | 13 passed |
| Empty PostgreSQL migration to head | Passed at `20260914_0018` |
| Downgrade to `20260728_0005` and re-upgrade | Passed |
| Full backend suite on isolated PostgreSQL | 111 passed, 0 failed, 0 skipped; 3 SHAP dependency warnings |
| npm audit | 0 vulnerabilities |
| ESLint | Passed |
| TypeScript and Vite production build | Passed; 3,272 modules transformed |
| Playwright Chromium | 18 passed, 1 existing deployment-dependent skip |

The first PostgreSQL command was unable to contact Docker because Docker
Desktop had stopped. No migration or assertion ran in that attempt. After the
engine was restarted, the complete workflow passed and removed its disposable
container, network, and data.

## Remaining boundaries

- The shared-secret webhook control should be combined with Withings IP
  allowlisting at the hosting/network layer where dynamic allowlists are
  operationally supported.
- The 60-second socket ticket is deliberately short-lived and scoped but is not
  a server-side one-use credential; adding one-use state would require a shared
  transactional ticket store for multi-instance deployment.
- Notification invalidation is Redis-capable across instances, but live vital
  fan-out still uses the process-local subscriber registry.
- Consumer Withings delivery has no emergency-monitoring guarantee, and sparse
  measurements are reported rather than converted into complete clinical rows.
