import os
from functools import lru_cache

from sqlalchemy.engine import make_url
from dotenv import load_dotenv

load_dotenv()


def _csv_env(name: str, default: str) -> list[str]:
    raw_value = os.getenv(name, default)

    return [
        item.strip()
        for item in raw_value.split(",")
        if item.strip()
    ]


class Settings:
    app_name = "AI Health Risk Monitoring API"
    app_version = "0.1.0"

    database_url = os.getenv("DATABASE_URL", "")

    secret_key = os.getenv("SECRET_KEY", "dev-secret-change-me")
    jwt_algorithm = os.getenv("JWT_ALGORITHM", "HS256")
    access_token_expire_minutes = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
    )
    refresh_token_expire_days = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

    cors_origins = _csv_env(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )

    websocket_interval_seconds = int(os.getenv("WEBSOCKET_INTERVAL_SECONDS", "5"))

    def validate(self):
        if not self.database_url:
            raise RuntimeError(
                "DATABASE_URL is required and must point to PostgreSQL."
            )

        drivername = make_url(self.database_url).drivername

        if not drivername.startswith("postgresql"):
            raise RuntimeError(
                "Only PostgreSQL is supported. Set DATABASE_URL to a "
                "postgresql:// or postgresql+driver:// URL."
            )


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.validate()
    return settings
