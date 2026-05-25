from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models
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
    user_email: str | None = None
):
    log = models.AuditLog(
        action=action,
        entity=entity,
        entity_id=entity_id,
        user_email=user_email
    )

    db.add(log)
    db.commit()
    db.refresh(log)

    return log


@router.get("/")
def get_audit_logs(db: Session = Depends(get_db)):
    return (
        db.query(models.AuditLog)
        .order_by(models.AuditLog.id.desc())
        .all()
    )