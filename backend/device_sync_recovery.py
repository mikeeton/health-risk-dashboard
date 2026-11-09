"""Close abandoned provider-attempt markers after process interruption."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

import models


def reconcile_stale_sync_attempts(db: Session, *, limit: int = 20, stale_after: timedelta = timedelta(minutes=30)) -> int:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    rows = (
        db.query(models.DeviceSyncAttempt)
        .filter(models.DeviceSyncAttempt.state == "pending", models.DeviceSyncAttempt.attempted_at <= now - stale_after)
        .order_by(models.DeviceSyncAttempt.attempted_at, models.DeviceSyncAttempt.id)
        .limit(limit)
        .with_for_update(skip_locked=True)
        .all()
    )
    for row in rows:
        row.state = "error"
        row.completed_at = now
        row.error_code = "interrupted"
        row.error_message = "Provider sync was interrupted before completion; check for a later successful delivery."
        connection = db.query(models.WithingsConnection).filter(
            models.WithingsConnection.patient_id == row.patient_id,
        ).first()
        if connection and (connection.last_successful_sync is None or connection.last_successful_sync < row.attempted_at):
            connection.last_error_at = now
            connection.last_error_code = "interrupted"
            connection.last_error_message = row.error_message
            connection.updated_at = now
    if rows:
        db.commit()
    return len(rows)
