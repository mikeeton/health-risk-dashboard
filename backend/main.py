from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from routes import analytics, assistant
from routes import registration_requests
import asyncio
import random
from datetime import datetime
from routes import medications, events, ml
from routes import role_actions
import models
from database import engine
from routes import patients, vitals, auth, reviews, audit
from routes import notifications
from routes import wearables

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Health Risk Monitoring API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(analytics.router)
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

@app.get("/")
def root():
    return {"message": "AI Health Risk Monitoring API is running"}


@app.websocket("/ws/live/{patient_id}")
async def websocket_live_monitoring(websocket: WebSocket, patient_id: int):
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
            await asyncio.sleep(5)

    except WebSocketDisconnect:
        print(f"WebSocket disconnected for patient {patient_id}")