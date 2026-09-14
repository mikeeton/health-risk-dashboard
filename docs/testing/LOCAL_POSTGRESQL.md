# Isolated PostgreSQL verification

The repository includes a disposable PostgreSQL 16 environment for migration
and backend-test evidence. It uses test-only credentials, binds to
`127.0.0.1:55432`, stores its data in container memory, and does not touch a
developer or hosted database.

## Complete verification

Docker Desktop must be running. From the repository root on PowerShell, run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\test-postgresql.ps1
```

The process-scoped bypass also works on Windows installations that require
local scripts to be signed; it does not modify the machine or user execution
policy.

The runner performs these operations in order:

1. removes only the `health-risk-dashboard-test` Compose stack from a previous
   interrupted run;
2. starts a new empty PostgreSQL database and waits for its health check;
3. applies `alembic upgrade head`;
4. downgrades to the CI compatibility target `20260728_0005` and upgrades to
   head again;
5. verifies that every Alembic head is applied;
6. runs the complete backend pytest suite with the isolated PostgreSQL URL; and
7. removes the containers and ephemeral data, including when a command fails.

Use `-SkipBackendTests` to rehearse migrations only. Use `-KeepDatabase` for
diagnosis; when finished, remove that isolated stack explicitly:

```powershell
docker compose -f compose.test.yml -p health-risk-dashboard-test down --volumes
```

## Redis is optional

Core migration and backend checks intentionally start no Redis container. This
proves that PostgreSQL remains the source of truth and the application retains
its local notification-broadcast fallback. To inspect the optional Redis path:

```powershell
docker compose -f compose.test.yml -p health-risk-dashboard-test --profile redis up -d --wait
```

The optional service binds to `127.0.0.1:56379`; set
`REDIS_URL=redis://127.0.0.1:56379/0` only for checks that explicitly exercise
Redis.

## CI parity

The GitHub Actions workflow uses its own disposable PostgreSQL service and
runs the same clean upgrade, downgrade to `20260728_0005`, upgrade-to-head, and
pytest sequence. It also performs the frontend dependency audit, lint, build,
Playwright tests, and secret scanning. The local Compose file is for repeatable
developer and dissertation evidence; CI does not depend on Docker Compose.
