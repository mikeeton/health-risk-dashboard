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

## Current Migration Chain

- `20260621_0001_baseline`: creates the base user, patient, clinical, audit, notification, and registration tables.
- `20260621_0002_staff_assignments`: adds many-to-many doctor/nurse patient assignments and backfills legacy care-team columns.
- `20260621_0003_referrals_notifications`: adds referral requests and richer notification metadata.

## Final-Year Project Notes

Migrations are part of the project evidence: they show how the schema evolved
from simple ownership fields into a safer staff-assignment and referral-approval
model. Do not edit an already-applied migration for normal changes; create a new
revision so the database history stays explainable.
