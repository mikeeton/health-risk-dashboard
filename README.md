# Health Risk Dashboard

Health Risk Dashboard is a full-stack clinical monitoring application for
role-based patient review, live vitals, medication tracking, review cases,
audit trails, analytics, and AI-assisted patient summaries.

The application is intentionally PostgreSQL-only. It does not fall back to
SQLite, because the production data model depends on durable relational
ownership rules.

## Current Login Accounts

Development accounts currently available in the local PostgreSQL database:

```text
Doctor: doctor3@example.com / Password123
Patient: max@example.com / Password123
Admin: admin@example.com / AdminPassword123!
```

Reset or create the admin account at any time:

```bash
cd backend
source venv/bin/activate
python scripts/reset_admin.py \
  --email admin@example.com \
  --full-name "System Admin" \
  --password 'AdminPassword123!'
```

## Stack

- Backend: FastAPI, SQLAlchemy, Pydantic, PostgreSQL, Alembic, JWT auth
- Frontend: React, TypeScript, Vite, React Router, Tailwind CSS, Recharts
- AI: Groq API integration when `GROQ_API_KEY` is configured
- Tests: Pytest, FastAPI TestClient, and Playwright browser tests

## Feature List

- Role-based authentication for admin, doctor, nurse, and patient users.
- PostgreSQL-backed patient records, vitals, medications, events, and review cases.
- Admin user management, registration approvals, audit logs, metrics, and staff assignments.
- Many-to-many staff assignment model for doctors/nurses and patients.
- Patient referral workflow where clinicians request access and admin approval is required before record sharing.
- Functional notification centre with unread badges, filtering, search, read/unread actions, history, polling fallback, and production WebSocket update hints.
- Admin-verified password reset for user accounts from the admin user-management screen.
- Password visibility controls on login, registration, and admin password reset fields.
- Doctor workflow for assigned patients, AI summaries, ML predictions, diagnoses, treatment notes, and escalations.
- Nurse workflow for assigned patients, vitals recording, medication updates, nursing notes, and alerts.
- Patient workflow for viewing only the linked personal record.
- AI-assisted clinical summaries, patient Q&A, handover text, and report generation.
- Live vitals simulation and WebSocket updates for accessible patients.
- Responsive shell and dashboard controls for phone, tablet, laptop, and desktop widths.
- Adaptive light/dark theme with system-preference fallback, saved user choice, browser `color-scheme`, improved field contrast, and accessible focus styling.
- Security headers, no-store clinical caching, request IDs, response-time metrics, and rate limiting.
- Alembic database migrations, workflow constraints, automated security tests, and E2E browser tests.

## Architecture

```text
Browser
  |
  | React/Vite frontend on http://localhost:5173
  |
FastAPI backend on http://127.0.0.1:8000
  |
PostgreSQL database
```

The frontend stores the login token in `localStorage` and sends it as a Bearer
token to protected API routes. The backend decodes the token, loads the current
user, checks account status, and then applies role-based access rules before
returning patient data.

## Request Flow

```text
React page/component
  -> src/app/services/api.ts adds Bearer token
  -> FastAPI route validates request with Pydantic schema
  -> auth_utils.py resolves current user from JWT
  -> access_control.py applies role/patient scope
  -> SQLAlchemy reads or writes PostgreSQL
  -> audit/notification helpers record important workflow events
```

This flow is used consistently so security checks happen on the backend even
when the frontend hides screens that a role should not use.

## Security Model

Roles:

- `admin`: manages users, approvals, audit logs, metrics, and staff-patient assignments. Admin users do not read patient clinical records, vitals, medications, reports, diagnoses, or analytics.
- `doctor`: accesses assigned patients, patient records, vitals, AI risk assessments, review cases, diagnoses, treatment notes, and escalations. Assignment is controlled through active `patient_staff_assignments` rows with role `doctor`; the older `patients.primary_doctor_id` column is still accepted as a compatibility fallback.
- `nurse`: accesses assigned patients, records vitals, updates medication status, adds nursing notes, raises alerts, and supports care workflows. Assignment is controlled through active `patient_staff_assignments` rows with role `nurse`; the older `patients.assigned_nurse_id` column is still accepted as a compatibility fallback.
- `patient`: accesses only the linked patient record where `patients.user_id` matches the patient user id.

Important protections:

