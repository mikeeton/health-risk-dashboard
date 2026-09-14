# Withings live-data setup

The application supports Withings blood pressure, heart rate, and SpO2
notifications (`appli=4`). A webhook is only a trigger; the backend fetches the
measurement from Withings with the connected user's OAuth token before storing
it.

## 1. Register the application

Create an application in the Withings Developer Portal and configure:

- OAuth callback:
  `https://YOUR_API_DOMAIN/integrations/withings/callback`
- Notification callback:
  `https://YOUR_API_DOMAIN/integrations/withings/webhook`
- Scopes: `user.info,user.metrics,user.activity`

The notification URL must be public HTTPS, use port 443, and respond to HEAD.
The backend adds a random shared secret to the registered callback URL and
requires it on both HEAD and POST requests. Enter the URL without that query
parameter in configuration; the application appends it during subscription.

Official references:

- https://developer.withings.com/api-reference/
- https://developer.withings.com/developer-guide/v3/data-api/notifications/notification-overview/
- https://developer.withings.com/developer-guide/v3/integration-guide/onsite-mode/data-api/notifications/notification-subscribe/

## 2. Configure the backend

Generate the token-encryption key once:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Generate an independent webhook secret, for example:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Set these secret-manager values:

```text
FRONTEND_URL=https://YOUR_FRONTEND_DOMAIN
WITHINGS_CLIENT_ID=...
WITHINGS_CLIENT_SECRET=...
WITHINGS_REDIRECT_URI=https://YOUR_API_DOMAIN/integrations/withings/callback
WITHINGS_WEBHOOK_URL=https://YOUR_API_DOMAIN/integrations/withings/webhook
WITHINGS_WEBHOOK_SECRET=...
INTEGRATION_ENCRYPTION_KEY=...
REQUIRE_WITHINGS=true
```

Never change `INTEGRATION_ENCRYPTION_KEY` without first reauthorizing connected
accounts; changing it makes existing encrypted OAuth tokens unreadable.
Never reuse the OAuth client secret as `WITHINGS_WEBHOOK_SECRET`, and do not
include the webhook secret in screenshots, logs, or frontend configuration.

## 3. Connect a patient

1. Sign in as an assigned doctor, nurse, or the linked patient.
2. Open the patient dashboard.
3. Select **Connect Withings** for a real account or **Use Withings demo**.
4. Approve the Withings permission screen.
5. Start the dashboard WebSocket stream to receive immediate UI updates.

OAuth tokens are encrypted at rest. Refresh tokens rotate when renewed.
Measurements use the Withings group ID as a unique external ID, so webhook
retries do not create duplicate vital rows.

The connection status records the last complete successful sync and the latest
safe error code/message. The dashboard explicitly warns when complete data is
unavailable or older than 24 hours. OAuth tokens and provider secrets are never
returned by the status endpoint.

## 4. Production behavior

Withings typically delivers notifications in under two minutes but does not
promise real-time delivery on the standard plan. This integration is not an
emergency-monitoring system.

Withings notifications do not provide a signature header for this flow. Their
documented application-layer control is a shared secret in the subscribed
callback URL; network allowlisting is an additional deployment-layer control.
The webhook still treats `userid`, `appli`, and timestamps only as a trigger and
fetches measurements using the stored OAuth authorization.

The current wide vital schema requires heart rate, SpO2, blood pressure, steps,
sleep, activity, and calories in one record. Withings notification groups may
contain only a subset. Such groups are marked unavailable and skipped; the
application never substitutes invented normal values. Supporting sparse
provider observations requires a separately reviewed schema migration and risk
calculation contract.

Notification inbox invalidation uses Redis/Valkey Pub/Sub across backend
instances when `REDIS_URL` is configured. Withings measurement persistence and
deduplication remain PostgreSQL-backed. Live vital fan-out remains tied to the
instance that ingested the webhook, so use one API instance until the vital
stream is also moved to the shared event bus.
