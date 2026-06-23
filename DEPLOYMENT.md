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
SECRET_KEY=replace-with-a-long-random-production-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ORIGINS=https://your-frontend-domain.example
RUN_STARTUP_SCHEMA_CHECK=false
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=120
RATE_LIMIT_WINDOW_SECONDS=60
AUTH_RATE_LIMIT_REQUESTS=20
AUTH_RATE_LIMIT_WINDOW_SECONDS=60
TRUSTED_PROXY_COUNT=1
GROQ_API_KEY=
```

Keep real `.env` files out of Git. Rotate any key that was ever exposed in a
ticket, screenshot, terminal output, or repository.

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
20260623_0004_constraints
```

That migration adds workflow constraints and uniqueness protection for active
staff assignments and pending referral requests.

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

## 5. Frontend Build

Create `frontend/.env.production` or platform variables:

```text
VITE_API_BASE_URL=https://your-api-domain.example
```

Build the static frontend:

```bash
cd frontend
npm ci
npm run build
```

Serve `frontend/dist` from Nginx, Caddy, Netlify, Vercel, Cloudflare Pages, or
the static hosting feature of your platform.

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
- Formal clinical safety review before use with real patient data.