- Clinical routes require authentication.
- Admin routes require an active admin user.
- Admin staff assignment screens return only safe directory data needed for access management.
- Unauthorized patient access returns `404` so patient existence is not leaked.
- Suspended users are rejected.
- Audit logs and operational metrics are admin-only.
- Clinical responses default to `Cache-Control: no-store`.
- Request metrics add `X-Request-ID` and `X-Response-Time-ms`.
- In-memory rate limiting protects local/single-process deployments.

Protected admin areas:

- `/admin/users/*`
- `/admin/assignments/*`
- `/admin/referrals`
- `/registration-requests/` list, approve, reject
- `/audit/`
- `/metrics`

Public areas:

- `/auth/login`
- `/auth/register`
- `/registration-requests/` create request
- `/health`, `/health/live`, `/health/ready`

## Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn main:app --reload
```

Backend URL:

```text
http://127.0.0.1:8000
```

Health checks:

```bash
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/health/live
curl http://127.0.0.1:8000/health/ready
```

## Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

## Usage Instructions

1. Start PostgreSQL and confirm `backend/.env` contains the correct `DATABASE_URL`.
2. Run `alembic upgrade head` from `backend` to apply migrations.
3. Start the backend with `uvicorn main:app --reload`.
4. Start the frontend with `npm run dev` from `frontend`.
5. Log in as admin to approve registration requests, manage users, and assign staff to patients.
6. Log in as admin to approve or reject referral requests before additional clinicians receive access.
7. Log in as doctor to view assigned patients, read vitals, generate reports, add diagnoses/treatment notes, submit referrals, and escalate cases.
8. Log in as nurse to monitor assigned patients, record vitals, update medication status, submit referrals, and raise alerts.
9. Log in as patient to view only the linked personal health record.

## Deployment Guide

See [DEPLOYMENT.md](DEPLOYMENT.md) for production setup, PostgreSQL migration,
reverse proxy, WebSocket, CORS, admin reset, and release-check instructions.
For a Vercel-style final-year deployment, host the frontend on Vercel from the
`frontend` directory and host the FastAPI/PostgreSQL backend on Render using
`render.yaml`.

## Environment Variables

Backend environment lives in `backend/.env`.

```text
DATABASE_URL=postgresql://postgres:password@localhost:5432/health_ai
SECRET_KEY=change-me-to-a-long-random-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
WEBSOCKET_INTERVAL_SECONDS=5
RUN_STARTUP_SCHEMA_CHECK=false
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=120
RATE_LIMIT_WINDOW_SECONDS=60
AUTH_RATE_LIMIT_REQUESTS=20
AUTH_RATE_LIMIT_WINDOW_SECONDS=60
TRUSTED_PROXY_COUNT=0
GROQ_API_KEY=
```

Frontend environment lives in `frontend/.env`.

```text
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Never commit real `.env` files, production secrets, API keys, or database
passwords.

## Database Migrations

Alembic is the normal migration path.

```bash
cd backend
source venv/bin/activate
alembic upgrade head
alembic current
```

The baseline migration is:

```text
backend/alembic/versions/20260621_0001_baseline.py
```

The staff assignment migration is:

```text
backend/alembic/versions/20260621_0002_staff_assignments.py
```

It creates `patient_staff_assignments` and backfills doctor/nurse assignments
from the older patient ownership columns.

The referral and notification migration is:

```text
backend/alembic/versions/20260621_0003_referrals_notifications.py
```

It creates `referral_requests` and adds richer notification metadata for role,
links, and related entities.

The workflow constraints migration is:

```text
backend/alembic/versions/20260623_0004_constraints.py
```

It adds check constraints for user, referral, and assignment status values. It
also adds uniqueness protection for active staff assignments and pending
referral requests after safely superseding duplicate pending/active rows.

`RUN_STARTUP_SCHEMA_CHECK=true` exists only as a local recovery fallback. Keep it
`false` during normal development and production.

## Tests

Run backend security tests:

```bash
cd backend
source venv/bin/activate
pytest -q
```

The current security tests cover:

- Admin-only routes reject doctor users and allow admin users.
- Public registration requests can be created without login.
- Registration review is blocked for public and doctor users.
- A doctor cannot access another doctor's patient.
- A patient cannot access another patient's record.
- Admin users cannot read patient details, vitals, or legacy clinical care-team endpoints.
- Admin staff assignments grant and remove doctor/nurse patient access.
- Clinician action routes use validated JSON payloads and block admin users.
- Referral routes preserve patient privacy by requiring admin approval before adding a receiving clinician to the care team.
- Notifications are scoped to the current user or role and support read/unread state.

