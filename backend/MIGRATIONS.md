# Database Migrations

This backend uses Alembic for PostgreSQL schema changes.

Run migrations from the `backend` directory:

```bash
source venv/bin/activate
alembic upgrade head
```

For an existing database that already has all tables but no Alembic version row,
the baseline migration is idempotent and can be run directly:

```bash
alembic upgrade head
```

Create a new migration after model changes:

```bash
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

`RUN_STARTUP_SCHEMA_CHECK=true` is only a local recovery fallback. Keep it
`false` in normal development and production so schema changes are tracked in
migration files.
