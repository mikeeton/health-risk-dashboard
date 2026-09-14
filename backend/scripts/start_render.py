"""Apply safe optional-integration defaults and start one Render worker."""

from __future__ import annotations

import os
from pathlib import Path
import subprocess
import sys


def configure_environment() -> None:
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
            "--workers",
            "1",
        ]
    )


if __name__ == "__main__":
    main()
