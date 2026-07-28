# Health Risk Dashboard frontend

React, TypeScript, and Vite client for the Health Risk Dashboard.

```bash
npm ci
copy .env.example .env.local
npm run dev
```

Production verification:

```bash
npm audit --audit-level=high
npm run lint
npm run build
npm run test:e2e
```

Set `VITE_API_BASE_URL` to the HTTPS backend URL before building production.
The production host must provide the security headers in `vercel.json`.
See the root `README.md`, `DEPLOYMENT.md`, and `DEPLOYMENT_CHECKLIST.md`.
