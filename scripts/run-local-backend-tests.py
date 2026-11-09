"""Run migrations and pytest in a new disposable local PostgreSQL database.

Reads the local backend connection settings but never tests against that database.
Only a loopback PostgreSQL server is accepted. The new database name is random
and is removed after the child processes finish.
"""

import os
from pathlib import Path
import secrets
import shutil
import subprocess
import sys

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url


ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
BASE_TEMP = BACKEND / ".test_local_backend"
load_dotenv(BACKEND / ".env")


def main() -> int:
    raw_url = os.getenv("DATABASE_URL", "")
    if not raw_url:
        raise SystemExit("Set a local PostgreSQL DATABASE_URL in backend/.env first.")
    url = make_url(raw_url)
    if url.drivername not in {"postgresql", "postgresql+psycopg", "postgresql+psycopg2"} or url.host not in {"localhost", "127.0.0.1", "::1"}:
        raise SystemExit("This runner only accepts a local PostgreSQL server.")
    if os.getenv("APP_ENV", "development").lower() == "production":
        raise SystemExit("This runner cannot use production settings.")

    test_name = f"healthrisk_{secrets.token_hex(6)}_test"
    admin_engine = create_engine(url.set(database="postgres"), isolation_level="AUTOCOMMIT")
    environment = os.environ.copy()
    environment.update({
        "DATABASE_URL": url.set(database=test_name).render_as_string(hide_password=False),
        "APP_ENV": "test",
        "RATE_LIMIT_ENABLED": "false",
        "AI_ENABLED": "false",
    })
    try:
        with admin_engine.connect() as connection:
            connection.execute(text(f'CREATE DATABASE "{test_name}"'))
        print(f"Created disposable local database {test_name}", flush=True)
        commands = (
            (sys.executable, "-m", "alembic", "upgrade", "head"),
            (sys.executable, "-m", "alembic", "downgrade", "20260728_0005"),
            (sys.executable, "-m", "alembic", "upgrade", "head"),
            (
                sys.executable, "-m", "pytest", "tests", "-q", "-p", "no:cacheprovider",
                "--basetemp", str(BASE_TEMP),
            ),
        )
        for command in commands:
            result = subprocess.run(command, cwd=BACKEND, env=environment, check=False)
            if result.returncode:
                return result.returncode
        return 0
    finally:
        with admin_engine.connect() as connection:
            connection.execute(text(f'DROP DATABASE IF EXISTS "{test_name}" WITH (FORCE)'))
        admin_engine.dispose()
        if BASE_TEMP.is_dir() and BASE_TEMP.resolve().parent == BACKEND.resolve():
            shutil.rmtree(BASE_TEMP)
        print(f"Removed disposable local database {test_name}", flush=True)


if __name__ == "__main__":
    raise SystemExit(main())
