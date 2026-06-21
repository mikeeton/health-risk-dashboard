import asyncio
import os
import random
from datetime import datetime

from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import inspect, text

import models
from access_control import can_access_patient, require_admin
from auth_utils import get_current_user
from auth_utils import get_user_from_token
from config import get_settings
from database import SessionLocal, engine, get_db
from middleware import (
    RateLimitMiddleware,
    RequestMetricsMiddleware,
    SecurityHeadersMiddleware,
)
from observability import request_tracker
from routes import analytics, assistant, admin_users
from routes import registration_requests
from routes import medications, events, ml, live_simulator
from routes import role_actions
from routes import patients, vitals, auth, reviews, audit
from routes import notifications
from routes import wearables

settings = get_settings()


def ensure_database_schema():
    inspector = inspect(engine)

    table_names = inspector.get_table_names()

    def columns_for(table_name: str):
        return {
            column["name"]
            for column in inspector.get_columns(table_name)
        }

    migrations = []

    if "users" in table_names:
        user_columns = columns_for("users")

        if "public_id" not in user_columns:
            migrations.append("ALTER TABLE users ADD COLUMN public_id VARCHAR")

        if "status" not in user_columns:
            migrations.append(
                "ALTER TABLE users ADD COLUMN status VARCHAR DEFAULT 'active'"
            )

    if "registration_requests" in table_names:
        registration_columns = columns_for("registration_requests")
        registration_migrations = {
            "age": "ALTER TABLE registration_requests ADD COLUMN age INTEGER",
            "gender": "ALTER TABLE registration_requests ADD COLUMN gender VARCHAR",
            "conditions": (
                "ALTER TABLE registration_requests ADD COLUMN conditions VARCHAR"
            ),
            "medication_notes": (
                "ALTER TABLE registration_requests "
                "ADD COLUMN medication_notes VARCHAR"
            ),
            "lifestyle_notes": (
                "ALTER TABLE registration_requests "
                "ADD COLUMN lifestyle_notes VARCHAR"
            ),
        }

        for column_name, statement in registration_migrations.items():
            if column_name not in registration_columns:
                migrations.append(statement)

    if "patients" in table_names:
        patient_columns = columns_for("patients")
        patient_migrations = {
            "user_id": "ALTER TABLE patients ADD COLUMN user_id INTEGER",
            "primary_doctor_id": (
                "ALTER TABLE patients ADD COLUMN primary_doctor_id INTEGER"
            ),
            "assigned_nurse_id": (
                "ALTER TABLE patients ADD COLUMN assigned_nurse_id INTEGER"
            ),
        }

        for column_name, statement in patient_migrations.items():
            if column_name not in patient_columns:
                migrations.append(statement)

    with engine.begin() as connection:
        for statement in migrations:
            connection.execute(text(statement))

        if "users" not in table_names or "patients" not in table_names:
            return

        doctor_id = connection.execute(
            text(
                """
                SELECT id
                FROM users
                WHERE role = 'doctor'
                  AND COALESCE(status, 'active') = 'active'
                ORDER BY id
                LIMIT 1
                """
            )
        ).scalar()

        nurse_id = connection.execute(
            text(
                """
                SELECT id
                FROM users
                WHERE role = 'nurse'
                  AND COALESCE(status, 'active') = 'active'
                ORDER BY id
                LIMIT 1
                """
            )
        ).scalar()

        if doctor_id:
            connection.execute(
                text(
                    """
                    UPDATE patients
                    SET primary_doctor_id = :doctor_id
                    WHERE primary_doctor_id IS NULL
                    """
                ),
                {"doctor_id": doctor_id},
            )

        if nurse_id:
            connection.execute(
                text(
                    """
                    UPDATE patients
                    SET assigned_nurse_id = :nurse_id
                    WHERE assigned_nurse_id IS NULL
                    """
                ),
                {"nurse_id": nurse_id},
            )

        connection.execute(
            text(
                """
                UPDATE patients
                SET user_id = users.id
                FROM users
                WHERE patients.user_id IS NULL
                  AND users.role = 'patient'
                  AND lower(users.full_name) = lower(patients.name)
                """
            )
        )

        connection.execute(
            text(
                """
                WITH unlinked_patients AS (
                    SELECT id, row_number() OVER (ORDER BY id) AS row_number
                    FROM patients
                    WHERE user_id IS NULL
                ),
                unlinked_users AS (
                    SELECT users.id, row_number() OVER (ORDER BY users.id) AS row_number
                    FROM users
                    WHERE users.role = 'patient'
                      AND NOT EXISTS (
                          SELECT 1
                          FROM patients
                          WHERE patients.user_id = users.id
                      )
                )
                UPDATE patients
                SET user_id = unlinked_users.id
                FROM unlinked_patients
                JOIN unlinked_users
                  ON unlinked_users.row_number = unlinked_patients.row_number
                WHERE patients.id = unlinked_patients.id
                """
            )
        )


