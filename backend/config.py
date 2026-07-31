import os
from functools import lru_cache
from urllib.parse import urlparse

from sqlalchemy.engine import make_url
from dotenv import load_dotenv

load_dotenv()


def _normalise_render_environment() -> None:
    """Repair blank values retained by an existing Render service.

    Render dashboard values override later Blueprint defaults. Apply these
    deployment-specific fallbacks before ``Settings`` reads the environment so
    both the legacy shell command and the current launcher start consistently.
    """
    is_render = os.getenv("RENDER", "").lower() == "true" or bool(
        os.getenv("RENDER_SERVICE_ID", "").strip()
    )
    if not is_render:
        return

    frontend_url = (
        "https://aihealthcaredashboard.vercel.app"
    )
    defaults = {
        "FRONTEND_URL": frontend_url,
        "CORS_ORIGINS": frontend_url,
        "ALLOWED_HOSTS": "health-risk-dashboard-api.onrender.com",
    }
    for name, value in defaults.items():
        if not os.getenv(name, "").strip():
            os.environ[name] = value

    withings_names = (
        "WITHINGS_CLIENT_ID",
        "WITHINGS_CLIENT_SECRET",
        "WITHINGS_REDIRECT_URI",
        "WITHINGS_WEBHOOK_URL",
    )
    if not any(os.getenv(name, "").strip() for name in withings_names):
        os.environ["REQUIRE_WITHINGS"] = "false"
        os.environ.pop("INTEGRATION_ENCRYPTION_KEY", None)

    if not os.getenv("SENTRY_DSN", "").strip():
        os.environ["REQUIRE_SENTRY"] = "false"


