# Testing and evidence

Run the backend suite against a disposable local PostgreSQL database from the repository root:

```powershell
.\backend\venv\Scripts\python.exe .\scripts\run-local-backend-tests.py
```

The runner applies Alembic migrations, rehearses a downgrade and re-upgrade, runs pytest, and removes the test database. Direct pytest refuses a non-test database. See [isolated PostgreSQL verification](testing/LOCAL_POSTGRESQL.md) for the Docker alternative and environment details.

Run the frontend checks from `frontend/`:

```powershell
npm.cmd ci
npm.cmd run lint
npm.cmd run build
npm.cmd run test:e2e
```

On 9 November 2026, the isolated backend run passed **168 tests**; lint and build passed. Two targeted Chromium tests passed, but Playwright hung during shutdown, so that targeted command did not exit cleanly. These are local software checks using synthetic fixtures. They do not prove real wearable delivery, clinical alert effectiveness, hosted reliability, or human accessibility.

The [formal test matrix](FORMAL_TEST_MATRIX.md) maps requirements to checks. The [test inventory](testing/COMPLETE_TEST_INVENTORY.md) and [dated verification record](reports/LOCAL_VERIFICATION_2026-11-09.md) are historical snapshots; read their dates and configurations before comparing counts. Model results and limitations are in the [model card](ML_MODEL_CARD.md) and [validation report](reports/ML_PIPELINE_VALIDATION_REPORT.md).
