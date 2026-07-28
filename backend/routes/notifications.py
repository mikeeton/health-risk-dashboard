import asyncio
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import or_
from sqlalchemy.orm import Session

import models
import schemas
from access_control import require_admin, role_name
from auth_utils import get_current_user, get_user_from_token
from database import SessionLocal, get_db
from notification_utils import create_notification as add_notification
from routes.audit import write_audit_log

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


def notification_scope_filter(current_user: models.User):
    """Return the visibility predicate for the current user's notifications.

    A notification can be targeted to a user, a role, or everyone. All list/read
    endpoints reuse this predicate so users cannot mark or inspect someone
    else's notification history.
    """

    return or_(
        models.Notification.user_email == current_user.email,
        models.Notification.target_role == role_name(current_user),
        (
            models.Notification.user_email.is_(None)
            & models.Notification.target_role.is_(None)
        ),
    )


def unread_notification_count(db: Session, current_user: models.User) -> int:
    """Count unread visible notifications for badges and realtime updates."""

    return (
        db.query(models.Notification)
        .filter(notification_scope_filter(current_user))
        .filter(
            or_(
                models.Notification.is_read != "true",
                models.Notification.is_read.is_(None),
            )
        )
        .count()
    )


@router.websocket("/ws")
async def notification_socket(websocket: WebSocket, token: str | None = None):
    """Push notification badge metadata to authenticated users.

    The REST API remains the source of truth for notification lists. This
    socket sends lightweight change hints so the frontend can refresh quickly
    in production while retaining polling as a fallback when a proxy or browser
    blocks WebSockets.
    """

    db = SessionLocal()

    try:
        current_user = get_user_from_token(token, db)

        if not current_user:
            await websocket.close(code=1008)
            return

        await websocket.accept()

        last_signature: tuple[int, int | None] | None = None

        while True:
            latest = (
                db.query(models.Notification)
                .filter(notification_scope_filter(current_user))
                .order_by(models.Notification.id.desc())
                .first()
            )
            signature = (
                unread_notification_count(db, current_user),
                latest.id if latest else None,
            )

            if signature != last_signature:
                await websocket.send_json(
                    {
                        "type": "notifications.updated",
                        "unread_count": signature[0],
                        "latest_id": signature[1],
                    }
                )
                last_signature = signature

            await asyncio.sleep(5)
    except (asyncio.CancelledError, WebSocketDisconnect):
        pass
    finally:
        db.close()


@router.post("/", response_model=schemas.NotificationResponse)
def create_notification(
    notification: schemas.NotificationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_admin(current_user)

    # Direct creation is admin-only because arbitrary notification creation can
    # otherwise be abused to spoof system or clinical messages.
    new_notification = add_notification(
        db,
        user_email=notification.user_email,
        target_role=notification.target_role,
        title=notification.title,
        message=notification.message,
        notification_type=notification.type,
        link=notification.link,
        related_entity=notification.related_entity,
        related_entity_id=notification.related_entity_id,
    )

    db.commit()
    db.refresh(new_notification)

    write_audit_log(
        db=db,
        action="CREATE_NOTIFICATION",
        entity="Notification",
        entity_id=str(new_notification.id),
        user_email=current_user.email,
    )

    return new_notification


@router.get("/", response_model=list[schemas.NotificationResponse])
def get_notifications(
    status: str = Query(default="all", pattern="^(all|read|unread)$"),
    notification_type: str | None = Query(default=None),
    search: str | None = Query(default=None, max_length=120),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Notification).filter(notification_scope_filter(current_user))

    # Read state is stored as a string for compatibility with the existing
    # schema; null older rows are treated as unread below.
    if status == "read":
        query = query.filter(models.Notification.is_read == "true")
    elif status == "unread":
        query = query.filter(
            or_(
                models.Notification.is_read != "true",
                models.Notification.is_read.is_(None),
            )
        )

    if notification_type:
        query = query.filter(models.Notification.type == notification_type)

    if search:
        # SQLAlchemy parameterizes the generated LIKE query, so user-provided
        # search text does not become raw SQL.
        pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                models.Notification.title.ilike(pattern),
                models.Notification.message.ilike(pattern),
            )
        )

    return query.order_by(models.Notification.id.desc()).limit(100).all()


@router.patch("/{notification_id}/read", response_model=schemas.NotificationResponse)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Scope the update to visible notifications, not just by id, so a user
    # cannot mark another user's notification as read by guessing its id.
    notification = (
        db.query(models.Notification)
        .filter(models.Notification.id == notification_id)
        .filter(notification_scope_filter(current_user))
        .first()
    )

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = "true"

    db.commit()
    db.refresh(notification)

    return notification


@router.patch("/bulk/mark-all-read", response_model=schemas.NotificationMarkAllResponse)
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Bulk marking uses the same visibility rules as the list endpoint.
    notifications = (
        db.query(models.Notification)
        .filter(notification_scope_filter(current_user))
        .filter(
            or_(
                models.Notification.is_read != "true",
                models.Notification.is_read.is_(None),
            )
        )
        .all()
    )

    for notification in notifications:
        notification.is_read = "true"

    db.commit()

    return {"updated": len(notifications)}


@router.post("/announcement", response_model=schemas.NotificationResponse)
def create_system_announcement(
    notification: schemas.NotificationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_admin(current_user)

    # A null user_email means the message is role-wide or system-wide. The
    # frontend still shows it in each user's notification centre.
    announcement = models.Notification(
        user_email=None,
        target_role=notification.target_role,
        title=notification.title,
        message=notification.message,
        type=notification.type or "announcement",
        is_read="false",
        link=notification.link,
        related_entity=notification.related_entity or "SystemAnnouncement",
        related_entity_id=notification.related_entity_id,
        created_at=datetime.now().isoformat(timespec="seconds"),
    )

    db.add(announcement)
    db.commit()
    db.refresh(announcement)

    write_audit_log(
        db=db,
        action="CREATE_SYSTEM_ANNOUNCEMENT",
        entity="Notification",
        entity_id=str(announcement.id),
        user_email=current_user.email,
    )

    return announcement
