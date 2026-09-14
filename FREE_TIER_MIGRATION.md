# Free-tier migration checklist

No account changes, deployment, data copy, billing change, secret rotation, or old-service deletion is performed by this repository change.

## Before deployment

- [ ] Create a Neon project/database and copy its **pooled** PostgreSQL connection string.
- [ ] Copy the Neon **direct** connection string separately for Alembic and `pg_restore`.
- [ ] Confirm both strings specify `sslmode=require`; keep them out of Git and logs.
- [ ] If the old Render PostgreSQL service is accessible, make a custom-format `pg_dump` and validate it before importing. If it is suspended, restore access in the Render dashboard first; this code cannot determine account status.
- [ ] Create an Upstash Redis database and copy the TLS `rediss://` endpoint. Redis is optional; leave `REDIS_URL` blank if it is not used.
- [ ] Generate a new, unique `SECRET_KEY` of at least 32 characters. Do not reuse or rotate an existing deployment key as part of this code review.

## Render backend

- [ ] Review the Blueprint diff before syncing it. Removing resources from `render.yaml` does **not** authorize deleting old Render resources.
- [ ] Create/sync only the `health-risk-dashboard-api` web service on plan `free` with root directory `backend`.
- [ ] Set `DATABASE_URL`, `SECRET_KEY`, and any optional secret values in the Render dashboard.
- [ ] Set `CORS_ORIGINS` and `FRONTEND_URL` to the final Vercel origin (no path or trailing slash).
- [ ] Set `ALLOWED_HOSTS` to the new Render hostname (hostname only).
- [ ] Run `alembic upgrade head` once against the Neon **direct** URL from a trusted local/CI environment before starting application traffic.
- [ ] Verify `/health/live`, then `/health/ready`; expect Redis to show `not_configured` or degraded without failing readiness.
- [ ] Record the new backend origin: `https://________________.onrender.com`.

## Vercel frontend

- [ ] Import the repository with root directory `frontend`.
- [ ] Set `VITE_API_BASE_URL=https://________________.onrender.com` for Production (and Preview if desired).
- [ ] Deploy and verify login, REST calls, and a WebSocket connection (`wss://`).
- [ ] Record the frontend origin: `https://________________.vercel.app`.

## Optional services and GitHub

- [ ] Upstash: set `REDIS_URL=rediss://...`; keep `REQUIRE_REDIS=false` for the single-instance demo.
- [ ] Groq: leave `AI_ENABLED=false` and `GROQ_API_KEY` blank unless the documented governance gates are satisfied.
- [ ] GitHub repository variable `PRODUCTION_API_URL`: set the new Render origin.
- [ ] GitHub repository variable `PRODUCTION_FRONTEND_URL`: set the final Vercel origin.
- [ ] Run the Production Health Monitor manually once.
- [ ] Establish a manual backup calendar and periodically test a restore into an isolated Neon branch/database.

## After acceptance

- [ ] Keep old Render services unchanged until the Neon row counts, migrations, application flows, and backup restore have been verified.
- [ ] Only then decide separately whether to suspend/delete paid resources or change billing.
