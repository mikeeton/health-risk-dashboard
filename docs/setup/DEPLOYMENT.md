# Free-tier deployment guide

This guide targets a university/portfolio demonstration: Vercel Free for the React/Vite frontend, one Render Free FastAPI web service, Neon Free PostgreSQL, optional Upstash Redis Free, optional Groq, and GitHub Actions for monitoring. It is not suitable for real patient data, clinical production, regulated workloads, or availability-sensitive care.

```mermaid
flowchart TB
  User -->|HTTPS| Vercel[Vercel Free frontend]
  Vercel -->|HTTPS REST / WSS| Render[Render Free FastAPI\none Uvicorn worker]
  Render -->|TLS, pooled runtime connection| Neon[Neon Free PostgreSQL]
  Render -.->|optional TLS Redis| Upstash[Upstash Redis Free]
  Render -.->|optional, disabled by default| Groq[Groq API]
  Actions[GitHub Actions] -->|every ~6 hours| Render
  Actions --> Vercel
```

PostgreSQL is mandatory and remains the durable source of truth. Redis only distributes notification hints; authentication, authorization, patient isolation, and records remain database-backed. Groq is disabled unless both `AI_ENABLED=true` and a key/governance configuration are supplied.

## Environment matrix

| Variable | Configure in | Purpose |
|---|---|---|
| `DATABASE_URL` | Render | Neon pooled PostgreSQL URL for runtime; must use TLS |
| `DATABASE_SSLMODE` | Render | `require` unless already governed by the URL |
| `DATABASE_POOL_SIZE`, `DATABASE_MAX_OVERFLOW` | Render | Conservative runtime connections (`2` and `1`) |
| `REDIS_URL` | Render, optional | Upstash TLS Redis URL beginning `rediss://` |
| `REQUIRE_REDIS` | Render | Keep `false` for optional demo fan-out |
| `SECRET_KEY` | Render secret | Unique JWT signing secret, at least 32 characters |
| `CORS_ORIGINS` | Render | Exact comma-separated HTTPS Vercel origins; never `*` |
| `FRONTEND_URL` | Render | Canonical Vercel origin |
| `ALLOWED_HOSTS` | Render | Render/custom API hostnames only, without scheme |
| `FORCE_HTTPS` | Render | Must be `true` in production |
| `GROQ_API_KEY` | Render, optional | Groq credential; leave blank when AI is disabled |
| `AI_ENABLED` | Render | Defaults to `false`; governance checks still apply |
| `AI_MEMORY_ENCRYPTION_KEY` | Render, conditional | Required by existing real-data AI policy |
| `INTEGRATION_ENCRYPTION_KEY` | Render, conditional | Encrypts configured Withings integration data |
| `WITHINGS_WEBHOOK_SECRET` | Render, conditional | Independent random secret appended to the registered Withings callback URL |
| `VITE_API_BASE_URL` | Vercel | New public Render backend origin |
| `PRODUCTION_API_URL` | GitHub variable | Health monitor backend origin |
| `PRODUCTION_FRONTEND_URL` | GitHub variable | Health monitor frontend origin |

See the placeholder-only `backend/.env.production.example` and `frontend/.env.production.example` for the remaining existing controls. Never commit `.env` files.

## 1. Create Neon PostgreSQL

1. In Neon, create a project and database in an appropriate nearby region.
2. In **Connect**, select the database/role and enable the pooled connection option. Copy the pooled PostgreSQL URL to Render as `DATABASE_URL`.
3. Copy a direct (non-pooler) URL for schema migrations and data import. Keep it only in a local secret store/environment variable.
4. Confirm the supplied URL includes `sslmode=require`. This application also accepts the legacy `postgres://` alias and normalizes it for SQLAlchemy/psycopg2.
5. Before application traffic, run migrations against the direct URL:

```bash
cd backend
DATABASE_URL='postgresql://...direct...?sslmode=require' alembic upgrade head
alembic current
```

On PowerShell, assign the secret through the process environment without putting it in shell history, then run the same Alembic commands. Alembic migrations preserve the existing schema; do not run schema resets or `Base.metadata.drop_all`.

## 2. Migrate existing Render data safely

Do this only while the old database is accessible and with separately obtained credentials. A suspended/expired Render database may be inaccessible; repository code cannot inspect or reactivate it. Do not delete it during cutover.

```bash
pg_dump --format=custom --no-owner --no-acl \
  --dbname="$OLD_RENDER_DATABASE_URL" \
  --file=render-before-neon.dump

pg_restore --list render-before-neon.dump > render-before-neon.contents.txt

pg_restore --exit-on-error --no-owner --no-acl \
  --dbname="$NEON_DIRECT_DATABASE_URL" \
  render-before-neon.dump
```

For a populated Neon target, prefer a new empty Neon branch/database and rehearse there. Do not use `--clean`, `--create`, or destructive resets. After restore, run `alembic current`, compare migration revision and per-table row counts, test all roles, and retain the dump securely according to its data classification. If conflicts occur, stop and investigate rather than overwriting rows.

