from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models
import schemas

from database import get_db

router = APIRouter(
    prefix="/wearables",
    tags=["Wearables"],
)


@router.post("/vitals")
def receive_watch_data(
    payload: schemas.WearableVitalCreate,
    db: Session = Depends(get_db),
):
    vital = models.Vital(
        patient_id=payload.patient_id,

        timestamp=payload.timestamp,

        heart_rate=payload.heart_rate,

        spo2=payload.spo2,

        systolic_bp=120,
        diastolic_bp=80,

        steps=payload.steps,

        sleep_hours=payload.sleep_hours,

        active_minutes=60,

        calories=250,

        risk_score=3,

        activity_state="watch_sync",
    )

    db.add(vital)
    db.commit()

    return {
        "message": "Watch data received successfully"
    }


@router.get("/devices")
def get_devices(
    db: Session = Depends(get_db)
):
    return db.query(
        models.WearableDevice
    ).all()