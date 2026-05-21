from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import random
from datetime import datetime

import models
from database import engine

from routes import patients, vitals, auth, reviews, audit

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Health Risk Monitoring API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(vitals.router)
app.include_router(reviews.router)
app.include_router(audit.router)


@app.get("/")
def root():
    return {
        "message": "AI Health Risk Monitoring API is running"
    }


@app.websocket("/ws/live/{patient_id}")
async def websocket_live_monitoring(
    websocket: WebSocket,
    patient_id: int
):
    await websocket.accept()

    try:
        while True:
            record = {
                "patient_id": patient_id,
                "timestamp": datetime.now().isoformat(timespec="seconds"),
                "heart_rate": random.randint(70, 125),
                "spo2": round(random.uniform(90, 99), 1),
                "systolic_bp": random.randint(115, 170),
                "diastolic_bp": random.randint(75, 105),
                "steps": random.randint(0, 10000),
                "sleep_hours": round(random.uniform(4.0, 8.5), 1),
                "active_minutes": random.randint(0, 90),
                "calories": random.randint(1600, 2600),
                "risk_score": random.randint(1, 10),
                "activity_state": random.choice(
                    ["resting", "walking", "running", "sleeping"]
                ),
            }

            await websocket.send_json(record)
            await asyncio.sleep(5)

    except WebSocketDisconnect:
        print(f"Patient {patient_id} disconnected")