Run frontend checks:

```bash
cd frontend
npm run lint
npm run build
```

Run E2E browser tests:

```bash
cd frontend
npm run test:e2e
```

The default Playwright suite checks the login/access-request UI, password
visibility controls, invalid login feedback, public-page responsive overflow,
and the authenticated app shell at phone/tablet widths. Authenticated admin E2E
checks are opt-in so CI can run without a seeded backend:

```bash
E2E_RUN_AUTH=1 \
E2E_ADMIN_EMAIL=admin@example.com \
E2E_ADMIN_PASSWORD='AdminPassword123!' \
npm run test:e2e
```

The production build is code-split. Route pages, charting, animation, icons,
and PDF generation libraries are emitted as separate chunks so the initial app
bundle stays small. The PDF libraries are loaded only when a user exports a PDF.

Run backend syntax check:

```bash
python3 -m py_compile $(rg --files backend -g '*.py' -g '!venv/**')
```

## Caching

Clinical data is not browser/proxy cached. The security middleware sets
`Cache-Control: no-store` on patient, vitals, medication, analytics, AI, review,
and related routes.

Safe metadata can be cached. For example:

```text
/live-simulator/profiles
```

returns:

```text
Cache-Control: public, max-age=300
```

## Rate Limiting

The backend includes an in-memory rate limiter:

- Default API limit: `RATE_LIMIT_REQUESTS` per `RATE_LIMIT_WINDOW_SECONDS`
- Auth limit: `AUTH_RATE_LIMIT_REQUESTS` per `AUTH_RATE_LIMIT_WINDOW_SECONDS`

This is good for local development and a single backend process. For production
with multiple workers or multiple servers, replace it with Redis-backed rate
limiting so all workers share the same counters.

## Load Balancing

The app exposes load-balancer-friendly endpoints:

- `/health/live`: process is alive
- `/health/ready`: database is reachable

Use `/health/ready` for readiness checks because it verifies PostgreSQL with
`SELECT 1`.

If the backend sits behind Nginx, Render, Fly, Railway, Kubernetes, or another
proxy, set:

```text
TRUSTED_PROXY_COUNT=1
```

or to the number of trusted proxies in front of FastAPI. This lets the rate
limiter read the correct client IP from `X-Forwarded-For`.

## Styling

The frontend uses Inter for a cleaner clinical dashboard feel. Global styling
is defined in:

```text
frontend/src/styles/index.css
```

The style system focuses on:

- restrained panels
- smaller card radius
- readable line height
- visible focus states
- polished role-aware header context
- adaptive light/dark theme variables
- browser `color-scheme` support
- password fields with accessible show/hide controls
- responsive controls that avoid horizontal overflow on common device widths
- tabular numeric table rendering
- no browser caching assumptions for clinical data

## Code Comments

The codebase now includes comments and docstrings in the most important areas:

- Backend access control explains why admin users are excluded from clinical queries.
- Referral routes explain why approval is separate from patient record access.
- Notification routes explain user/role scoping, read-state handling, and search.
- Frontend API helpers explain the central authenticated request path.
- Referral and notification components explain loading, filtering, polling, and role-specific behaviour.
- Password and theme components use clear accessible names so UI behavior is testable and screen-reader friendly.

Comments are intentionally focused on project reasoning and privacy/security
decisions, rather than repeating simple syntax.

## Frontend Performance

The frontend uses two bundle-size controls:

- Route-level lazy loading in `frontend/src/app/routes.tsx`
- Manual vendor chunks in `frontend/vite.config.ts`

Large libraries are split by purpose:

- `react`: React, React DOM, React Router
- `charts`: Recharts
- `motion`: Framer Motion
- `icons`: Lucide icons
- `pdf-jspdf`: jsPDF
- `pdf-canvas`: html2canvas
- `ui`: Radix UI helpers
- `vendor`: remaining third-party code

The dashboard PDF export dynamically imports `html2canvas` and `jspdf`.
The clinician PDF report button dynamically imports the PDF report utility.
This keeps PDF code out of normal page navigation.

## File-by-File Guide

### Backend Root

`backend/main.py`

- Creates the FastAPI app.
- Registers CORS and middleware.
- Mounts every API router.
- Provides `/health`, `/health/live`, `/health/ready`, and `/metrics`.
- Protects the live WebSocket by decoding the token and checking patient access.
- Keeps old startup schema checks behind `RUN_STARTUP_SCHEMA_CHECK`.

