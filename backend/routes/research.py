"""Restricted research evidence APIs. No direct patient clinical record is exposed."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

import models
from access_control import require_admin
from auth_utils import get_current_user
from database import get_db
from ml_engine.registry import model_status

router = APIRouter(prefix="/research", tags=["Restricted research"])


def now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def audit(db, user, action, entity, entity_id):
    db.add(models.AuditLog(user_email=user.email, action=action, entity=entity, entity_id=str(entity_id), timestamp=now()))
    db.commit()


class UsabilityCreate(BaseModel):
    participant_code: str = Field(min_length=3, max_length=80)
    participant_role: Literal["patient", "doctor", "nurse", "admin", "other"]
    protocol_version: str = "1.0"
    consent_confirmed: bool
    ethics_reference: str = Field(min_length=3, max_length=120)
    task_results: list[dict]
    sus_responses: list[int] = Field(min_length=10, max_length=10)
    notes: str | None = Field(default=None, max_length=2000)


class OutcomeCreate(BaseModel):
    prediction_id: int
    outcome_observed: bool
    outcome_type: str = Field(min_length=3, max_length=120)
    observed_at: datetime
    adjudication_status: Literal["single_reviewer", "independent_review", "consensus"]
    notes: str | None = Field(default=None, max_length=2000)


class EffectivenessCreate(BaseModel):
    study_code: str = Field(min_length=3, max_length=80)
    participant_code: str = Field(min_length=3, max_length=80)
    study_arm: Literal["control", "intervention", "before", "after"]
    outcome_name: str = Field(min_length=3, max_length=120)
    outcome_value: float
    unit: str | None = Field(default=None, max_length=40)
    intervention_occurred: bool
    protocol_deviation: bool = False
    notes: str | None = Field(default=None, max_length=2000)


def sus_score(responses: list[int]) -> float:
    if len(responses) != 10 or any(value < 1 or value > 5 for value in responses):
        raise HTTPException(422, "SUS requires ten responses, each from 1 to 5")
    contribution = sum((value - 1) if index % 2 == 0 else (5 - value) for index, value in enumerate(responses))
    return contribution * 2.5


def classifications(db):
    values = {key: 0 for key in ("TP", "FP", "TN", "FN")}
    for item in db.query(models.ModelPredictionRecord.classification).all():
        if item[0] in values:
            values[item[0]] += 1
    return values


@router.get("/summary")
def summary(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    require_admin(user)
    counts = classifications(db)
    tp, fp, tn, fn = (counts[key] for key in ("TP", "FP", "TN", "FN"))
    usability = db.query(models.UsabilityStudySession).all()
    effectiveness = db.query(models.EffectivenessStudyRecord).all()
    by_arm = {}
    for row in effectiveness:
        bucket = by_arm.setdefault(row.study_arm, [])
        bucket.append(row.outcome_value)
    return {"model": model_status(), "prediction_classifications": counts, "sensitivity": tp / (tp + fn) if tp + fn else None, "specificity": tn / (tn + fp) if tn + fp else None, "precision": tp / (tp + fp) if tp + fp else None, "usability_sessions": len(usability), "average_sus": sum(row.sus_score for row in usability) / len(usability) if usability else None, "prospective_outcomes": db.query(models.ProspectiveValidationOutcome).count(), "effectiveness_records": len(effectiveness), "effectiveness_by_arm": {arm: {"count": len(values), "mean_outcome": sum(values) / len(values)} for arm, values in by_arm.items()}, "evidence_status": "research_evidence_only_not_clinical_approval"}


@router.get("/global-shap")
def global_shap(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    require_admin(user)
    totals, counts = {}, {}
    records = db.query(models.ModelPredictionRecord).filter(models.ModelPredictionRecord.shap_json.isnot(None)).all()
    for record in records:
        try:
            for item in json.loads(record.shap_json or "[]"):
                feature, contribution = item.get("feature"), abs(float(item.get("contribution", 0)))
                if feature:
                    totals[feature] = totals.get(feature, 0) + contribution
                    counts[feature] = counts.get(feature, 0) + 1
        except (TypeError, ValueError, json.JSONDecodeError):
            continue
    features = sorted(({"feature": feature, "mean_absolute_shap": totals[feature] / counts[feature], "observations": counts[feature]} for feature in totals), key=lambda item: item["mean_absolute_shap"], reverse=True)
    return {"model_version": model_status().get("model_version"), "prediction_records": len(records), "method": "mean absolute local SHAP across stored prospective predictions", "features": features, "warning": "Association with model output is not causal or clinical-effectiveness evidence."}


@router.post("/usability-sessions")
def create_usability(payload: UsabilityCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    require_admin(user)
    if not payload.consent_confirmed:
        raise HTTPException(422, "Recorded participant consent is required")
    item = models.UsabilityStudySession(participant_code=payload.participant_code, participant_role=payload.participant_role, protocol_version=payload.protocol_version, consent_confirmed=True, ethics_reference=payload.ethics_reference, task_results_json=json.dumps(payload.task_results), sus_responses_json=json.dumps(payload.sus_responses), sus_score=sus_score(payload.sus_responses), notes=payload.notes, recorded_by_user_id=user.id, created_at=now())
    db.add(item); db.commit(); db.refresh(item); audit(db, user, "CREATE_USABILITY_EVIDENCE", "UsabilityStudySession", item.id)
    return {"id": item.id, "sus_score": item.sus_score, "created_at": item.created_at}


@router.get("/prospective/pending")
def pending_predictions(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    require_admin(user)
    rows = db.query(models.ModelPredictionRecord).filter(models.ModelPredictionRecord.outcome_observed.is_(None)).order_by(models.ModelPredictionRecord.window_end).limit(200).all()
    return [{"prediction_id": row.id, "created_at": row.created_at, "window_end": row.window_end, "probability": row.probability, "threshold": row.threshold, "predicted_positive": row.predicted_positive, "mode": row.mode, "model_version": row.model_version} for row in rows]


@router.post("/prospective/outcomes")
def record_outcome(payload: OutcomeCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    require_admin(user)
    prediction = db.query(models.ModelPredictionRecord).filter(models.ModelPredictionRecord.id == payload.prediction_id).first()
    if not prediction:
        raise HTTPException(404, "Prediction not found")
    if db.query(models.ProspectiveValidationOutcome).filter(models.ProspectiveValidationOutcome.prediction_id == prediction.id).first():
        raise HTTPException(409, "This prediction already has an adjudicated outcome")
    values = payload.model_dump()
    values["observed_at"] = payload.observed_at.replace(tzinfo=None)
    item = models.ProspectiveValidationOutcome(**values, adjudicator_user_id=user.id, created_at=now())
    prediction.outcome_observed = payload.outcome_observed
    prediction.outcome_recorded_at = payload.observed_at.replace(tzinfo=None)
    prediction.classification = "TP" if prediction.predicted_positive and payload.outcome_observed else "FP" if prediction.predicted_positive else "FN" if payload.outcome_observed else "TN"
    db.add(item); db.commit(); db.refresh(item); audit(db, user, "ADJUDICATE_PROSPECTIVE_OUTCOME", "ModelPredictionRecord", prediction.id)
    return {"id": item.id, "classification": prediction.classification}


@router.post("/effectiveness-records")
def create_effectiveness(payload: EffectivenessCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    require_admin(user)
    item = models.EffectivenessStudyRecord(**payload.model_dump(), recorded_by_user_id=user.id, created_at=now())
    db.add(item); db.commit(); db.refresh(item); audit(db, user, "CREATE_EFFECTIVENESS_EVIDENCE", "EffectivenessStudyRecord", item.id)
    return {"id": item.id, "created_at": item.created_at}


@router.get("/evidence-export")
def evidence_export(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    require_admin(user)
    return {"generated_at": datetime.now(timezone.utc), "generated_by": user.email, "summary": summary(db, user), "global_shap": global_shap(db, user), "governance_history": [{"action": row.action, "model_version": row.model_version, "reason": row.reason, "created_at": row.created_at} for row in db.query(models.ModelGovernanceEvent).order_by(models.ModelGovernanceEvent.created_at).all()], "limitations": ["Research evidence does not establish clinical effectiveness.", "Regulatory approval can only be granted by the appropriate external process.", "Participant evidence requires documented ethics and consent."]}
