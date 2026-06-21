# Frontend

React + TypeScript + Vite frontend for the Health Risk Dashboard.

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