`backend/config.py`

- Reads `.env` settings.
- Requires PostgreSQL through `DATABASE_URL`.
- Defines JWT, CORS, WebSocket, rate-limit, proxy, and schema-check settings.

`backend/database.py`

- Builds the SQLAlchemy engine from `DATABASE_URL`.
- Creates `SessionLocal`.
- Exposes `get_db()` for FastAPI dependency injection.

`backend/models.py`

- Defines SQLAlchemy database tables.
- `User` stores auth identity, role, and status.
- `Patient` stores clinical profile and care-team ownership fields.
- `PatientStaffAssignment` stores many-to-many doctor/nurse access to patients.
- `Vital`, `Medication`, `PatientEvent`, and `ReviewCase` store patient-scoped clinical records.
- `AuditLog` records important system actions.
- `ReferralRequest` stores clinician referral requests and admin review status.
- `RegistrationRequest` stores pending access requests.
- `Notification` stores user/role-scoped notifications with read state and related links.
- `WearableDevice` stores linked wearable metadata.

`backend/schemas.py`

- Defines Pydantic request and response models.
- Uses `ConfigDict(from_attributes=True)` for ORM response serialization.
- Validates emails, password minimum length, patient registration details, vitals, patient fields, assignment inputs, and clinician action payloads.

`backend/auth_utils.py`

- Hashes and verifies passwords.
- Creates access and refresh JWTs.
- Decodes tokens.
- Provides `get_current_user()` to protect routes.
- Rejects missing, invalid, refresh-token, or suspended-user authentication.

`backend/access_control.py`

- Centralizes role checks.
- `require_admin()` protects admin-only routes.
- `patient_query_for_user()` filters patients by admin, doctor, nurse, or patient ownership.
- `get_accessible_patient()` returns `404` when a patient is missing or inaccessible.
- `validate_user_for_role()` confirms care-team assignments point to active users with the correct role.

`backend/middleware.py`

- Adds request metrics headers.
- Adds security and cache headers.
- Applies in-memory rate limiting.
- Resolves client IP with optional trusted proxy support.

`backend/observability.py`

- Tracks uptime, total requests, active requests, status families, and average response time.
- Feeds the admin-only `/metrics` endpoint.

`backend/requirements.txt`

- Lists backend dependencies for FastAPI, PostgreSQL, Alembic, JWT, tests, analytics, and Groq.

`backend/MIGRATIONS.md`

- Short guide for running and creating Alembic migrations.

`backend/alembic.ini`

- Alembic configuration file.

`backend/alembic/env.py`

- Loads project settings and metadata for Alembic.
- Escapes `%` in database URLs so encoded passwords work.

`backend/alembic/versions/20260621_0001_baseline.py`

- Baseline database migration.
- Creates tables for fresh databases.
- Safely adds missing columns to existing databases.

`backend/alembic/versions/20260621_0002_staff_assignments.py`

- Creates the `patient_staff_assignments` table.
- Adds indexes for assignment lookup.
- Backfills active doctor and nurse rows from older patient ownership columns.
- Provides a downgrade path that drops the assignment table and indexes.

`backend/alembic/versions/20260621_0003_referrals_notifications.py`

- Creates the `referral_requests` table.
- Adds indexes for referral status and patient lookup.
- Adds notification metadata columns for target role, links, and related entities.
- Provides a downgrade path for the referral table and notification metadata.

`backend/alembic/versions/20260623_0004_constraints.py`

- Adds check constraints for user roles/statuses, referral statuses, and assignment statuses.
- Removes duplicate active assignment rows by marking extras as removed.
- Removes duplicate pending referral rows by marking extras as superseded.
- Adds partial unique indexes to prevent duplicate active assignments and duplicate pending referral requests.

`backend/scripts/reset_admin.py`

- Creates or resets an admin user.
- Sets email, full name, role, active status, public id, and password hash.

`backend/tests/conftest.py`

- Adds the backend directory to the pytest import path.

`backend/tests/test_security.py`

- Automated security tests for admin-only access, patient assignment isolation, admin clinical isolation, and assignment-based access grants.
- Creates unique users/patients, logs in through the API, checks status codes, and cleans up data.

`backend/seed_demo_data.py`

- Seeds demo users, patients, vitals, review cases, and audit data.

`backend/migrate_users.py`

- Older helper for user migration work. Keep only if still needed locally.

### Backend Routes

`backend/routes/auth.py`

