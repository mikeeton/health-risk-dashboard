# Screenshot Capture Notes

## Capture conditions

- Capture date: 23 July 2026
- Frontend: local Vite development server
- Browser engine: Playwright Chromium
- Desktop viewport: 1440 × 1000 pixels
- Mobile viewport: 390 × 844 pixels
- Theme: light

Most images show the complete browser viewport or full page. The CSV-upload
image is intentionally cropped to the `<main>` content area because that
produces a cleaner report figure focused on the upload schema and controls.

PostgreSQL was unavailable during this capture. The public login and access
request pages were captured directly. Protected pages were rendered with the
same test-only local-storage session pattern used by the project’s Playwright
tests. API requests were intercepted and returned clearly labelled synthetic
records using `Demo` names and the reserved `.invalid` email domain.

Consequently, the protected screenshots demonstrate implemented page layout,
navigation, role routing, controls, synthetic-data presentation, and
responsive behaviour. They must not be presented as proof of database
transactions, successful AI output, clinical accuracy, or production
deployment.

## Recapturing with database evidence

1. Start PostgreSQL.
2. Apply migrations from `backend` with `alembic upgrade head`.
3. Seed only synthetic demonstration data.
4. Start FastAPI and Vite.
5. Log in with each demonstration role.
6. Capture the high-value replacements listed in
   `02-screenshot-catalogue.md`.
7. Remove or obscure identifiers and secrets.
8. Update the evidence note for each replaced image.

## Reproducible interface capture

With the Vite server running at `http://127.0.0.1:5173`, run:

```bash
cd frontend
node ../final-year-report-materials/capture-screenshots.mjs
```
