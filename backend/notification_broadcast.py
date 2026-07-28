"""Cross-instance notification invalidation using Redis/Valkey Pub/Sub."""

import asyncio
import logging

from sqlalchemy import event
from sqlalchemy.orm import Session

from config import get_settings

settings = get_settings()
CHANNEL = "health-notifications:changed"
SESSION_FLAG = "notification_broadcast_pending"
_sync_client = None


def queue_notification_broadcast(db: Session) -> None:
    """Publish only after the surrounding database transaction commits."""

    db.info[SESSION_FLAG] = True


def _get_sync_client():
    global _sync_client
    if not settings.redis_url:
        return None
    if _sync_client is None:
        from redis import Redis

        _sync_client = Redis.from_url(
            settings.redis_url,
            socket_connect_timeout=2,
            socket_timeout=2,
            health_check_interval=30,
        )
    return _sync_client


@event.listens_for(Session, "after_commit")
def publish_after_commit(session: Session) -> None:
    if not session.info.pop(SESSION_FLAG, False):
        return
    client = _get_sync_client()
    if client is None:
        return
    try:
        client.publish(CHANNEL, "changed")
    except Exception:
        # A notification commit must never be rolled back because Redis is down.
        logging.exception("Notification broadcast failed")


@event.listens_for(Session, "after_rollback")
def clear_after_rollback(session: Session) -> None:
    session.info.pop(SESSION_FLAG, None)


async def wait_for_notification_change(timeout_seconds: float = 25) -> bool:
    """Wait for one Redis invalidation event.

    A new short-lived Pub/Sub connection is used per WebSocket coroutine. The
    REST API remains the authorization and data source of truth.
    """

    if not settings.redis_url:
        await asyncio.sleep(timeout_seconds)
        return True

    from redis.asyncio import Redis

    client = Redis.from_url(
        settings.redis_url,
        socket_connect_timeout=2,
        socket_timeout=max(3, timeout_seconds + 2),
        health_check_interval=30,
    )
    pubsub = client.pubsub()
    try:
        await pubsub.subscribe(CHANNEL)
        message = await pubsub.get_message(
            ignore_subscribe_messages=True,
            timeout=timeout_seconds,
        )
        return message is not None
    finally:
        await pubsub.unsubscribe(CHANNEL)
        await pubsub.aclose()
        await client.aclose()


async def redis_healthcheck() -> bool:
    if not settings.redis_url:
        return False
    from redis.asyncio import Redis

    client = Redis.from_url(settings.redis_url, socket_connect_timeout=2)
    try:
        return bool(await client.ping())
    finally:
        await client.aclose()
