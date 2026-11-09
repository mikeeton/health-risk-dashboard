from pathlib import Path
import os
import sys

import pytest
from sqlalchemy.engine import make_url

sys.path.append(str(Path(__file__).resolve().parents[1]))


def pytest_sessionstart(session: pytest.Session) -> None:
    """Refuse to collect tests against an application or hosted database."""
    raw_url = os.getenv("DATABASE_URL", "")
    if os.getenv("APP_ENV", "").lower() != "test" or not raw_url:
        raise pytest.UsageError(
            "Backend tests require APP_ENV=test and an explicit local *_test DATABASE_URL. "
            "Use scripts/run-local-backend-tests.py or scripts/test-postgresql.ps1."
        )
    try:
        url = make_url(raw_url)
    except Exception as error:
        raise pytest.UsageError("Invalid test DATABASE_URL") from error
    if (
        not url.drivername.startswith("postgresql")
        or url.host not in {"localhost", "127.0.0.1", "::1"}
        or not (url.database or "").endswith("_test")
    ):
        raise pytest.UsageError(
            "Backend tests require a local PostgreSQL database whose name ends in _test."
        )
