# Local demo verification — 10 November 2026

This is a local software verification record for synthetic data. It is separate from the dated Phase 6–8 and 9 November evidence. No deployment or merge was performed during these checks. Linux CI on the submission commit is tracked separately.

## Checkout and environment

- Branch: `feature/security-reliability-20261109`; starting commit: `0aebba0e70dca9af1d576e5155fa394ad7933d37`. The working tree was clean before this work; the lock files, scripts, code, tests, screenshots, and this record were the changes prepared for the submission commit.
- Windows NT 10.0.26300.0, Node.js 22.23.3, Python 3.12.10 in a fresh temporary virtual environment. Local PostgreSQL was used only through `scripts/run-local-backend-tests.py`, which creates and removes a random `*_test` database. Linux CI and physical phones were not run here.
- Runtime lock: `backend/requirements.lock`; development/test lock: `backend/requirements-dev.lock`. Both were generated with Python 3.12 and `pip-tools==7.6.2`, pin direct and transitive packages, and include SHA-256 hashes. The source requirement files remain the place to edit direct dependencies.

## Commands and observed checks

Run these from the repository root with Python 3.12 active, except the frontend commands, which run from `frontend/`:

```powershell
python -m pip install pip-tools==7.6.2
powershell -ExecutionPolicy Bypass -File .\scripts\lock-backend.ps1
python -m venv .tmp\backend-locked
.\.tmp\backend-locked\Scripts\python.exe -m pip install --require-hashes -r backend\requirements-dev.lock
.\.tmp\backend-locked\Scripts\python.exe -m pip check
.\.tmp\backend-locked\Scripts\python.exe .\scripts\run-local-backend-tests.py
cd frontend
npm.cmd run lint
npm.cmd run build
npx.cmd playwright test --workers=1 --reporter=list
npx.cmd playwright test --workers=2 --reporter=list
```

| Check | Observed result |
| --- | --- |
| `scripts/lock-backend.ps1` regeneration with Python 3.12 and pip-tools 7.6.2 | Exit 0 for both runtime and development locks; pip-tools emitted a future `--strip-extras` default warning. Local output: `.tmp/lock-regeneration.log`. |
| Fresh hashed dependency installation and `pip check` | Exit 0; no broken requirements. Verified on Windows/Python 3.12.10. |
| Disposable PostgreSQL migration upgrade, downgrade, upgrade, then backend pytest | Exit 0; **168 passed**, one third-party Starlette/httpx deprecation warning; test database removed. The suite includes the simultaneous refresh race and ML acceptance-gate tests. |
| Frontend ESLint and production build | Both exit 0. |
| Full Chromium suite, one worker | Exit 0; **43 passed, 1 intentionally skipped** (admin live-auth case requires a seeded backend). See local `.tmp/playwright-full_one_final.log`. |
| Four targeted Chromium checks: expired refresh and three 360px mobile flows | Exit 0; **4 passed**. See local `.tmp/playwright-mobile_final.log`. |
| Full Chromium suite, two workers, during dependency installation | Exit 1; **40 passed, 3 failed, 1 skipped**. Vite dynamic-import fetch errors and browser context closure appeared under concurrent machine load. See local `.tmp/playwright-full_two_final.log`; a clean rerun is recorded below. |
| Full Chromium suite, two workers, after installation completed | Exit 0; **43 passed, 1 intentionally skipped** in 159.3 seconds. See local `.tmp/playwright-full_two_clean.log`. |

The earlier Playwright shutdown symptom was reproduced with the two HTTP-client tests: both assertions passed, but the process stayed alive beyond a 100-second bound. Its Vite `webServer` child remained active, and the restricted command sandbox denied process-tree termination. The same tests with the unchanged npm `webServer` command exited 0 in 16.8 seconds with normal process permissions (`.tmp/playwright-elevated_original.log`). No forced-exit workaround or longer production timeout was added. The complete one-worker run also exited 0.

## Mobile and ML scope

Playwright used Chromium headless mobile emulation at **360 × 780 CSS pixels**, device scale factor 2, with touch enabled. Synthetic fixtures verified visible sign-in fields and error text, patient vitals and menu navigation, clinical alert content and filters, and absence of page-level horizontal overflow. Screenshots: [sign-in](../evidence/local-demo-2026-11-10/sign-in-validation-chromium-360.png), [patient overview](../evidence/local-demo-2026-11-10/patient-overview-chromium-360.png), and [clinical alerts](../evidence/local-demo-2026-11-10/clinical-alerts-chromium-360.png). The model candidate's risk estimate was not shown as a patient measurement: its held-out sensitivity of 0.585 remains below the preset 0.60 inference gate. The backend acceptance-gate test passed within the 168-test run; installed legacy proxy metrics remain separate in the [model card](../ML_MODEL_CARD.md).

Physical-device, mobile-network, reconnect, real Withings delivery, prospective clinical effectiveness, and cross-process alert delivery through two backend processes were **not tested**. Browser worker count does not establish backend cross-process behavior.

## Open follow-up

- Keep the configured one-worker default for the local demo; the clean two-worker rerun passed, but the loaded run showed sensitivity to concurrent package installation. Avoid installing packages while presenting or testing the app.
- Run the locked install and CI checks on Linux/Python 3.12 before claiming cross-platform lock verification.
- Test real-device and cross-process alert delivery separately with governed synthetic records; local browser fixtures cannot establish them.

The clean two-worker rerun passed after package installation had completed. This supports browser-test concurrency in this local environment, not cross-process backend alert delivery.
