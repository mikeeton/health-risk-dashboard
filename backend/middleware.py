from collections import defaultdict, deque
from time import monotonic
from uuid import uuid4

from fastapi import HTTPException, Request, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from config import get_settings
from observability import request_tracker

settings = get_settings()


def client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")

    if forwarded_for and settings.trusted_proxy_count > 0:
        ips = [part.strip() for part in forwarded_for.split(",") if part.strip()]
        index = max(0, len(ips) - settings.trusted_proxy_count - 1)
        return ips[index]

    return request.client.host if request.client else "unknown"


class RequestMetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("x-request-id", str(uuid4()))
        started_at = monotonic()
        request_tracker.start_request()

        try:
            response = await call_next(request)
        except Exception:
            duration_ms = (monotonic() - started_at) * 1000
            request_tracker.finish_request(500, duration_ms)
            raise

        duration_ms = (monotonic() - started_at) * 1000
        request_tracker.finish_request(response.status_code, duration_ms)

        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time-ms"] = f"{duration_ms:.2f}"

        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault(
            "Permissions-Policy",
            "camera=(), microphone=(), geolocation=()",
        )
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; "
            "form-action 'self'",
        )
        if settings.force_https:
            response.headers.setdefault(
                "Strict-Transport-Security",
                "max-age=31536000; includeSubDomains",
            )

        if request.url.path.startswith(("/patients", "/vitals", "/medications")):
            response.headers["Cache-Control"] = "no-store"
        elif request.url.path.startswith(
            ("/events", "/reviews", "/assistant", "/ml", "/analytics")
        ):
            response.headers["Cache-Control"] = "no-store"
        elif "Cache-Control" not in response.headers:
            response.headers["Cache-Control"] = "no-store"

        return response


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > settings.max_request_bytes:
                    return JSONResponse(
                        status_code=413,
                        content={"detail": "Request body is too large"},
                    )
            except ValueError:
                return JSONResponse(
                    status_code=400,
                    content={"detail": "Invalid Content-Length header"},
                )
        return await call_next(request)


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self._buckets: dict[str, deque[float]] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next):
        if not settings.rate_limit_enabled:
            return await call_next(request)

        if request.url.path.startswith(("/health", "/ready", "/live")):
            return await call_next(request)

        limit = settings.rate_limit_requests
        window_seconds = settings.rate_limit_window_seconds

        if request.url.path.startswith("/auth"):
            limit = settings.auth_rate_limit_requests
            window_seconds = settings.auth_rate_limit_window_seconds

        key = f"{client_ip(request)}:{request.url.path}"
        now = monotonic()
        bucket = self._buckets[key]

        while bucket and now - bucket[0] > window_seconds:
            bucket.popleft()

        if len(bucket) >= limit:
            retry_after = max(1, round(window_seconds - (now - bucket[0])))
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Too many requests. Please try again shortly."
                },
                headers={"Retry-After": str(retry_after)},
            )

        bucket.append(now)

        try:
            return await call_next(request)
        except HTTPException:
            raise