_normalise_render_environment()


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
    redis_url = os.getenv("REDIS_URL", "").strip()
    require_redis = os.getenv("REQUIRE_REDIS", "false").lower() == "true"
    database_pool_size = int(os.getenv("DATABASE_POOL_SIZE", "5"))
    database_max_overflow = int(os.getenv("DATABASE_MAX_OVERFLOW", "10"))
    database_pool_recycle_seconds = int(
        os.getenv("DATABASE_POOL_RECYCLE_SECONDS", "300")
    )
    database_sslmode = os.getenv("DATABASE_SSLMODE", "").strip()

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
    ai_max_retries = int(os.getenv("AI_MAX_RETRIES", "1"))
    ai_max_tokens = int(os.getenv("AI_MAX_TOKENS", "700"))
    ai_daily_request_limit = int(os.getenv("AI_DAILY_REQUEST_LIMIT", "200"))
    ai_circuit_failure_threshold = int(
        os.getenv("AI_CIRCUIT_FAILURE_THRESHOLD", "3")
    )
    ai_circuit_reset_seconds = int(os.getenv("AI_CIRCUIT_RESET_SECONDS", "60"))
    ai_data_stale_hours = int(os.getenv("AI_DATA_STALE_HOURS", "24"))
    ai_memory_encryption_key = os.getenv("AI_MEMORY_ENCRYPTION_KEY", "")
    ai_data_classification = os.getenv(
        "AI_DATA_CLASSIFICATION", "synthetic"
    ).strip().lower()
    ai_provider_dpa_approved = (
        os.getenv("AI_PROVIDER_DPA_APPROVED", "false").lower() == "true"
    )
    ai_retention_reviewed = (
        os.getenv("AI_RETENTION_REVIEWED", "false").lower() == "true"
    )
    ai_regional_processing_approved = (
        os.getenv("AI_REGIONAL_PROCESSING_APPROVED", "false").lower() == "true"
    )
    ai_audit_enabled = os.getenv("AI_AUDIT_ENABLED", "true").lower() == "true"
    ai_clinical_approval = (
        os.getenv("AI_CLINICAL_APPROVAL", "false").lower() == "true"
    )
    frontend_url = os.getenv("FRONTEND_URL", "http://127.0.0.1:5173").rstrip("/")
    withings_client_id = os.getenv("WITHINGS_CLIENT_ID", "")
    withings_client_secret = os.getenv("WITHINGS_CLIENT_SECRET", "")
    withings_redirect_uri = os.getenv("WITHINGS_REDIRECT_URI", "")
    withings_webhook_url = os.getenv("WITHINGS_WEBHOOK_URL", "")
    integration_encryption_key = os.getenv("INTEGRATION_ENCRYPTION_KEY", "")
    require_withings = os.getenv("REQUIRE_WITHINGS", "false").lower() == "true"
    sentry_dsn = os.getenv("SENTRY_DSN", "").strip()
    require_sentry = os.getenv("REQUIRE_SENTRY", "false").lower() == "true"
    sentry_traces_sample_rate = float(
        os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.1")
    )
    release = os.getenv("RELEASE", "").strip()
    backup_retention_days = int(os.getenv("BACKUP_RETENTION_DAYS", "30"))

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
            if not self.frontend_url.startswith("https://"):
                raise RuntimeError("Production FRONTEND_URL must use HTTPS.")
            if self.frontend_url not in self.cors_origins:
                raise RuntimeError(
                    "Production FRONTEND_URL must also be listed in CORS_ORIGINS."
                )
            if self.require_redis and not self.redis_url:
                raise RuntimeError(
                    "REDIS_URL is required when REQUIRE_REDIS=true."
                )
            if self.redis_url and urlparse(self.redis_url).scheme not in {
                "redis",
                "rediss",
            }:
                raise RuntimeError("REDIS_URL must use redis:// or rediss://.")
            if self.ai_enabled and not os.getenv("GROQ_API_KEY", "").strip():
                raise RuntimeError("GROQ_API_KEY is required when AI_ENABLED=true.")
            if self.ai_enabled and self.ai_data_classification == "real":
                governance = (
                    self.ai_provider_dpa_approved,
                    self.ai_retention_reviewed,
                    self.ai_regional_processing_approved,
                    self.ai_audit_enabled,
                    self.ai_clinical_approval,
                )
                if not all(governance):
                    raise RuntimeError(
                        "Real-data AI requires provider DPA, retention, regional "
                        "processing, audit, and clinical approvals."
                    )
                if not self.ai_memory_encryption_key:
                    raise RuntimeError(
                        "AI_MEMORY_ENCRYPTION_KEY is required for real-data AI."
                    )
            if self.require_sentry and not self.sentry_dsn:
                raise RuntimeError("SENTRY_DSN is required when REQUIRE_SENTRY=true.")

        if self.max_request_bytes < 1024 or self.max_request_bytes > 10_485_760:
            raise RuntimeError("MAX_REQUEST_BYTES must be between 1 KiB and 10 MiB.")
        if self.ai_timeout_seconds <= 0 or self.ai_timeout_seconds > 60:
            raise RuntimeError("AI_TIMEOUT_SECONDS must be between 0 and 60.")
        if self.ai_max_retries < 0 or self.ai_max_retries > 3:
            raise RuntimeError("AI_MAX_RETRIES must be between 0 and 3.")
        if self.ai_max_tokens < 200 or self.ai_max_tokens > 2000:
            raise RuntimeError("AI_MAX_TOKENS must be between 200 and 2000.")
        if self.ai_daily_request_limit < 1:
            raise RuntimeError("AI_DAILY_REQUEST_LIMIT must be positive.")
        if self.ai_data_classification not in {"synthetic", "real"}:
            raise RuntimeError("AI_DATA_CLASSIFICATION must be synthetic or real.")
        if self.database_pool_size < 1 or self.database_pool_size > 50:
            raise RuntimeError("DATABASE_POOL_SIZE must be between 1 and 50.")
        if self.database_max_overflow < 0 or self.database_max_overflow > 100:
            raise RuntimeError("DATABASE_MAX_OVERFLOW must be between 0 and 100.")
        if not 0 <= self.sentry_traces_sample_rate <= 1:
            raise RuntimeError("SENTRY_TRACES_SAMPLE_RATE must be between 0 and 1.")
        if self.backup_retention_days < 1:
            raise RuntimeError("BACKUP_RETENTION_DAYS must be at least 1.")

        withings_values = (
            self.withings_client_id,
            self.withings_client_secret,
            self.withings_redirect_uri,
            self.withings_webhook_url,
            self.integration_encryption_key,
        )
        if any(withings_values) and not all(withings_values):
            raise RuntimeError(
                "Withings integration requires CLIENT_ID, CLIENT_SECRET, "
                "REDIRECT_URI, WEBHOOK_URL, and INTEGRATION_ENCRYPTION_KEY."
            )
        if self.require_withings and not all(withings_values):
            raise RuntimeError(
                "All Withings credentials are required when REQUIRE_WITHINGS=true."
            )
        if self.environment == "production" and all(withings_values):
            if not self.withings_redirect_uri.startswith("https://"):
                raise RuntimeError("WITHINGS_REDIRECT_URI must use HTTPS.")
            if not self.withings_webhook_url.startswith("https://"):
                raise RuntimeError("WITHINGS_WEBHOOK_URL must use HTTPS.")
            redirect = urlparse(self.withings_redirect_uri)
            webhook = urlparse(self.withings_webhook_url)
            if redirect.path != "/integrations/withings/callback":
                raise RuntimeError(
                    "WITHINGS_REDIRECT_URI must end with "
                    "/integrations/withings/callback."
                )
            if webhook.path != "/integrations/withings/webhook":
                raise RuntimeError(
                    "WITHINGS_WEBHOOK_URL must end with "
                    "/integrations/withings/webhook."
                )
            if redirect.netloc != webhook.netloc:
                raise RuntimeError(
                    "Withings redirect and webhook URLs must use the same API host."
                )


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.validate()
    return settings
