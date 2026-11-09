# Front-end UI/UX audit

Date: 19 October 2026. Scope: React/Vite routes, shared shell, clinical role workspaces, AI, connected devices, monitoring notifications and retained screenshots. Historical dissertation screenshots are a visual baseline, not proof of current behaviour. New captures use synthetic intercepted API fixtures; see [workspace review evidence](../evidence/WORKSPACE_REVIEW.md).

| Finding | Resolution and evidence | Remaining limit |
|---|---|---|
| Theme previously depended on the authenticated toggle | Theme starts in `main.tsx`, persists across public and protected routes, and is exercised in the browser suite in light and dark modes. | Older specialist pages still need individual manual contrast review. |
| Public login used the authenticated shell and hid MFA on mobile | `PublicLayout` and the login form now keep public navigation separate and the code field visible. | None found in the exercised public flow. |
| Role dashboards repeated generic cards | Doctor has a clinical queue and observed trends; nurse has a worklist and care schedule; patient has a plain-language record; admin has an operational status console. | Broader root Dashboard still contains legacy panels. |
| AI, device and alert sections lacked distinct task views | AI has session conversation/evidence context; `/devices` shows connection and device-sourced records; monitoring prioritises clinical events and clarifies read versus case status. | Session history is in-memory; no device sync-history or alert-progression API is invented. |
| Muted text failed contrast on pale surfaces and dark legacy classes | Shared muted token was darkened; dark `text-slate-500` maps to semantic muted text; inactive event tabs were corrected. Automated Axe scans pass at serious/critical level on the eight reviewed routes in both themes. | Automated Axe cannot establish full WCAG conformance. |
| Wide content and charts needed responsive review | Seven routes were checked at desktop, tablet and mobile widths in both themes; keyboard and 200% zoom checks pass. Doctor trend chart provides exact-value table and narrows to it at small container widths. | Manual assistive-technology and live-data checks are still needed. |

The screenshot set includes representative light desktop and dark mobile captures for all eight reviewed sections. The historical baseline is `docs/dissertation/screenshots/`. Production and real-patient rendering were not part of this visual review.
