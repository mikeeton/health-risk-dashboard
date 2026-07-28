from datetime import datetime, timedelta
import random

import models
from database import SessionLocal, engine
from auth_utils import hash_password

models.Base.metadata.create_all(bind=engine)

db = SessionLocal()


def create_user(email, full_name, role):
    existing = db.query(models.User).filter(models.User.email == email).first()

    if existing:
        return existing

    user = models.User(
        email=email,
        full_name=full_name,
        role=role,
        password_hash=hash_password("Password123"),
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
        last_checkup="2026-05-28",
    )

    db.add(patient)
    db.commit()
    db.refresh(patient)

    return patient


def create_vitals(patient_id, base_risk):
    now = datetime.now()

    for index in range(25):
        risk = max(1, min(10, base_risk + random.randint(-2, 2)))

        vital = models.Vital(
            patient_id=patient_id,
            timestamp=(now - timedelta(hours=index * 4)).isoformat(timespec="seconds"),
            heart_rate=random.randint(65, 145),
            spo2=round(random.uniform(88, 99), 1),
            systolic_bp=random.randint(112, 188),
            diastolic_bp=random.randint(70, 116),
            steps=random.randint(300, 10000),
            sleep_hours=round(random.uniform(3.5, 8.5), 1),
            active_minutes=random.randint(5, 90),
            calories=random.randint(1400, 2900),
            risk_score=risk,
            activity_state=random.choice(["resting", "walking", "sleeping", "active"]),
        )

        db.add(vital)

    db.commit()


def create_medication(patient_id):
    if not hasattr(models, "Medication"):
        return

    meds = [
        ("Amlodipine", "5mg", "08:00"),
        ("Metformin", "500mg", "19:00"),
        ("Atorvastatin", "20mg", "21:00"),
    ]

    for name, dosage, time in random.sample(meds, 2):
        med = models.Medication(
            patient_id=patient_id,
            name=name,
            dosage=dosage,
            schedule_time=time,
            status=random.choice(["Taken", "Due", "Missed"]),
            notes="Demo medication record",
        )

        db.add(med)

    db.commit()


def create_events(patient_id):
    if not hasattr(models, "PatientEvent"):
        return

    event_titles = [
        ("Clinical Note", "Clinician note added", "Routine review completed."),
        ("Medication", "Medication adherence updated", "Medication status reviewed."),
        ("Alert", "Risk score changed", "Patient risk score moved during monitoring."),
        ("Review", "Review case created", "Patient marked for clinical review."),
    ]

    for event_type, title, description in random.sample(event_titles, 3):
        event = models.PatientEvent(
            patient_id=patient_id,
            event_type=event_type,
            title=title,
            description=description,
            timestamp=datetime.now().isoformat(timespec="seconds"),
        )

        db.add(event)

    db.commit()


def create_review_case(patient_id, patient_name, risk_level, risk_score):
    if not hasattr(models, "ReviewCase"):
        return

    if risk_score < 7:
        return

    case = models.ReviewCase(
        patient_id=patient_id,
        patient_name=patient_name,
        risk_level=risk_level,
        risk_score=risk_score,
        status="Open",
        note="Demo high-risk patient flagged for review.",
        created_at=datetime.now().isoformat(timespec="seconds"),
        updated_at=None,
    )

    db.add(case)
    db.commit()


def create_audit(action, entity, entity_id):
    if not hasattr(models, "AuditLog"):
        return

    log = models.AuditLog(
        user_email="admin@example.com",
        action=action,
        entity=entity,
        entity_id=str(entity_id),
        timestamp=datetime.now().isoformat(timespec="seconds"),
    )

    db.add(log)
    db.commit()


def main():
    create_user("admin@example.com", "System Admin", "admin")
    create_user("doctor@example.com", "Dr Smith", "doctor")
    create_user("nurse@example.com", "Nurse Taylor", "nurse")
    create_user("patient@example.com", "John Patient", "patient")

    demo_patients = [
        ("Sarah Johnson", 62, "Hypertension", "High", 8),
        ("James Brown", 55, "Type 2 Diabetes", "Moderate", 5),
        ("Amina Yusuf", 47, "Asthma", "Critical", 9),
        ("David Miller", 70, "Heart Disease", "High", 8),
        ("Grace Lee", 38, "General Monitoring", "Low", 3),
        ("Michael Adams", 44, "Post-operative Monitoring", "Moderate", 6),
        ("Priya Shah", 59, "COPD", "High", 8),
        ("Daniel Evans", 31, "General Monitoring", "Low", 2),
        ("Fatima Khan", 66, "Hypertension", "Moderate", 6),
        ("Oliver Green", 73, "Heart Failure", "Critical", 9),
    ]

    for name, age, condition, risk_level, base_risk in demo_patients:
        patient = create_patient(name, age, condition, risk_level)
        create_vitals(patient.id, base_risk)
        create_medication(patient.id)
        create_events(patient.id)
        create_review_case(patient.id, patient.name, risk_level, base_risk)
        create_audit("CREATE_DEMO_PATIENT", "Patient", patient.id)

    print("Demo data created successfully.")
    print("Demo logins:")
    print("admin@example.com / Password123")
    print("doctor@example.com / Password123")
    print("nurse@example.com / Password123")
    print("patient@example.com / Password123")


if __name__ == "__main__":
    main()