- Registers users.
- Logs users in and returns access/refresh tokens.
- Refreshes access tokens.
- Writes login/register audit entries.

`backend/routes/patients.py`

- Lets doctors create patients and automatically creates initial staff assignment rows.
- Lists only patients visible to the current user.
- Reads a single patient only if accessible.
- Keeps the old admin care-team route as a `410 Gone` response that points callers to `/admin/assignments`.
- Blocks admin deletion of clinical patient records.

`backend/routes/vitals.py`

- Creates, reads, and deletes vital records.
- Requires patient access before exposing or mutating vitals.

`backend/routes/medications.py`

- Creates, reads, updates, and deletes medication records.
- Requires patient access before medication data is exposed or changed.

`backend/routes/events.py`

- Creates and lists patient timeline events.
- Requires access to the patient.

`backend/routes/reviews.py`

- Creates clinical review cases.
- Lists only review cases for accessible patients.
- Updates/deletes cases only after patient access is verified.

`backend/routes/analytics.py`

- Provides linear-regression forecast for an accessible patient.
- Provides a scoped system summary based on the current user's patient access.

`backend/routes/ml.py`

- Computes deterioration prediction from recent vitals.
- Requires patient access.

`backend/routes/assistant.py`

- Builds patient context from vitals, medications, and events.
- Calls Groq models for summaries, Q&A, and handovers.
- Requires patient access before building AI context.

`backend/routes/role_actions.py`

- Doctor actions: diagnoses, treatment plans, clinical notes, escalation, patient history.
- Nurse actions: record vitals, mark medication given, nursing notes, alerts.
- Patient action: view own records.
- Each action checks role and patient ownership.
- Clinical text is accepted through validated JSON request bodies rather than query strings.

`backend/routes/referrals.py`

- Lets doctors and nurses create referral requests for accessible patients.
- Lets admins list, approve, reject, or request more information on referrals.
- On approval, adds the receiving clinician to the patient care team.
- Writes audit entries and notifications for referral lifecycle events.
- Uses safe patient/staff fields so admin review does not expose clinical records.

`backend/routes/admin_assignments.py`

- Admin-only staff-patient assignment management.
- Lists safe patient directory data without exposing diagnoses, vitals, risk scores, or reports.
- Lists active doctor and nurse users who can be assigned.
- Creates active doctor/nurse assignments for a patient.
- Marks assignments as removed and updates legacy fallback ownership when needed.
- Writes audit events for assignment create/remove actions.

`backend/routes/admin_users.py`

- Admin-only user management.
- Lists users, creates users, updates roles/names, suspends, activates, and deletes users.
- Lets admins reset a user's password only after re-entering the admin password for verification.

`backend/routes/registration_requests.py`

- Public endpoint for access requests.
- Admin-only endpoints to list, approve, or reject requests.
- Approval creates a user and, for patient requests, a linked patient profile plus initial staff assignments.

`backend/routes/audit.py`

- Writes audit logs from other route modules.
- Exposes audit logs to admins only.

`backend/routes/notifications.py`

- Admins can create announcements.
- Users can list their scoped notifications.
- Supports read/unread filtering, search, mark individual read, and mark all read.
- Provides an authenticated WebSocket endpoint that pushes lightweight notification update hints for production use.
- Used by assignments, registrations, referrals, escalations, and alerts.

`backend/routes/live_simulator.py`

- Generates condition-based simulated vitals for accessible patients.
- Exposes supported disease profiles as safe cacheable metadata.

`backend/routes/wearables.py`

- Receives wearable vital payloads.
- Lists devices scoped to accessible patients.

`backend/routes/__init__.py`

- Marks the routes directory as a Python package.

### Frontend Root

`frontend/package.json`

- Defines frontend dependencies and scripts.
- Important scripts: `npm run dev`, `npm run lint`, `npm run build`, `npm run test:e2e`.

`frontend/playwright.config.ts`

- Configures Playwright browser tests.
- Starts the Vite dev server for E2E runs unless `E2E_SKIP_WEBSERVER` is set.
- Uses Chromium desktop coverage by default.

`frontend/vite.config.ts`

- Registers React and Tailwind plugins.
- Defines manual chunks for React, charting, motion, icons, PDF, UI, and vendor code.
- Keeps the production build below Vite's default large-chunk warning threshold.

`frontend/.env.example`

- Shows `VITE_API_BASE_URL`, the backend URL used by the frontend.

`frontend/src/main.tsx`

