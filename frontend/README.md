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

## Checks

```bash
npm run lint
npm run build
```

## Structure

- `src/app/routes.tsx` app routes and role-protected pages
- `src/app/services/api.ts` REST API helpers
- `src/app/services/liveSocket.ts` live vitals WebSocket helper
- `src/app/context` auth, toast, and health data providers
- `src/app/pages` top-level dashboard pages
- `src/app/components` reusable UI and clinical dashboard components

## Key Workflows

- Admin: users, registration approvals, referral approvals, assignments, and audit logs.
- Doctor: assigned patients, analytics, reports, diagnoses, treatment notes, referrals, and escalations.
- Nurse: assigned patients, vitals, medication actions, nursing notes, referrals, and alerts.
- Patient: linked personal health record only.

## Notification UX

The notification bell and notification centre use backend notifications plus
live clinical alerts. They support unread badges, read/unread filters, search,
mark one read, mark all read, loading states, and empty states.

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
