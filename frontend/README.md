# Health Risk Dashboard Frontend

React + TypeScript + Vite frontend for the Health Risk Dashboard.

This frontend is role-aware. Admin users see system-management workflows,
clinicians see patient-care workflows, and patients see only their personal
record. The backend remains the source of truth for permissions; frontend route
guards exist to improve user experience and avoid exposing irrelevant screens.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Expected API setting:

```text
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Vercel Deployment

Deploy this folder as the Vercel project root:

```text
frontend
```

Set this Vercel environment variable to the deployed backend URL:

```text
VITE_API_BASE_URL=https://your-render-api.onrender.com
```

`vercel.json` configures Vite build output and React Router route rewrites.

## Checks

```bash
npm run lint
npm run build
npm run test:e2e
```

The default Playwright suite checks:

- login and access-request screens
- password visibility controls
- invalid-login feedback
- responsive overflow on phone, tablet, and desktop widths
- authenticated app-shell fit on phone and tablet widths

## Structure

- `src/app/routes.tsx` app routes and role-protected pages
- `src/app/services/api.ts` REST API helpers
- `src/app/services/liveSocket.ts` live vitals WebSocket helper
- `playwright.config.ts` browser test configuration
- `tests/e2e` Playwright smoke tests
- `src/app/context` auth, toast, and health data providers
- `src/app/pages` top-level dashboard pages
- `src/app/components` reusable UI and clinical dashboard components
- `src/app/components/PasswordField.tsx` shared password input with show/hide controls
- `src/app/components/ThemeToggle.tsx` adaptive light/dark theme toggle
- `src/styles/index.css` active global styling, theme variables, focus states, responsive grid, and reduced-motion support

## Key Workflows

- Admin: users, registration approvals, referral approvals, assignments, and audit logs.
- Doctor: assigned patients, analytics, reports, diagnoses, treatment notes, referrals, and escalations.
- Nurse: assigned patients, vitals, medication actions, nursing notes, referrals, and alerts.
- Patient: linked personal health record only.

## Notification UX

The notification bell and notification centre use backend notifications plus
live clinical alerts. They support unread badges, read/unread filters, search,
mark one read, mark all read, loading states, and empty states. The dropdown
opens an authenticated notification WebSocket for production update hints and
keeps periodic polling as a fallback.

## E2E Tests

Run browser smoke tests with:

```bash
npm run test:e2e
```

Authenticated admin checks are opt-in:

```bash
E2E_RUN_AUTH=1 \
E2E_ADMIN_EMAIL=admin@example.com \
E2E_ADMIN_PASSWORD='AdminPassword123!' \
npm run test:e2e
```

## Referral UX

The `/referrals` page lets doctors and nurses submit referral requests for
patients they can already access. The `/admin/referrals` page lets admins
approve, reject, or request more information without opening private clinical
records.

## Design Notes

- Use existing role guards and `ProtectedRoute` for page access.
- Use `api.ts` helpers instead of calling `fetch` directly in pages.
- Keep clinical actions explicit and feedback-driven with disabled/loading states.
- Keep admin pages free of clinical vitals, diagnosis, and report content.
- Keep password inputs on the shared `PasswordField` component so accessibility and browser tests stay consistent.
- The theme toggle saves explicit user choice; otherwise the app follows the device light/dark preference.
- Mobile layouts should avoid fixed widths unless the content is inside an intentional horizontal scroll area such as a data table.
