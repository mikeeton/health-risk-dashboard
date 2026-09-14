"""Synthetic vital generation independent of HTTP/WebSocket transports."""

from datetime import datetime, timezone
import random


def calculate_stream_risk_score(
    heart_rate: int,
    spo2: float,
    systolic_bp: int,
    diastolic_bp: int,
) -> int:
    score = 2
    if heart_rate > 110:
        score += 2
    if spo2 < 94:
        score += 2
    if systolic_bp > 150:
        score += 2
    if diastolic_bp > 95:
        score += 1
    return min(score, 10)


def generate_websocket_vital(patient_id: int) -> dict:
    """Create one unpersisted demo record for the live-stream simulator."""

    heart_rate = random.randint(72, 145)
    spo2 = round(random.uniform(88, 99), 1)
    systolic_bp = random.randint(115, 185)
    diastolic_bp = random.randint(75, 115)
    generated_at = datetime.now(timezone.utc)

    return {
        "id": f"ws-{generated_at.timestamp()}",
        "patientId": patient_id,
        "timestamp": generated_at.isoformat(timespec="seconds"),
        "heartRate": heart_rate,
        "spo2": spo2,
        "systolicBP": systolic_bp,
        "diastolicBP": diastolic_bp,
        "steps": random.randint(0, 10000),
        "sleepHours": round(random.uniform(3.5, 8.5), 1),
        "activeMinutes": random.randint(0, 90),
        "calories": random.randint(1500, 2800),
        "riskScore": calculate_stream_risk_score(
            heart_rate,
            spo2,
            systolic_bp,
            diastolic_bp,
        ),
        "activityState": random.choice(
            ["resting", "walking", "sleeping", "active"]
        ),
        "source": "simulator",
        "persisted": False,
    }