- React entry point.
- Mounts `<App />` into `#root`.

`frontend/src/app/App.tsx`

- Wraps the router with toast, auth, and health data providers.

`frontend/src/app/routes.tsx`

- Defines all frontend routes.
- Uses protected route wrappers to enforce role-based page access.
- Lazy-loads page components with `React.lazy` and `Suspense` to reduce the first bundle.

### Frontend Context

`frontend/src/app/context/AuthContext.tsx`

- Stores current user and token.
- Saves auth state to `localStorage`.
- Exposes role helpers like `isAdmin`, `isDoctor`, `isNurse`, and `isPatient`.

`frontend/src/app/context/HealthDataContext.tsx`

- Loads accessible patients after login.
- Loads vitals for the selected patient.
- Maps backend snake_case fields to frontend camelCase types.

`frontend/src/app/context/ToastContext.tsx`

- Provides toast notifications for success/error feedback.

### Frontend Services

`frontend/src/app/services/api.ts`

- Central API client.
- Reads `VITE_API_BASE_URL`.
- Builds WebSocket URLs from the same API base URL.
- Adds the Bearer token to protected requests.
- Exposes typed helper functions for patients, vitals, auth, reviews, medications, events, ML, analytics, assistant, registrations, role actions, admin users, and admin assignments.
- Sends clinical notes, diagnosis, treatment, escalation, nursing-note, and alert payloads as JSON.
- Provides notification search/filter/read helpers and referral create/review helpers.

`frontend/src/app/services/liveSocket.ts`

- Builds the WebSocket URL from the API base URL.
- Adds the auth token to the live socket query string.
- Dispatches live vitals records into React callbacks.

`frontend/src/app/services/healthService.ts`

- Local data helper for mock/offline patient data.

### Frontend Pages

`frontend/src/app/pages/Login.tsx`

- Login screen with demo credentials.
- Calls `login()` and shows toast feedback.
- Uses accessible labels for E2E tests and assistive technology.

`frontend/src/app/pages/RegisterAccess.tsx`

- Public access request form for doctor, nurse, or patient roles.
- Collects extra clinical profile fields for patients.

`frontend/src/app/pages/Dashboard.tsx`

- Main clinical dashboard.
- Shows charts, alerts, AI panels, medication/timeline widgets, and selected-patient detail.
- Dynamically imports PDF export libraries only when the dashboard PDF button is used.

`frontend/src/app/pages/DoctorDashboard.tsx`

- Doctor-focused overview.
- Shows scoped patients, review cases, selected patient risk, ML prediction, and AI summary.
- Provides forms for diagnoses, treatment plans, clinical notes, and patient escalation.

`frontend/src/app/pages/NurseDashboard.tsx`

- Nurse workflow page for assigned patient monitoring and nursing actions.

`frontend/src/app/pages/PatientDashboard.tsx`

- Patient-facing view of the linked patient record.

`frontend/src/app/pages/AdminDashboard.tsx`

- Admin overview and navigation into users, approvals, assignments, and audit logs.

`frontend/src/app/pages/AdminUsers.tsx`

- Admin-only user management UI.
- Calls `/admin/users/`.
- Includes admin-verified password reset controls.

`frontend/src/app/pages/AdminApprovals.tsx`

- Admin-only registration approval queue.
- Calls registration review/approve/reject endpoints.

`frontend/src/app/pages/AdminAssignments.tsx`

- Admin-only staff assignment page.
- Loads safe patient directory rows, doctor/nurse users, and current assignments.
- Lets admins assign multiple doctors or nurses to the same patient.
- Lets admins remove active staff assignments.
- Avoids patient clinical fields so admin users cannot browse reports through this page.

`frontend/src/app/pages/Referrals.tsx`

- Doctor/nurse referral request form and referral history.
- Admin referral approval queue.
- Lets admins approve, reject, or request more information.
- Shows referral status without exposing patient clinical records to admin users.

`frontend/src/app/pages/AuditLogs.tsx`

- Admin-only audit log viewer and CSV export.

`frontend/src/app/pages/Reports.tsx`

- Clinical report page for selected patient summaries and PDF/report tools.

`frontend/src/app/pages/ReviewCases.tsx`

- Review case queue scoped by backend access rules.

`frontend/src/app/pages/AdvancedAnalytics.tsx`

- Analytics page for selected patient vitals, medications, and forecasts.

`frontend/src/app/pages/AIAssistantPage.tsx`

