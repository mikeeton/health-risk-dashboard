# Vitala frontend

React, TypeScript, Vite, and Tailwind CSS power Vitala's role-specific workspaces. The browser client calls the FastAPI backend; it does not contain production patient data or a standalone database.

## API client structure

`src/app/services/api.ts` preserves existing imports while domain modules beside it group authentication, clinical records, care workflows, notifications, analytics, AI, integrations, referrals, research, and administration. Shared request and error handling lives in `httpClient.ts`; shared record types begin in `src/app/types/api.ts`. Add new endpoints to their domain module with explicit request and response types.

## Local development

Start the [backend](../README.md#run-locally) first. Then, in PowerShell from this directory:

```powershell
npm.cmd ci
Copy-Item .env.example .env.local
npm.cmd run dev
```

Open `http://localhost:5173`. Set `VITE_API_BASE_URL` in `.env.local` to the local API address if needed. Never put API secrets in a `VITE_` variable: those values are included in the browser bundle.

## Quality checks

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run test:e2e
```

Playwright starts its own Vite server by default and uses synthetic API fixtures for most routes. The suite checks role navigation, light and dark themes, mobile layouts, keyboard access, selected accessibility rules, and main workflows. Fixture results do not establish live backend or provider reliability.

See the [project overview](../README.md), [design system](../docs/reports/FRONTEND_DESIGN_SYSTEM.md), and [documentation index](../docs/README.md).
