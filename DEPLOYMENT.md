# Deployment Guide

This guide describes a production-style deployment for the Health Risk
Dashboard. The project is PostgreSQL-only and should be deployed with HTTPS,
strong secrets, database backups, and a reverse proxy or platform load balancer.

## 1. Prerequisites

- Python 3.11 or newer
- Node.js 20 or newer
- PostgreSQL 14 or newer
- A Linux server, container platform, or managed app host
- HTTPS certificate from the platform or reverse proxy
- A long random `SECRET_KEY`

## 2. Backend Environment

Create `backend/.env` from `backend/.env.example` and set production values:

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME
DATABASE_POOL_SIZE=5
DATABASE_MAX_OVERFLOW=10
DATABASE_POOL_RECYCLE_SECONDS=300
REDIS_URL=redis://PRIVATE_REDIS_HOST:6379
REQUIRE_REDIS=true
APP_ENV=production
SECRET_KEY=replace-with-a-long-random-production-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ORIGINS=https://your-frontend-domain.example
ALLOWED_HOSTS=your-api-domain.example
FORCE_HTTPS=true
PUBLIC_API_DOCS=false
MAX_REQUEST_BYTES=1048576
RUN_STARTUP_SCHEMA_CHECK=false
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=120
RATE_LIMIT_WINDOW_SECONDS=60
AUTH_RATE_LIMIT_REQUESTS=20
AUTH_RATE_LIMIT_WINDOW_SECONDS=60
TRUSTED_PROXY_COUNT=1
GROQ_API_KEY=
AI_ENABLED=false
AI_MODEL=llama-3.1-8b-instant
AI_TIMEOUT_SECONDS=12
FRONTEND_URL=https://your-frontend-domain.example
WITHINGS_CLIENT_ID=
WITHINGS_CLIENT_SECRET=
WITHINGS_REDIRECT_URI=https://your-api-domain.example/integrations/withings/callback
WITHINGS_WEBHOOK_URL=https://your-api-domain.example/integrations/withings/webhook
INTEGRATION_ENCRYPTION_KEY=
REQUIRE_WITHINGS=true
SENTRY_DSN=
REQUIRE_SENTRY=true
SENTRY_TRACES_SAMPLE_RATE=0.1
RELEASE=
```

Keep real `.env` files out of Git. Rotate any key that was ever exposed in a
ticket, screenshot, terminal output, or repository.

Keep `AI_ENABLED=false` until the AI activation gates in
`DEPLOYMENT_CHECKLIST.md` are approved. A key by itself does not authorize
processing patient data through the provider.

See `AI_SETUP.md` and `WITHINGS_SETUP.md` for provider-specific setup.

## 3. Database Setup

Create the PostgreSQL database and run Alembic migrations:

```bash
cd backend
source venv/bin/activate
alembic upgrade head
alembic current
```

The current migration chain ends with:

```text
20260729_0014
```

The latest migrations include rotating refresh-token sessions, encrypted
Withings connections, private per-user notification read receipts, encrypted
AI memory and MFA secrets, care workflows, structured clinical operations,
granular administration, and single-use password reset links.

## 4. Backend Service

Install dependencies and start the app with a production ASGI server:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

For a process manager such as systemd, Supervisor, Render, Railway, Fly, or a
container runtime, keep the same command and inject environment variables
through the platform secret manager.

Health endpoints:

```text
/health/live
/health/ready
```

Use `/health/ready` for readiness because it verifies database connectivity.
When `REQUIRE_REDIS=true`, readiness also fails if Redis/Valkey is unavailable.

## 4A. Monitoring and encrypted backups

Set `SENTRY_DSN` for backend errors and `VITE_SENTRY_DSN` for frontend errors.
The SDKs exclude default personally identifiable information and request
bodies. Configure alert rules in Sentry for new issues, error-rate increases,
and performance degradation.

The Render Blueprint includes a daily backup cron job. Configure its
S3-compatible object-storage secrets:

```text
BACKUP_S3_BUCKET=
BACKUP_S3_ENDPOINT=
BACKUP_ENCRYPTION_KEY=
BACKUP_RETENTION_DAYS=30
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=eu-west-2
```

Backups are created with `pg_dump`, encrypted before upload, and uploaded with
server-side encryption. `.github/workflows/backup-verify.yml` downloads and
structurally verifies the newest encrypted backup every Monday. A successful
verification is not a substitute for a scheduled restore drill into an
isolated database.

## 5. Frontend Build

Create `frontend/.env.production` or platform variables:

```text
VITE_API_BASE_URL=https://your-api-domain.example
VITE_SENTRY_DSN=
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1
VITE_RELEASE=
```

Build the static frontend:

```bash
cd frontend
npm ci
npm run build
```

Serve `frontend/dist` from Nginx, Caddy, Netlify, Vercel, Cloudflare Pages, or
the static hosting feature of your platform.

The deployed frontend includes responsive layouts for phone, tablet, laptop,
and desktop widths. Light/dark mode follows the device preference until the
user makes an explicit choice with the theme toggle, then that choice is saved
in browser storage.

## 5A. Recommended Student Deployment: Vercel + Render

For this project, use:

- Vercel for the React/Vite frontend.
- Render for the FastAPI backend and managed PostgreSQL database.

This split is recommended because Vercel is excellent for static frontend
hosting, while the backend needs a long-running ASGI process, PostgreSQL,
Alembic migrations, and WebSockets.

### Backend on Render

1. Push this repository to GitHub.
2. Open Render and create a new Blueprint from the repository.
3. Render will read `render.yaml`.
4. Create the web service and PostgreSQL database.
5. In the Render service environment, set:

```text
CORS_ORIGINS=https://your-vercel-app.vercel.app
ALLOWED_HOSTS=your-render-api.onrender.com
```

Leave AI disabled for the initial synthetic-data deployment. Enable it only
after the privacy, clinical-safety, and provider approvals are complete.

6. After the first deployment, run the admin reset command from Render Shell:

```bash
python scripts/reset_admin.py \
  --email admin@example.com \
  --full-name "System Admin" \
  --password 'replace-with-a-strong-password'
