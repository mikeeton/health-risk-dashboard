# Vitala

**Health Risk Dashboard 2.0** is a full-stack healthcare research prototype for reviewing patient observations, care activity, alerts, and model evidence. It has separate workspaces for doctors, nurses, patients, and administrators.

> **Research use only.** Vitala is not clinically validated or approved as a medical device. Use synthetic or appropriately governed research data. Clinicians must verify every alert and model output. Live deployment is paused; this README focuses on local development.

## What is in the project

| Area | Purpose |
| --- | --- |
| Doctor | Patient summaries, vital trends, review cases, reports, and referrals |
| Nurse | Care tasks, observations, medication activity, and escalation |
| Patient | Personal measurements, care information, and connected devices |
| Admin | Access approvals, user management, audit records, and operations |
| Research | Model evaluation, provenance, calibration, and prospective evidence |
| AI assistant | Optional governed summaries with source references and missing-data disclosures |

The frontend uses React, TypeScript, Vite, and Tailwind CSS. The backend uses FastAPI, SQLAlchemy, Alembic, and PostgreSQL. WebSockets provide live update hints; persisted database records remain authoritative. Redis, Withings, and Groq are optional integrations.

For a technical review, start with [architecture](docs/ARCHITECTURE.md), [security](docs/SECURITY.md), [testing](docs/TESTING.md), and the [model card](docs/ML_MODEL_CARD.md). The [documentation index](docs/README.md) keeps dissertation and historical evidence separate.

## Run locally

Install **Python 3.12**, **Node.js 22**, and **PostgreSQL**. The backend requires a PostgreSQL database; it does not silently switch to SQLite.

From the repository root, set up the backend in PowerShell:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\python.exe -m pip install --require-hashes -r requirements-dev.lock
Copy-Item .env.example .env
```

Edit `backend/.env` with a local `DATABASE_URL`, a unique development `SECRET_KEY`, and the local frontend origin. Then start the API:

```powershell
.\venv\Scripts\alembic.exe upgrade head
.\venv\Scripts\uvicorn.exe main:app --reload
```

The API runs at `http://127.0.0.1:8000`. In a second PowerShell terminal:

```powershell
cd frontend
npm.cmd ci
Copy-Item .env.example .env.local
npm.cmd run dev
```

The frontend runs at `http://localhost:5173` by default. Set `VITE_API_BASE_URL` in `frontend/.env.local` if the API uses another address. There are no default administrator credentials; use `backend/scripts/reset_admin.py` to create a local administrator.

## Check the project

```powershell
.\backend\venv\Scripts\python.exe .\scripts\run-local-backend-tests.py
```

This creates and removes a fresh local PostgreSQL test database. Direct pytest
refuses to run unless `APP_ENV=test` and `DATABASE_URL` explicitly name a local
`*_test` database. See [isolated PostgreSQL verification](docs/testing/LOCAL_POSTGRESQL.md).

```powershell
cd frontend
npm.cmd run lint
npm.cmd run build
npm.cmd run test:e2e
```

The isolated local backend runner rehearses an Alembic upgrade, downgrade, and upgrade before running the suite. Browser tests use synthetic API fixtures; they do not prove real provider delivery or production reliability. See the [test inventory](docs/testing/COMPLETE_TEST_INVENTORY.md) and [engineering audit](docs/reports/ENGINEERING_AUDIT_2026-11-09.md).

## Security and reliability status

Browser refresh tokens are held in an HttpOnly cookie; the browser keeps only the short-lived access token and a request-verification token in session storage. Existing JSON refresh tokens remain available to non-browser API clients. PostgreSQL serializes refresh rotation and coordinates the background monitor across API workers. When `REDIS_URL` is configured, the rate limiter and AI circuit breaker share state across workers. Without Redis, those two controls use process-local state, so a multi-worker production setup still needs Redis or another shared coordinator.

Backend dependency inputs remain in `backend/requirements.txt` and `backend/requirements-dev.txt`; install from the pinned, hashed `requirements-dev.lock` for local development or `requirements.lock` for the API runtime. With Python 3.12 active, install `pip-tools==7.6.2`, then regenerate both locks from the repository root with `powershell -ExecutionPolicy Bypass -File .\scripts\lock-backend.ps1`. Citation IDs and timestamps are checked, but they cannot establish that every generated medical statement is supported by its source. Provider output requires clinical review. Real-device delivery, prospective alert reliability, and external ML validation remain unproven by local tests.

## Clinical and ML boundaries

The observed-next-window HR/BP model candidate failed its preset sensitivity gate and **does not serve inference**. Its retrospective false-positive burden remains high. The older installed model measures a different, forward-filled proxy target and is labelled as research-only. Deterministic critical-reading checks are independent of both models. See the [model card](docs/ML_MODEL_CARD.md) and [validation report](docs/reports/ML_PIPELINE_VALIDATION_REPORT.md).

Withings sync, alert retry, patient access, session revocation, and role-specific screens have local automated coverage. Real wearable delivery, prospective outcomes, clinical usability, and external safety approval are still required before any clinical use.

## Repository map

```text
backend/              API, database models, migrations, ML, and tests
frontend/             Web application and browser tests
docs/                 Architecture, setup, research, and evidence
docs/dissertation/    Final dissertation and presentation guide
scripts/              Research and documentation utilities
```

Start with the [documentation index](docs/README.md) for deeper technical material. The two retained Word documents are the [dissertation](docs/dissertation/Health_Risk_Dashboard_Dissertation.docx) and [presentation and viva guide](docs/dissertation/Presentation_and_Viva_Guide.docx). Historical evaluation reports remain in Markdown so their claims can be checked against the code.

## Author

Michael Etonyeaku
