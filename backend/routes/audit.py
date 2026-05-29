from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db

router = APIRouter(
    prefix="/audit",
    tags=["Audit Logs"]
)


def write_audit_log(
    db: Session,
    action: str,
    entity: str,
    entity_id: str | None = None,
    user_email: str | None = None,
):
    log = models.AuditLog(
        user_email=user_email,
        action=action,
        entity=entity,
        entity_id=entity_id,
        timestamp=datetime.now(),
    )

    db.add(log)
    db.commit()
    db.refresh(log)

    return log


@router.get("/", response_model=list[schemas.AuditLogResponse])
def get_audit_logs(db: Session = Depends(get_db)):
    return (
        db.query(models.AuditLog)
        .order_by(models.AuditLog.id.desc())
        .all()
    )