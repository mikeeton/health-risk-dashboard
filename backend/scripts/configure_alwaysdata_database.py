"""Configure an empty Vitala demo database without echoing its password.

Run from the Alwaysdata SSH terminal after creating the PostgreSQL database:
    .venv/bin/python scripts/configure_alwaysdata_database.py
"""

from getpass import getpass
import os
from pathlib import Path
import tempfile

from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL


ENV_FILE = Path(__file__).resolve().parents[1] / ".env"


def required(prompt: str, default: str) -> str:
    value = input(f"{prompt} [{default}]: ").strip() or default
    if not value:
        raise SystemExit(f"{prompt} is required")
    return value


def main() -> None:
    if not ENV_FILE.exists():
        raise SystemExit("Backend .env is missing")
    contents = ENV_FILE.read_text(encoding="utf-8")
    if contents.count("DATABASE_URL=\n") != 1:
        raise SystemExit("DATABASE_URL is already set or the template is invalid; leaving it unchanged")

    host = required("PostgreSQL host", "postgresql-vitala.alwaysdata.net")
    database = required("Empty database name", "vitala_base")
    username = required("Database username", "vitala")
    password = getpass("Database password (input hidden): ")
    if not password:
        raise SystemExit("Database password is required")

    url = URL.create(
        "postgresql+psycopg",
        username=username,
        password=password,
        host=host,
        port=5432,
        database=database,
    )
    engine = create_engine(url, connect_args={"connect_timeout": 10})
    try:
        with engine.connect() as connection:
            current = connection.execute(text("SELECT current_database()")).scalar_one()
            tables = connection.execute(
                text(
                    "SELECT count(*) FROM information_schema.tables "
                    "WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
                )
            ).scalar_one()
    finally:
        engine.dispose()
    if current != database or tables:
        raise SystemExit("Expected the named empty database; leaving .env unchanged")

    updated = contents.replace(
        "DATABASE_URL=\n",
        f"DATABASE_URL={url.render_as_string(hide_password=False)}\n",
        1,
    )
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8", dir=ENV_FILE.parent, prefix=".env.",
            delete=False,
        ) as temporary:
            temp_path = Path(temporary.name)
            os.chmod(temp_path, 0o600)
            temporary.write(updated)
        os.replace(temp_path, ENV_FILE)
    finally:
        if temp_path is not None:
            temp_path.unlink(missing_ok=True)
    print("Empty database connection verified; private .env updated (password not displayed).")


if __name__ == "__main__":
    main()
