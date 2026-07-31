"""Prepare Render's environment and start the production API.

Render keeps values entered in its dashboard even when a Blueprint default is
changed. In particular, an existing blank value overrides the Blueprint. This
launcher supplies deployment-specific defaults only when values are blank and
keeps optional integrations disabled until their complete configuration exists.
"""

from __future__ import annotations

import os
from pathlib import Path
import subprocess
import sys


FRONTEND_URL = "https://aihealthcaredashboard.vercel.app"
API_HOST = "health-risk-dashboard-api.onrender.com"


def set_default_if_blank(name: str, value: str) -> None:
    if not os.getenv(name, "").strip():
        os.environ[name] = value


def configure_environment() -> None:
    set_default_if_blank("FRONTEND_URL", FRONTEND_URL)
    set_default_if_blank("CORS_ORIGINS", FRONTEND_URL)
    set_default_if_blank("ALLOWED_HOSTS", API_HOST)

    withings_names = (
        "WITHINGS_CLIENT_ID",
        "WITHINGS_CLIENT_SECRET",
        "WITHINGS_REDIRECT_URI",
        "WITHINGS_WEBHOOK_URL",
    )
    if not any(os.getenv(name, "").strip() for name in withings_names):
        os.environ["REQUIRE_WITHINGS"] = "false"
        # A legacy generated key by itself is an incomplete integration.
        os.environ.pop("INTEGRATION_ENCRYPTION_KEY", None)

    if not os.getenv("SENTRY_DSN", "").strip():
        os.environ["REQUIRE_SENTRY"] = "false"


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def main() -> None:
    configure_environment()
    backend_dir = Path(__file__).resolve().parents[1]
    os.chdir(backend_dir)

    run([sys.executable, "scripts/wait_for_database.py"])
    run([sys.executable, "-m", "alembic", "upgrade", "head"])
    run([sys.executable, "scripts/preflight.py"])
    run(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "main:app",
            "--host",
            "0.0.0.0",
            "--port",
            os.getenv("PORT", "10000"),
        ]
    )


if __name__ == "__main__":
    main()
