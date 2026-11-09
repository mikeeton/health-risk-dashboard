# Vitala frontend

React, TypeScript, Vite, and Tailwind CSS power Vitala's role-specific workspaces. The browser client calls the FastAPI backend; it does not contain production patient data or a standalone database.

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