- Standalone AI assistant page for selected patient context.

`frontend/src/app/pages/UploadData.tsx`

- Upload/manual vitals workflow for selected patients.

### Frontend Components

`frontend/src/app/components/Layout.tsx`

- Main application shell.
- Builds role-aware navigation.
- Handles desktop/sidebar/mobile navigation.
- Displays a polished role-aware header with workspace context and current selected patient where relevant.
- Includes notification bell with unread badge and dropdown access.

`frontend/src/app/components/ProtectedRoute.tsx`

- Redirects users who are not logged in or do not have an allowed role.

`frontend/src/app/components/PatientSwitcher.tsx`

- Selects the active patient from the accessible patient list.

`frontend/src/app/components/HealthCharts.tsx`

- Recharts visualizations for vitals and risk trends.

`frontend/src/app/components/HealthScoreGauge.tsx`

- Visual risk score gauge.

`frontend/src/app/components/AlertPanel.tsx`

- Displays generated health alerts.

`frontend/src/app/components/AIInsightPanel.tsx`

- Shows AI-generated clinical insights.

`frontend/src/app/components/AIExplanationPanel.tsx`

- Displays explainability text for risk scoring.

`frontend/src/app/components/AIClinicianReport.tsx`

- Presents clinician-facing AI report content.

`frontend/src/app/components/AITextBox.tsx`

- Reusable formatted text block for AI output.

`frontend/src/app/components/HealthAIAssistant.tsx`

- Role-aware ask-a-question UI for patient, doctor, and nurse AI responses.

`frontend/src/app/components/PasswordField.tsx`

- Reusable password input with accessible show/hide controls.
- Used by login, registration, and admin-verified password reset.

`frontend/src/app/components/MLPredictionPanel.tsx`

- Shows ML deterioration prediction for the selected patient.

`frontend/src/app/components/LinearRegressionPanel.tsx`

- Shows linear regression forecast from the analytics endpoint.

`frontend/src/app/components/PredictiveRiskPanel.tsx`

- Shows frontend predictive risk calculations.

`frontend/src/app/components/TrendAnalysisPanel.tsx`

- Summarizes vital trends.

`frontend/src/app/components/MedicationPanel.tsx`

- Medication creation and management UI.

`frontend/src/app/components/MedicationAdherenceDatabase.tsx`

- Medication adherence display backed by API data.

`frontend/src/app/components/PatientTimeline.tsx`

- Local/static patient timeline component.

`frontend/src/app/components/PatientTimelineDatabase.tsx`

- Timeline component backed by API events.

`frontend/src/app/components/PatientTable.tsx`

- Patient table display.

`frontend/src/app/components/PatientDetailModal.tsx`

- Patient detail modal.

`frontend/src/app/components/ClinicianQueue.tsx`

- Clinician work queue UI.

`frontend/src/app/components/ClinicianActivityFeed.tsx`

- Clinician activity display.

`frontend/src/app/components/DatabaseActivityFeed.tsx`

- Admin-only audit feed widget.

`frontend/src/app/components/NotificationCenter.tsx`

- Full notification history UI.
- Supports search, read/unread filtering, unread count, mark one read, and mark all read.

`frontend/src/app/components/NotificationDropdown.tsx`

- Header notification dropdown.
- Opens the notification WebSocket when authenticated, keeps polling as a fallback, and merges backend notifications with live clinical alerts.
- Includes animated unread badge, loading/empty/error states, search, filter, and mark-read actions.

`frontend/tests/e2e/smoke.spec.ts`

- Playwright smoke tests for login UI, password visibility, invalid login feedback, public responsive overflow, authenticated app shell sizing, and optional authenticated admin access.
- The authenticated test runs only when `E2E_RUN_AUTH=1` is set.

`frontend/src/app/components/ThemeToggle.tsx`

- Dark/light mode toggle.
- Saves the user's explicit choice and otherwise follows the device color-scheme preference.

`frontend/src/app/components/WebSocketLivePanel.tsx`

- Live vitals WebSocket panel.

`frontend/src/app/components/ClinicianPdfReportButton.tsx`

- Generates clinician PDF reports.
- Dynamically imports the PDF report generator only when the button is clicked.

`frontend/src/app/components/DataTable.tsx`

- Generic patient/vitals data table.

`frontend/src/app/components/StatCard.tsx`

- Reusable metric card.

`frontend/src/app/components/ui/button.tsx`

- Shared button styling.

`frontend/src/app/components/ui/card.tsx`

