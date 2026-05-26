from datetime import datetime, timedelta
import random

import models
from database import SessionLocal, engine
from auth_utils import hash_password

models.Base.metadata.create_all(bind=engine)

db = SessionLocal()


def create_user(email, full_name, role):
    existing = (
        db.query(models.User)
        .filter(models.User.email == email)
        .first()
    )

    if existing:
        return existing

    user = models.User(
        email=email,
        full_name=full_name,
        role=role,
        password_hash=hash_password("Password123")
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def create_patient(name, age, condition, risk_level):
    patient = models.Patient(
        name=name,
        age=age,
        condition=condition,
        risk_level=risk_level,
        last_checkup="2026-05-21"
    )

    db.add(patient)
    db.commit()
    db.refresh(patient)

    return patient


def create_vitals(patient_id):
    now = datetime.now()

    for index in range(20):
        risk = random.randint(2, 10)

        vital = models.Vital(
            patient_id=patient_id,
            timestamp=(now - timedelta(hours=index)).isoformat(timespec="seconds"),
            heart_rate=random.randint(65, 145),
            spo2=round(random.uniform(88, 99), 1),
            systolic_bp=random.randint(115, 185),
            diastolic_bp=random.randint(75, 115),
            steps=random.randint(300, 10000),
            sleep_hours=round(random.uniform(3.5, 8.5), 1),
            active_minutes=random.randint(5, 90),
            calories=random.randint(1400, 2800),
            risk_score=risk,
            activity_state=random.choice(["resting", "walking", "sleeping", "active"])
        )

        db.add(vital)

    db.commit()


def create_audit(action, entity, entity_id):
    log = models.AuditLog(
        user_email="admin@example.com",
        action=action,
        entity=entity,
        entity_id=str(entity_id)
    )

    db.add(log)
    db.commit()


def main():
    create_user("admin@example.com", "System Admin", "admin")
    create_user("doctor@example.com", "Dr Smith", "doctor")
    create_user("nurse@example.com", "Nurse Taylor", "nurse")
    create_user("patient@example.com", "John Patient", "patient")

    demo_patients = [
        ("Sarah Johnson", 62, "Hypertension", "High"),
        ("James Brown", 55, "Diabetes", "Moderate"),
        ("Amina Yusuf", 47, "Asthma", "Critical"),
        ("David Miller", 70, "Heart Disease", "High"),
        ("Grace Lee", 38, "General Monitoring", "Low"),
    ]

    for patient_data in demo_patients:
        patient = create_patient(*patient_data)
        create_vitals(patient.id)
        create_audit("CREATE_PATIENT", "Patient", patient.id)

    print("Demo data created successfully.")
    print("Login details:")
    print("admin@example.com / Password123")
    print("doctor@example.com / Password123")
    print("nurse@example.com / Password123")
    print("patient@example.com / Password123")


if __name__ == "__main__":
    main()