if settings.run_startup_schema_check:
    models.Base.metadata.create_all(bind=engine)
    ensure_database_schema()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
)

app.add_middleware(RequestMetricsMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(analytics.router)
app.include_router(admin_users.router)
app.include_router(assistant.router)
app.include_router(auth.router)
app.include_router(role_actions.router)
app.include_router(patients.router)
app.include_router(wearables.router)
app.include_router(vitals.router)
app.include_router(reviews.router)
app.include_router(audit.router)
app.include_router(medications.router)
app.include_router(events.router)
app.include_router(ml.router)
app.include_router(notifications.router)
app.include_router(registration_requests.router)
app.include_router(live_simulator.router)

@app.get("/")
def root():
    return {
        "message": "AI Health Risk Monitoring API is running",
        "version": settings.app_version,
        "process_id": os.getpid(),
    }


@app.get("/health")
def health_check():
    return {"status": "ok", "process_id": os.getpid()}


@app.get("/health/live")
def liveness_check():
    return {"status": "alive", "process_id": os.getpid()}


@app.get("/health/ready")
def readiness_check(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))

    return {
        "status": "ready",
        "database": "ok",
        "process_id": os.getpid(),
    }


@app.get("/metrics")
def metrics(current_user: models.User = Depends(get_current_user)):
    require_admin(current_user)

    return {
        "process_id": os.getpid(),
        **request_tracker.snapshot(),
    }


@app.websocket("/ws/live/{patient_id}")
async def websocket_live_monitoring(websocket: WebSocket, patient_id: int):
    token = websocket.query_params.get("token")
    db = SessionLocal()

    try:
        current_user = get_user_from_token(token, db)

        if not current_user or not can_access_patient(db, patient_id, current_user):
            await websocket.close(code=1008)
            return
    except HTTPException:
        await websocket.close(code=1008)
        return
    finally:
        db.close()

    await websocket.accept()

    try:
        while True:
            heart_rate = random.randint(72, 145)
            spo2 = round(random.uniform(88, 99), 1)
            systolic_bp = random.randint(115, 185)
            diastolic_bp = random.randint(75, 115)

            risk_score = 2

            if heart_rate > 110:
                risk_score += 2

            if spo2 < 94:
                risk_score += 2

            if systolic_bp > 150:
                risk_score += 2

            if diastolic_bp > 95:
                risk_score += 1

            risk_score = min(risk_score, 10)

            record = {
                "id": f"ws-{datetime.now().timestamp()}",
                "patientId": patient_id,
                "timestamp": datetime.now().isoformat(timespec="seconds"),
                "heartRate": heart_rate,
                "spo2": spo2,
                "systolicBP": systolic_bp,
                "diastolicBP": diastolic_bp,
                "steps": random.randint(0, 10000),
                "sleepHours": round(random.uniform(3.5, 8.5), 1),
                "activeMinutes": random.randint(0, 90),
                "calories": random.randint(1500, 2800),
                "riskScore": risk_score,
                "activityState": random.choice(
                    ["resting", "walking", "sleeping", "active"]
                ),
            }

            await websocket.send_json(record)
            await asyncio.sleep(settings.websocket_interval_seconds)

    except WebSocketDisconnect:
        print(f"WebSocket disconnected for patient {patient_id}")