- Shared card wrapper.

`frontend/src/app/components/ui/select.tsx`

- Shared select wrapper.

`frontend/src/app/components/ui/table.tsx`

- Shared table components.

`frontend/src/app/components/ui/tabs.tsx`

- Shared tab components.

### Frontend Utilities and Data

`frontend/src/app/utils/alertEngine.ts`

- Converts vitals and risk information into alerts.

`frontend/src/app/utils/riskEngine.ts`

- Calculates risk scores from vitals and patient context.

`frontend/src/app/utils/predictiveRisk.ts`

- Frontend prediction helper logic.

`frontend/src/app/utils/clinicianReport.ts`

- Builds clinician report text.

`frontend/src/app/utils/clinicianPdfReport.ts`

- Builds PDF report content.

`frontend/src/app/utils/clinicianQueue.ts`

- Builds clinician queue data.

`frontend/src/app/utils/liveMonitoring.ts`

- Live monitoring helpers.

`frontend/src/app/utils/storage.ts`

- Local storage helpers.

`frontend/src/app/data/healthData.ts`

- Fallback/demo health data.

`frontend/src/app/data/mockPatients.ts`

- Fallback/demo patient data.

`frontend/src/types/patient.ts`

- Frontend `Patient` and `RiskLevel` types.

`frontend/src/styles/index.css`

- Main global stylesheet.
- Imports Tailwind.
- Defines font, theme variables, panel, field, focus, chart, scrollbar, dashboard, reduced-motion, and risk styles.

`frontend/src/App.css`

- Removed legacy starter CSS. The active global app styling is in `frontend/src/styles/index.css`.

## Debugging Checklist

If login fails:

1. Confirm backend is running on `http://127.0.0.1:8000`.
2. Confirm frontend `.env` has `VITE_API_BASE_URL=http://127.0.0.1:8000`.
3. Confirm PostgreSQL is running and `DATABASE_URL` is correct.
4. Run `curl http://127.0.0.1:8000/health/ready`.
5. Reset admin if needed with `scripts/reset_admin.py`.

If admin approvals show "Failed to load requests":

1. Confirm PostgreSQL is running on the host/port in `DATABASE_URL`.
2. Run `curl http://127.0.0.1:8000/health/ready`.
3. Restart the backend after PostgreSQL is available.
4. Open the browser console/network tab and confirm `/registration-requests/` returns `200`.

If patient data is missing:

1. Confirm the logged-in doctor/nurse is assigned to that patient.
2. Check `patient_staff_assignments` for active doctor/nurse rows.
3. Check legacy fallback fields `patients.primary_doctor_id`, `patients.assigned_nurse_id`, and `patients.user_id`.
4. Remember inaccessible patients intentionally return `404`.

If migrations fail:

1. Check `DATABASE_URL`.
2. Escape special URL characters in the password.
3. Run from the `backend` directory.
4. Run `alembic current` to see the applied revision.

If tests fail:

1. Confirm test dependencies are installed with `pip install -r requirements.txt`.
2. Confirm PostgreSQL is reachable.
3. Run `pytest -q` from `backend`.

If E2E tests fail:

1. Confirm frontend dependencies are installed with `npm install`.
2. Confirm Playwright browsers are installed with `npx playwright install`.
3. Confirm the backend is running before enabling `E2E_RUN_AUTH=1`.
4. Run `npm run test:e2e` from `frontend`.

## Production Notes

Before real deployment:

- Replace `SECRET_KEY` with a long random value.
- Use HTTPS.
- Use a managed PostgreSQL database with backups.
- Use Redis-backed rate limiting for multi-worker deployments.
- Put FastAPI behind a load balancer or reverse proxy.
- Set `TRUSTED_PROXY_COUNT` correctly.
- Rotate the development admin password.
- Continue expanding password self-service for non-admin users if required.
- Add structured logging and centralized log storage.
- Consider moving AI calls into background jobs if latency becomes an issue.

## Future Improvements

- Add patient/clinician self-service password change with admin verification where required by project policy.
- Add refresh-token rotation and token revocation for stronger session control.
- Replace the local in-memory rate limiter with Redis for multi-instance production deployments.
- Move notification fanout to a dedicated pub/sub layer when running multiple backend instances.
- Add appointment scheduling and direct secure messaging.
- Add more historical audit reporting and long-term retention controls.
- Expand end-to-end browser tests for registration approval, assignment management, referrals, and clinician workflows.
