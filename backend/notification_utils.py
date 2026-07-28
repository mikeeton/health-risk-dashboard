from datetime import datetime

import models
from notification_broadcast import queue_notification_broadcast


def create_notification(
    db,
    *,
    title: str,
    message: str,
    notification_type: str = "info",
    user_email: str | None = None,
    target_role: str | None = None,
    link: str | None = None,
    related_entity: str | None = None,
    related_entity_id: str | None = None,
) -> models.Notification:
    """Create a notification without committing the transaction.

    Callers often create a domain object, notification, and audit log together.
    Deferring the commit lets those changes succeed or fail as one workflow.
    """

    notification = models.Notification(
        user_email=user_email,
        target_role=target_role,
        title=title,
        message=message,
        type=notification_type,
        is_read="false",
        link=link,
        related_entity=related_entity,
        related_entity_id=related_entity_id,
        created_at=datetime.now().isoformat(timespec="seconds"),
    )
    db.add(notification)
    queue_notification_broadcast(db)
    return notification


def notify_role(
    db,
    *,
    role: str,
    title: str,
    message: str,
    notification_type: str = "info",
    link: str | None = None,
    related_entity: str | None = None,
    related_entity_id: str | None = None,
) -> list[models.Notification]:
    """Fan out a notification to every active user in a role.

    This creates user-targeted notifications instead of relying only on
    `target_role`, so each recipient can independently mark the item as read.
    """

    users = (
        db.query(models.User)
        .filter(models.User.role == role)
        .filter((models.User.status == "active") | (models.User.status.is_(None)))
        .all()
    )

    return [
        create_notification(
            db,
            user_email=user.email,
            title=title,
            message=message,
            notification_type=notification_type,
            link=link,
            related_entity=related_entity,
            related_entity_id=related_entity_id,
        )
        for user in users
    ]
