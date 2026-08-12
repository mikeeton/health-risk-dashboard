import random
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

import models
from early_warning import evaluate_new_vital
from access_control import get_accessible_patient, require_roles
from auth_utils import get_current_user
from database import get_db
from routes.audit import write_audit_log

router = APIRouter(
    prefix="/live-simulator",
    tags=["Live Patient Simulator"],
)


DISEASE_PROFILES = {
    "hypertension": {
        "hr": (75, 105),
        "spo2": (95, 99),
        "systolic": (135, 170),
        "diastolic": (85, 108),
        "sleep": (5.5, 8.0),
    },
    "diabetes": {
        "hr": (78, 112),
        "spo2": (95, 99),
        "systolic": (118, 155),
        "diastolic": (75, 96),
        "sleep": (5.0, 7.5),
    },
    "asthma": {
        "hr": (82, 120),
        "spo2": (90, 98),
        "systolic": (110, 140),
        "diastolic": (70, 90),
        "sleep": (5.0, 8.0),
    },
    "copd": {
        "hr": (90, 130),
        "spo2": (88, 95),
        "systolic": (118, 150),
        "diastolic": (75, 95),
        "sleep": (4.5, 7.0),
    },
    "heart failure": {
        "hr": (88, 128),
        "spo2": (90, 97),
        "systolic": (100, 155),
        "diastolic": (65, 98),
        "sleep": (4.5, 7.0),
    },
    "arrhythmia": {
        "hr": (55, 135),
        "spo2": (94, 99),
        "systolic": (105, 150),
        "diastolic": (65, 95),
        "sleep": (5.0, 8.0),
    },
    "sleep apnea": {
        "hr": (72, 110),
        "spo2": (88, 97),
        "systolic": (120, 160),
        "diastolic": (75, 100),
        "sleep": (3.5, 6.5),
    },
    "obesity": {
        "hr": (78, 112),
        "spo2": (93, 98),
        "systolic": (125, 165),
        "diastolic": (78, 102),
        "sleep": (5.0, 7.0),
    },
    "anaemia": {
        "hr": (85, 125),
        "spo2": (94, 99),
        "systolic": (95, 130),
        "diastolic": (60, 85),
        "sleep": (5.0, 8.0),
    },
    "kidney disease": {
        "hr": (75, 110),
        "spo2": (94, 99),
        "systolic": (130, 175),
        "diastolic": (82, 110),
        "sleep": (4.5, 7.5),
    },
    "pneumonia": {
        "hr": (95, 135),
        "spo2": (86, 95),
        "systolic": (105, 145),
        "diastolic": (65, 90),
        "sleep": (4.0, 7.0),
    },
    "infection": {
        "hr": (90, 130),
        "spo2": (92, 98),
        "systolic": (105, 150),
        "diastolic": (65, 92),
        "sleep": (4.0, 7.0),
    },
    "anxiety": {
        "hr": (90, 130),
        "spo2": (96, 100),
        "systolic": (115, 150),
        "diastolic": (70, 95),
        "sleep": (4.0, 7.0),
    },
    "post surgery": {
        "hr": (80, 120),
        "spo2": (92, 99),
        "systolic": (100, 150),
        "diastolic": (60, 95),
        "sleep": (4.0, 7.5),
    },
    "general monitoring": {
        "hr": (65, 95),
        "spo2": (96, 100),
        "systolic": (105, 130),
        "diastolic": (65, 85),
        "sleep": (6.0, 8.5),
    },
}


def split_conditions(condition_text: str):
    if not condition_text:
        return ["general monitoring"]

    text = condition_text.lower()

    separators = [",", "/", ";", "&", " and "]

    for separator in separators:
        text = text.replace(separator, ",")

    conditions = [item.strip() for item in text.split(",") if item.strip()]

    return conditions or ["general monitoring"]


def match_profile(condition: str):
    for disease_name, profile in DISEASE_PROFILES.items():
        if disease_name in condition:
            return profile

    return DISEASE_PROFILES["general monitoring"]


