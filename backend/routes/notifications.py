from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from routes.audit import write_audit_log

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)


@router.post("/", response_model=schemas.NotificationResponse)
def create_notification(
    notification: schemas.NotificationCreate,
    db: Session = Depends(get_db)
):
    new_notification = models.Notification(
        user_email=notification.user_email,
        title=notification.title,
        message=notification.message,
        type=notification.type,
        is_read="false",
        created_at=datetime.now().isoformat(timespec="seconds"),
    )

    db.add(new_notification)
    db.commit()
    db.refresh(new_notification)

    write_audit_log(
        db=db,
        action="CREATE_NOTIFICATION",
        entity="Notification",
        entity_id=str(new_notification.id),
        user_email=notification.user_email,
    )

    return new_notification


@router.get("/", response_model=list[schemas.NotificationResponse])
def get_notifications(db: Session = Depends(get_db)):
    return (
        db.query(models.Notification)
        .order_by(models.Notification.id.desc())
        .all()
    )


@router.patch("/{notification_id}/read", response_model=schemas.NotificationResponse)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db)
):
    notification = (
        db.query(models.Notification)
        .filter(models.Notification.id == notification_id)
        .first()
    )

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = "true"

    db.commit()
    db.refresh(notification)

    return notification