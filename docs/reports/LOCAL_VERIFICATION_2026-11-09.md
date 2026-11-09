# Local verification — 9 November 2026

This record describes the local working tree before it was packaged into a Git commit. The full backend and browser suites, frontend lint, and production build were rerun on 9 November. No live deployment, real patient data, or real Withings provider exchange was tested.

| Check | Result |
| --- | --- |
| Backend full suite | **159 passed**, one third-party Starlette deprecation warning |
| Frontend lint | Passed |
| Frontend production build | Passed |
| Chromium browser suite | **38 passed**, one existing skip |
| Secondary-route audit | Passed for nine additional routes at mobile width and in dark mode, including automated serious/critical accessibility checks |

Backend regressions cover logout and refresh-session revocation of newly issued access tokens and socket tickets; interrupted alert-assessment retry; interrupted device-sync status that preserves later success; and ML artifact acceptance-gate enforcement. The browser audit found and corrected contrast failures on Review Cases, Care Workspace, and Upload Data. The former zoom-and-keyboard loop was split into nine independently bounded route tests, all passing.

The observed-target HR/BP model remains blocked: its held-out sensitivity failed the preset gate, and retrospective hypothetical false-positive prompts remain high. Browser tests use synthetic API fixtures. Real provider delivery, prospective clinical outcomes, complete assistive-technology evaluation, and clinical approval are not established by these results.
