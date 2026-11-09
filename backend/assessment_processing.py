"""Recoverable assessment processing for accepted wide vital readings."""

from datetime import datetime, timedelta, timezone
import logging

from sqlalchemy import or_, update

import models
from early_warning import evaluate_new_vital

logger = logging.getLogger(__name__)


def _now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def process_vital_assessment(db, vital_id: int, *, evaluator=None) -> bool:
    """Claim one pending/failed assessment; leave a durable failure for retry."""
    stale = _now() - timedelta(minutes=5)
    claimed = db.execute(
        update(models.VitalAssessment)
        .where(models.VitalAssessment.vital_id == vital_id)
        .where(models.VitalAssessment.attempts < 5)
        .where(or_(
            models.VitalAssessment.state.in_(("pending", "failed")),
            (models.VitalAssessment.state == "processing") & (models.VitalAssessment.updated_at < stale),
        ))
        .values(state="processing", attempts=models.VitalAssessment.attempts + 1, updated_at=_now())
    ).rowcount
    db.commit()
    if not claimed:
        return False
    try:
        vital = db.get(models.Vital, vital_id)
        if vital is None:
            raise LookupError(f"Vital {vital_id} was removed before assessment")
        (evaluator or evaluate_new_vital)(db, vital)
    except Exception as exc:
        db.rollback()
        assessment = db.query(models.VitalAssessment).filter_by(vital_id=vital_id).one()
        assessment.state = "failed"
        assessment.last_error = type(exc).__name__
        assessment.updated_at = _now()
        db.commit()
        logger.exception("Vital assessment failed", extra={"vital_id": vital_id})
        return False
    assessment = db.query(models.VitalAssessment).filter_by(vital_id=vital_id).one()
    assessment.state = "completed"
    assessment.last_error = None
    assessment.updated_at = _now()
    db.commit()
    return True


def reconcile_vital_assessments(db, limit: int = 20) -> dict[str, int]:
    stale = _now() - timedelta(minutes=5)
    rows = (
        db.query(models.VitalAssessment.vital_id)
        .filter(or_(
            models.VitalAssessment.state.in_(("pending", "failed")),
            (models.VitalAssessment.state == "processing") & (models.VitalAssessment.updated_at < stale),
        ))
        .filter(models.VitalAssessment.attempts < 5)
        .order_by(models.VitalAssessment.id)
        .limit(limit)
        .all()
    )
    completed = sum(process_vital_assessment(db, vital_id) for (vital_id,) in rows)
    return {"attempted": len(rows), "completed": completed, "remaining_or_failed": len(rows) - completed}
