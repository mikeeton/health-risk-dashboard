"""Fail-fast production deployment checks.

Run after environment variables are injected and migrations are applied:
`python scripts/preflight.py`.
"""

from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import inspect, text

from config import get_settings
from database import engine


REQUIRED_TABLES = {
    "users",
    "auth_sessions",
    "patients",
    "vitals",
    "audit_logs",
    "alembic_version",
}


def main():
    settings = get_settings()
    if settings.environment != "production":
        raise RuntimeError("Preflight must run with APP_ENV=production")

    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
        tables = set(inspect(connection).get_table_names())
        missing = REQUIRED_TABLES - tables
        if missing:
            raise RuntimeError(f"Database is missing required tables: {sorted(missing)}")
        current = connection.execute(
            text("SELECT version_num FROM alembic_version")
        ).scalar_one()

    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    heads = ScriptDirectory.from_config(config).get_heads()
    if [current] != heads:
        raise RuntimeError(
            f"Database migration is {current}; expected exactly {heads}"
        )

    print("Production preflight passed.")


if __name__ == "__main__":
    main()