```

The backend start command in `render.yaml` runs:

```bash
python scripts/wait_for_database.py && alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port $PORT
```

The wait step gives Render PostgreSQL time to become reachable before Alembic
runs. Without it, first deploys can fail with a database connection timeout
before the web server has opened a port.

The Render blueprint also sets:

```text
PYTHON_VERSION=3.12.3
```

This keeps Render from silently deploying with a newer Python version than the
one used during local development.

### Frontend on Vercel

1. Import the same GitHub repository into Vercel.
2. Set the Vercel project root directory to:

```text
frontend
```

3. Vercel will read `frontend/vercel.json`.
4. Set the frontend environment variable:

```text
VITE_API_BASE_URL=https://your-render-api.onrender.com
```

5. Deploy.

The Vercel config uses:

```text
installCommand: npm ci
buildCommand: npm run build
outputDirectory: dist
```

It also rewrites all frontend routes to `index.html`, so direct links such as
`/login`, `/admin`, and `/referrals` work with React Router.

### Final URL Update

After Vercel gives you the final frontend URL, go back to Render and update:

```text
CORS_ORIGINS=https://your-vercel-app.vercel.app
```

Then redeploy the backend. Without this CORS update, login requests from Vercel
will be blocked by the browser.

### Render Troubleshooting

If logs show:

```text
psycopg2.OperationalError: connection timed out
```

check the following:

- The PostgreSQL database exists and is not still provisioning.
- The backend service and database were created by the same Blueprint.
- `DATABASE_URL` is coming from the Render database, not copied manually from another service.
- Redeploy after the database status shows available.
- Keep `python scripts/wait_for_database.py` in the start command so the app retries before running migrations.

If logs show Python 3.14 packages while local development uses Python 3.12,
confirm `PYTHON_VERSION=3.12.3` exists in the Render service environment.

## 6. Reverse Proxy and WebSockets

The API includes WebSockets for live vitals and production notification updates.
If you use Nginx, proxy upgrade headers are required:

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_set_header Host $host;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

Set `TRUSTED_PROXY_COUNT` to the number of trusted proxies in front of FastAPI
so rate limiting and audit metadata use the correct client IP.

## 7. CORS

`CORS_ORIGINS` must include only the deployed frontend origins:

```text
CORS_ORIGINS=https://health-risk.example,https://www.health-risk.example
```

Avoid `*` for a healthcare-style application because authenticated requests use
Bearer tokens and should only come from expected domains.

## 8. Admin Account

Create or reset the admin account after migrations:

```bash
cd backend
source venv/bin/activate
python scripts/reset_admin.py \
  --email admin@example.com \
  --full-name "System Admin" \
  --password 'replace-with-a-strong-password'
```

Rotate the default development password before presentation or deployment.

## 9. Security Checks

Before release, run:

```bash
cd backend
python3 -m py_compile $(rg --files . -g '*.py' -g '!venv/**')
pytest -q

cd ../frontend
npm run lint
npm run build
npm run test:e2e
```

The default browser suite checks public-page rendering, password visibility
controls, invalid-login feedback, responsive overflow, and authenticated app
shell sizing. Keep these checks green before deploying to Vercel or another
static host.

For authenticated browser tests, start the backend and set:

```bash
E2E_RUN_AUTH=1 \
E2E_ADMIN_EMAIL=admin@example.com \
E2E_ADMIN_PASSWORD='your-admin-password' \
npm run test:e2e
```

## 10. Production Gaps to Track

The code now has good final-year project hardening, but a real hospital-grade
deployment would still need:

- Redis-backed rate limiting for multiple backend workers.
- Centralized logging and audit export retention policies.
- Automated database backups and restore drills.
- Secret rotation procedures.
- Background job handling for slower AI calls.
- Production visual-regression coverage for the most important authenticated role dashboards.
- Formal clinical safety review before use with real patient data.
