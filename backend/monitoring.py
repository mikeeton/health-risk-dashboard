"""Production error reporting configuration."""

import logging

from config import get_settings


def initialize_error_reporting() -> bool:
    settings = get_settings()
    if not settings.sentry_dsn:
        logging.info("Sentry error reporting is disabled")
        return False

    import sentry_sdk

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.environment,
        release=settings.release or None,
        traces_sample_rate=settings.sentry_traces_sample_rate,
        send_default_pii=False,
        max_request_body_size="never",
        enable_logs=True,
    )
    logging.info("Sentry error reporting is enabled")
    return True
