# Health Risk Dashboard

A full-stack health monitoring dashboard for patient risk review, live vitals,
clinical workflows, medication tracking, audit logs, analytics, and AI-assisted
patient summaries.

## Stack

- Backend: FastAPI, SQLAlchemy, Pydantic, PostgreSQL, JWT auth
- Frontend: React, TypeScript, Vite, React Router, Tailwind CSS, Recharts
- AI integration: Groq-backed assistant routes when `GROQ_API_KEY` is configured

## Project Layout

```text
backend/
  main.py                 FastAPI app entry point
  config.py               Environment-backed settings
  database.py             SQLAlchemy engine/session setup
  models.py               Database models
  schemas.py              Pydantic API schemas
  routes/                 API route modules
  seed_demo_data.py       Demo data and demo users

frontend/
  src/app/                React app, routes, pages, components, services
  src/types/              Shared frontend types
  public/                 Static assets
```

## Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```

The API will run at `http://127.0.0.1:8000`.

Health check:

```bash
curl http://127.0.0.1:8000/health
```

Seed demo data:

```bash
cd backend
source venv/bin/activate
python seed_demo_data.py
```

Demo password for seeded users is `Password123`.

## Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The app will run at `http://localhost:5173`.

## Environment

Backend settings live in `backend/.env`.

```text
DATABASE_URL=postgresql://postgres:password@localhost:5432/health_ai
SECRET_KEY=change-me-to-a-long-random-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
WEBSOCKET_INTERVAL_SECONDS=5
GROQ_API_KEY=
```

Frontend settings live in `frontend/.env`.

```text
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Do not commit real `.env` files or API keys.

## Useful Commands

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

Backend syntax check:

```bash
rg --files backend -g '*.py' -g '!venv/**' | xargs python3 -m py_compile
```

Backend import smoke test:

```bash
cd backend
venv/bin/python -c "import main; print('ok')"
```

## Main API Areas

- `/auth` login, registration, refresh tokens
- `/patients` patient records
- `/vitals` vital sign ingestion and retrieval
- `/medications` medication schedule/adherence records
- `/reviews` clinical review cases
- `/analytics` linear forecast and system summary
- `/ml` predictive risk scoring
- `/assistant` AI summaries and clinical Q&A
- `/notifications` user notifications
- `/registration-requests` access request approval flow
- `/role-actions` doctor, nurse, and patient workflows
- `/live-simulator` condition-based simulated vitals
- `/ws/live/{patient_id}` simulated live vitals WebSocket

## Current Notes

- The backend creates tables automatically on startup. For production, add
  migrations before changing schema.
- PostgreSQL is required. The app intentionally does not fall back to SQLite.
- The frontend build can warn about large chunks because charting and PDF
  generation libraries are bundled into the main app. This is an optimization
  warning, not a build failure.