No automated database backup is included because a GitHub-hosted workflow would require broad database and storage credentials. Schedule manual encrypted `pg_dump --format=custom` exports to approved storage and periodically test `pg_restore` into an isolated database.

## 3. Create optional Upstash Redis

1. Create a Redis database in Upstash and choose a nearby region.
2. From the database Connect page, copy the TCP TLS endpoint containing username/password, in the form `rediss://default:...@...:port` (not the REST URL).
3. Set it as Render `REDIS_URL`; keep `REQUIRE_REDIS=false`.

The client uses TLS based on `rediss://`, bounded socket timeouts, and no URL logging. If Redis is absent/down, committed records and access controls remain intact; live cross-instance hints degrade to polling/single-process behavior and readiness reports the optional degradation. Do not use an in-process fallback for security state.

## 4. Configure Render Free

1. Push/review this branch and create a Render Blueprint/Web Service from the repository. Syncing the Blueprint may identify old resources no longer declared; do not approve deletion of the old database, Key Value service, or cron until rollback is no longer needed.
2. Confirm: root `backend`, runtime Python, plan `free`, build `pip install -r requirements.txt`, start `python scripts/start_render.py`, health path `/health/ready`.
3. Supply external values for `DATABASE_URL`, `SECRET_KEY`, and optional credentials. Override `CORS_ORIGINS`, `FRONTEND_URL`, and `ALLOWED_HOSTS` after final URLs are known.
4. Run the Alembic command explicitly against Neon before deployment. The web start command intentionally does not migrate or train.
5. Deploy and record `https://<new-service>.onrender.com`. Verify `/health/live` and `/health/ready`.

The launcher binds one Uvicorn worker to Render's `0.0.0.0:$PORT`. The model is deserialized once on first inference; metadata-only readiness does not import SHAP or load the model. A free service can sleep and take roughly a minute to respond on first request and has only 512 MB RAM.

## 5. Configure Vercel

1. Import the repository and set project root to `frontend`.
2. Keep framework Vite, install `npm ci`, build `npm run build`, output `dist`.
3. Set production `VITE_API_BASE_URL=https://<new-service>.onrender.com`; production builds intentionally fail when it is absent or non-HTTPS.
4. Deploy and copy the final Vercel origin back to Render `CORS_ORIGINS` and `FRONTEND_URL`. Redeploy the backend.
5. Test login and live updates. WebSocket URLs derive from the API URL and become `wss://` when the API uses HTTPS.

## 6. Optional Groq

Leave `AI_ENABLED=false` and `GROQ_API_KEY` unset for the safe default. If enabling it, set the key only in Render and satisfy the existing classification, DPA, retention, regional-processing, audit, clinical-approval, and encryption gates. Provider access does not make this project clinically approved.

## 7. GitHub monitoring

Set repository **Variables** (not secrets) `PRODUCTION_API_URL` and `PRODUCTION_FRONTEND_URL` to public origins. The workflow runs at minute 17 every six hours and manually, checks backend first, permits bounded cold-start retries, classifies timeouts/connectivity/readiness/likely suspension failures without printing response bodies, then checks the frontend. Concurrency prevents overlap. GitHub schedules can be delayed.

## Rollback

1. Stop new writes or place the demo in a controlled maintenance window.
2. Point Vercel `VITE_API_BASE_URL` back to the old backend and redeploy.
3. Restore the old backend's CORS/host configuration if it was changed.
4. If writes occurred on Neon, export and reconcile them explicitly before returning to the old database; never overwrite the old database blindly.
5. Keep Neon/Upstash and the new service until rollback validation and data reconciliation finish. Resource deletion and billing changes are separate manual decisions.

## Troubleshooting

- **HTTP 503:** Check `/health/ready`. A database failure is essential; optional Redis reports degraded. A sleeping Render service may first time out. Dashboard suspension/billing messages require account action.
- **Database TLS:** Use the Neon-provided URL with `sslmode=require`; avoid duplicating conflicting SSL parameters. Use pooled URL for runtime and direct URL for Alembic/import.
- **Migration errors:** Use the direct URL, run `alembic current`/`alembic heads`, and stop on revision or object conflicts. Never stamp or reset without understanding the data state.
- **CORS:** Use exact HTTPS origins, no trailing paths and no wildcard with authenticated requests. `FRONTEND_URL` must also appear in `CORS_ORIGINS`.
- **WebSockets:** Confirm `VITE_API_BASE_URL` is HTTPS, browser URL is `wss://`, Render host is allowed, and proxy/security tools permit upgrades. Redis affects fan-out, not authorization.
- **Out of memory:** Confirm one worker; inspect whether the first ML/SHAP request triggers the crash. Avoid concurrent explanation requests. Keep the artifact but leave expensive ML features unused until capacity is available.
- **Cold starts:** Retry after about one minute. The health workflow avoids alerting on the first bounded timeout, but free-tier availability is not guaranteed.

## Verification before cutover

Run backend tests with `pip install -r backend/requirements-dev.txt`, frontend lint/build/tests, `alembic upgrade head` on a disposable PostgreSQL database, and a local `/health/live`/`/health/ready` smoke test. External deployment is only proven after the provider dashboard steps and endpoint tests succeed.
