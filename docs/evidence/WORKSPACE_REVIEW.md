# Workspace visual review evidence — 19 October 2026

The historical baseline screenshots in `docs/dissertation/screenshots/` predate the section-specific redesign. The `workspace-review-2026-10-19/` captures show the current frontend with **synthetic Playwright fixtures** and intercepted API responses. They verify layout and state presentation, not live clinical or production data. Baseline and current captures therefore illustrate a design progression, not a pixel-matched same-data comparison.

| Section | Historical baseline | Current light desktop | Current dark mobile |
|---|---|---|---|
| Doctor | `02-doctor-dashboard.png` | `doctor-doctor-light-desktop.png` | `doctor-doctor-dark-mobile.png` |
| Model intelligence | `09-six-hour-ml-prediction.png` | `doctor-analytics-light-desktop.png` | `doctor-analytics-dark-mobile.png` |
| Restricted research | No matching historical route | `admin-admin-research-light-desktop.png` | `admin-admin-research-dark-mobile.png` |
| Nurse | `05-nurse-dashboard.png` | `nurse-nurse-light-desktop.png` | `nurse-nurse-dark-mobile.png` |
| Patient | `08-patient-dashboard.png` | `patient-patient-light-desktop.png` | `patient-patient-dark-mobile.png` |
| Administrator | `06-admin-dashboard.png` | `admin-admin-light-desktop.png` | `admin-admin-dark-mobile.png` |
| AI assistant | `03-ai-assistant.png` | `doctor-ai-assistant-light-desktop.png` | `doctor-ai-assistant-dark-mobile.png` |
| Monitoring | `04-notifications.png` | `doctor-notifications-light-desktop.png` | `doctor-notifications-dark-mobile.png` |
| Connected devices | No dedicated baseline page | `patient-devices-light-desktop.png` | `patient-devices-dark-mobile.png` |

Current screenshot filenames are relative to `docs/evidence/workspace-review-2026-10-19/`, except the restricted research row, which is in `docs/evidence/workspace-upgrade-2026-10-19/`; historical filenames are relative to `docs/dissertation/screenshots/`. The screenshot test also checks 768 px tablet and both themes at 1440, 768 and 390 px; only representative desktop and mobile captures are retained. See `frontend/tests/e2e/workspace-review.spec.ts` for the fixture and capture recipe (`CAPTURE_REVIEW_SCREENSHOTS=1`).

The later `workspace-upgrade-2026-10-19/` capture set records the updated analytics and device routes: `doctor-analytics-light-desktop.png`, `doctor-analytics-dark-mobile.png`, `doctor-analytics-candidate-light-desktop.png`, `patient-devices-light-desktop.png` and `patient-devices-dark-mobile.png`. The candidate capture is deliberately separate from the installed legacy artifact. All use synthetic fixtures; they are evidence of presentation and responsive behaviour, not measured clinical performance or live deployment.

The device light desktop and dark mobile captures were refreshed after adding the persistent synchronisation timeline. Its success row and accepted/rejected counts come from the synthetic browser fixture, not a live Withings account.

The restricted research capture in `workspace-upgrade-2026-10-19/` shows the genuine-SHAP/fallback distinction and expired-window adjudication form. It uses synthetic model and pending-window fixtures. The research route was subsequently added to the two-theme responsive and axe sweep; its dark header contrast was corrected after the first sweep.
