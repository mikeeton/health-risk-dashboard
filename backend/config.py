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

    environment = os.getenv("APP_ENV", "development").strip().lower()
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

    rate_limit_enabled = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
    rate_limit_requests = int(os.getenv("RATE_LIMIT_REQUESTS", "120"))
    rate_limit_window_seconds = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
    auth_rate_limit_requests = int(os.getenv("AUTH_RATE_LIMIT_REQUESTS", "20"))
    auth_rate_limit_window_seconds = int(
        os.getenv("AUTH_RATE_LIMIT_WINDOW_SECONDS", "60")
    )

    trusted_proxy_count = int(os.getenv("TRUSTED_PROXY_COUNT", "0"))
    run_startup_schema_check = (
        os.getenv("RUN_STARTUP_SCHEMA_CHECK", "false").lower() == "true"
    )
    public_api_docs = os.getenv("PUBLIC_API_DOCS", "false").lower() == "true"
    force_https = os.getenv("FORCE_HTTPS", "false").lower() == "true"
    allowed_hosts = _csv_env("ALLOWED_HOSTS", "localhost,127.0.0.1,testserver")
    max_request_bytes = int(os.getenv("MAX_REQUEST_BYTES", "1048576"))
    ai_enabled = os.getenv("AI_ENABLED", "false").lower() == "true"
    ai_model = os.getenv("AI_MODEL", "llama-3.1-8b-instant")
    ai_timeout_seconds = float(os.getenv("AI_TIMEOUT_SECONDS", "12"))

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

        if self.environment == "production":
            if self.secret_key == "dev-secret-change-me" or len(self.secret_key) < 32:
                raise RuntimeError(
                    "Production SECRET_KEY must be a unique value of at least 32 characters."
                )
            if not self.force_https:
                raise RuntimeError("FORCE_HTTPS=true is required in production.")
            if self.run_startup_schema_check:
                raise RuntimeError(
                    "RUN_STARTUP_SCHEMA_CHECK must be false in production; use Alembic."
                )
            if any(origin.startswith("http://") for origin in self.cors_origins):
                raise RuntimeError("Production CORS_ORIGINS must use HTTPS.")

        if self.max_request_bytes < 1024 or self.max_request_bytes > 10_485_760:
            raise RuntimeError("MAX_REQUEST_BYTES must be between 1 KiB and 10 MiB.")
        if self.ai_timeout_seconds <= 0 or self.ai_timeout_seconds > 60:
            raise RuntimeError("AI_TIMEOUT_SECONDS must be between 0 and 60.")


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.validate()
    return settings