def merge_profiles(conditions: list[str]):
    profiles = [match_profile(condition) for condition in conditions]

    return {
        "hr": (
            min(profile["hr"][0] for profile in profiles),
            max(profile["hr"][1] for profile in profiles),
        ),
        "spo2": (
            min(profile["spo2"][0] for profile in profiles),
            max(profile["spo2"][1] for profile in profiles),
        ),
        "systolic": (
            min(profile["systolic"][0] for profile in profiles),
            max(profile["systolic"][1] for profile in profiles),
        ),
        "diastolic": (
            min(profile["diastolic"][0] for profile in profiles),
            max(profile["diastolic"][1] for profile in profiles),
        ),
        "sleep": (
            min(profile["sleep"][0] for profile in profiles),
            max(profile["sleep"][1] for profile in profiles),
        ),
    }


def calculate_risk_score(
    heart_rate: int,
    spo2: float,
    systolic_bp: int,
    diastolic_bp: int,
    sleep_hours: float,
):
    score = 2

    if heart_rate > 100:
        score += 1
    if heart_rate > 120:
        score += 2

    if spo2 < 95:
        score += 1
    if spo2 < 92:
        score += 2
    if spo2 < 89:
        score += 2

    if systolic_bp > 140 or diastolic_bp > 90:
        score += 1
    if systolic_bp > 160 or diastolic_bp > 100:
        score += 2

    if sleep_hours < 6:
        score += 1
    if sleep_hours < 4.5:
        score += 1

    return max(1, min(score, 10))


def get_risk_level(score: int):
    if score >= 8:
        return "High"

    if score >= 5:
        return "Moderate"

    return "Low"


def generate_vitals(patient: models.Patient):
    conditions = split_conditions(patient.condition)
    profile = merge_profiles(conditions)

    heart_rate = random.randint(*profile["hr"])
    spo2 = round(random.uniform(*profile["spo2"]), 1)
    systolic_bp = random.randint(*profile["systolic"])
    diastolic_bp = random.randint(*profile["diastolic"])
    sleep_hours = round(random.uniform(*profile["sleep"]), 1)

    deterioration_chance = 0.25 if len(conditions) > 1 else 0.15

    if random.random() < deterioration_chance:
        heart_rate += random.randint(8, 25)
        spo2 -= round(random.uniform(1, 4), 1)
        systolic_bp += random.randint(5, 20)
        sleep_hours -= round(random.uniform(0.5, 1.5), 1)

    heart_rate = max(45, min(heart_rate, 150))
    spo2 = round(max(82, min(spo2, 100)), 1)
    systolic_bp = max(85, min(systolic_bp, 190))
    diastolic_bp = max(50, min(diastolic_bp, 120))
    sleep_hours = round(max(0, min(sleep_hours, 10)), 1)

    risk_score = calculate_risk_score(
        heart_rate,
        spo2,
        systolic_bp,
        diastolic_bp,
        sleep_hours,
    )

    return {
        "heart_rate": heart_rate,
        "spo2": spo2,
        "systolic_bp": systolic_bp,
        "diastolic_bp": diastolic_bp,
        "steps": random.randint(100, 10000),
        "sleep_hours": sleep_hours,
        "active_minutes": random.randint(0, 120),
        "calories": random.randint(50, 900),
        "risk_score": risk_score,
        "activity_state": "condition_based_simulator",
    }


@router.post("/generate/{patient_id}")
def generate_live_vital(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_roles(current_user, {"doctor", "nurse"})
    patient = get_accessible_patient(db, patient_id, current_user)

    generated = generate_vitals(patient)

    vital = models.Vital(
        patient_id=patient.id,
        timestamp=datetime.now().isoformat(timespec="seconds"),
        source="simulator",
        **generated,
    )

    patient.risk_level = get_risk_level(generated["risk_score"])
    patient.last_checkup = datetime.now().date().isoformat()

    db.add(vital)
    db.commit()
    db.refresh(vital)
    evaluate_new_vital(db, vital)

    write_audit_log(
        db=db,
        action="CONDITION_BASED_SIMULATOR_GENERATE_VITAL",
        entity="Vital",
        entity_id=str(vital.id),
        user_email=current_user.email,
    )

    return {
        "message": "Condition-based simulated vital generated",
        "patient_id": patient.id,
        "patient_name": patient.name,
        "condition": patient.condition,
        "vital": vital,
    }


@router.get("/profiles")
def get_supported_profiles(response: Response):
    response.headers["Cache-Control"] = "public, max-age=300"

    return {
        "supported_conditions": list(DISEASE_PROFILES.keys())
    }
