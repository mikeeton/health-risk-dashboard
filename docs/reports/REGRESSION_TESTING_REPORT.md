# Regression testing report — 19 October 2026

The source tree contains pre-existing uncommitted work, so these results describe the current working tree and cannot be tied to a release SHA. Tests used local and synthetic data. The installed July model remained separate from the new observed-target candidate.

| Check | Command or scope | Result |
|---|---|---|
| Backend full suite | From `backend`: `venv/Scripts/python.exe -m pytest tests -q` | 154 passed, one Starlette deprecation warning, after socket database checks were moved off the ASGI event loop and two responsiveness regressions were added. |
| Backend targeted changes | PhysioNet preparation, ML pipeline, source adapters, measurement ingestion, early warning and integration hardening | 30 passed after the latest alert assessment and research endpoint changes. |
| Frontend static checks | `npm.cmd run lint`; `npm.cmd run build` in `frontend` | Passed after the research attribution and outcome UI changes. |
| Frontend full browser suite | `npx.cmd playwright test --reporter=line` | 28 passed, one pre-existing skip, repeated against the restarted local API after the socket change. |
| Final browser focus | Sparse device observation and research candidate tests | 2 passed after the device unit wording change; candidate screenshot captured. |
| Final responsive recapture | Device route at desktop, tablet and mobile widths in both themes | 1 Playwright test passed after the mobile scroll cue; light desktop and dark mobile screenshots refreshed. |
| Final UTC timestamp focus | Withings API UTC serialisation test | 1 passed after the 137-test full run; focused verification of the later serialisation change. |
| Final provider-input focus | Malformed group, missing timestamp, invalid units and duplicate delivery | 2 passed after the 139-test full run; final provider-input changes did not alter the frontend contract. |
| Responsive and access checks | Role screens at 1440/768/390 px in both themes; axe, 200% zoom and keyboard checks | Included in the full browser suite; representative screenshots retained in `docs/evidence/`. |

The backend tests cover observed next-window label construction and raw-archive window coverage, invalid source values, missing-data handling, patient partitioning and dataset hash checks; partial Withings groups, idempotency, sync-attempt counts and patient scope; and durable assessment failure/retry and urgent-case deduplication. Browser fixtures confirm that a source error is not presented as a disconnected device, a sparse observation names absent fields, sync history is legible, and a research-only candidate cannot be mistaken for the installed predictor.

The retry also probed the running API during browser and backend workloads: 25/25 liveness requests and 10/10 readiness requests returned HTTP 200 (slowest readiness response 267 ms). The restarted process logged no new connection-pool timeout during the run. This is a bounded local load check, not a sustained-uptime or production result.

On **20 October 2026**, the same current working tree was checked again: the full backend suite passed **154 tests** with one third-party warning, and the full Chromium suite passed **28 tests with one existing skip**. They ran concurrently, so the browser sweep took 5.3 minutes. Local frontend and API readiness returned HTTP 200, and the API error log still showed no pool timeout. The hosted API remained suspended; see `DEPLOYMENT_VERIFICATION_REPORT.md`.

Security batch: `tests/test_security.py -q` passed 28 tests. New cases check that a live socket closes before delivering a queued update when access is revoked, that assignment removal and account suspension invalidate the persisted scope check, and that device-observation reads reject another patient's record. See `SECURITY_REVIEW.md` for the remaining logout/session limits.

Known limits: a passing suite does not establish diagnostic validity, production readiness, live Withings interoperability, multi-worker crash recovery, or complete accessibility across all routes. The live backend was suspended during the read-only check; authenticated production regression was unavailable. See `DEPLOYMENT_VERIFICATION_REPORT.md` and `ML_PIPELINE_VALIDATION_REPORT.md`.

On **21 October 2026**, an isolated virtual environment using `backend/requirements-alwaysdata.txt` passed `pip check` and the full backend suite: **153 passed, 1 skipped** (the test requiring optional Redis), with one third-party Starlette deprecation warning. The two affected test files also passed **13 tests** in the full development environment, where Redis and SHAP are installed. This checks the no-card demo dependency profile locally; Alwaysdata Free memory, disk, WebSocket behaviour and process lifetime still require verification on the actual account.

The later local secondary-page theme batch passed the full development backend suite (**154 passed**, one third-party warning), frontend lint and production build, and the full Chromium suite (**29 passed, 1 existing skip**). The new browser case checks Operations and Profile & Security in light/dark themes at 1440 and 390 px, field surface colours, overflow and desktop Axe findings. It was also rerun with synthetic screenshot capture for the supervisor evidence folder. Live deployment remained paused at the owner's request.
