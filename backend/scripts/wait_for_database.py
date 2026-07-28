import os
import sys
import time
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

sys.path.append(str(Path(__file__).resolve().parents[1]))

from config import get_settings


def main() -> None:
    settings = get_settings()
    attempts = int(os.getenv("DATABASE_WAIT_ATTEMPTS", "30"))
    delay_seconds = int(os.getenv("DATABASE_WAIT_DELAY_SECONDS", "5"))
    engine = create_engine(settings.database_url, pool_pre_ping=True)

    for attempt in range(1, attempts + 1):
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            print("Database is reachable.")
            return
        except OperationalError as error:
            print(
                "Database is not reachable yet "
                f"({attempt}/{attempts}). Retrying in {delay_seconds}s..."
            )
            if attempt == attempts:
                raise error
            time.sleep(delay_seconds)


if __name__ == "__main__":
    main()
