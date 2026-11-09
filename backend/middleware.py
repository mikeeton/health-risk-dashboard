from collections import defaultdict, deque
from time import monotonic
from uuid import UUID, uuid4
import hashlib
import logging

import redis
import redis.asyncio as aioredis

from fastapi import HTTPException, Request, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from starlette.responses import RedirectResponse

from config import get_settings
from observability import request_tracker

settings = get_settings()
logger = logging.getLogger(__name__)


def client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")

    if forwarded_for and settings.trusted_proxy_count > 0:
        ips = [part.strip() for part in forwarded_for.split(",") if part.strip()]
        index = max(0, len(ips) - settings.trusted_proxy_count - 1)
        return ips[index]

    return request.client.host if request.client else "unknown"


class EnforceHTTPSMiddleware(BaseHTTPMiddleware):
    """Redirect requests explicitly reported as HTTP by the trusted proxy."""

    async def dispatch(self, request: Request, call_next):
        forwarded_proto = request.headers.get("x-forwarded-proto", "")
        if settings.force_https and forwarded_proto:
            public_proto = forwarded_proto.split(",")[0].strip().lower()
            if public_proto != "https":
                secure_url = request.url.replace(scheme="https")
                return RedirectResponse(str(secure_url), status_code=307)
        return await call_next(request)


class RequestMetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        supplied_id = request.headers.get("x-request-id", "")
        try:
            request_id = str(uuid4()) if not supplied_id else str(UUID(supplied_id))
        except ValueError:
            request_id = str(uuid4())
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
        self._redis = aioredis.Redis.from_url(settings.redis_url) if settings.redis_url else None

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
        if self._redis is not None:
            try:
                redis_key = "vitala:rate:" + hashlib.sha256(key.encode()).hexdigest()
                count, ttl = await self._redis.eval(
                    "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return {n,redis.call('TTL',KEYS[1])}",
                    1, redis_key, window_seconds,
                )
                if count > limit:
                    return JSONResponse(status_code=429, content={"detail": "Too many requests. Please try again shortly."}, headers={"Retry-After": str(max(1, ttl))})
                return await call_next(request)
            except redis.RedisError:
                logger.exception("Shared rate limiter unavailable")
                if settings.environment == "production" or settings.require_redis:
                    return JSONResponse(status_code=503, content={"detail": "Rate limiter unavailable"})
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
