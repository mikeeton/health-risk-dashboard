from datetime import datetime, timedelta
import random

import models
from database import SessionLocal, engine
from auth_utils import hash_password

models.Base.metadata.create_all(bind=engine)

db = SessionLocal()


def create_user(email, full_name, role, job_title=None, department=None):
    existing = db.query(models.User).filter(models.User.email == email).first()

    if existing:
        existing.full_name = full_name
        existing.role = role
        existing.job_title = job_title
        existing.department = department
        existing.organisation = "Northstar Health Demo Trust"
        existing.status = "active"
        db.commit()
        return existing

    user = models.User(
        email=email,
        full_name=full_name,
        role=role,
        password_hash=hash_password("Password123"),
        job_title=job_title,
        department=department,
        organisation="Northstar Health Demo Trust",
        status="active",
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def create_patient(
    name,
    age,
    condition,
    risk_level,
    patient_user,
    doctor,
    nurse,
    demographics,
):
    existing = db.query(models.Patient).filter(models.Patient.name == name).first()
    if existing:
        patient = existing
        created = False
    else:
        patient = models.Patient(
            name=name,
            age=age,
            condition=condition,
            risk_level=risk_level,
            last_checkup="2026-05-28",
        )
        db.add(patient)
        db.flush()
        created = True

    patient.user_id = patient_user.id
    patient.primary_doctor_id = doctor.id
    patient.assigned_nurse_id = nurse.id
    patient.age = age
    patient.condition = condition
    patient.risk_level = risk_level
    for field, value in demographics.items():
        setattr(patient, field, value)
    db.flush()

    for staff, role in ((doctor, "doctor"), (nurse, "nurse")):
        assignment = (
            db.query(models.PatientStaffAssignment)
            .filter(
                models.PatientStaffAssignment.patient_id == patient.id,
                models.PatientStaffAssignment.staff_user_id == staff.id,
                models.PatientStaffAssignment.role == role,
            )
            .first()
        )
        if assignment:
            assignment.status = "active"
        else:
            db.add(
                models.PatientStaffAssignment(
                    patient_id=patient.id,
                    staff_user_id=staff.id,
                    role=role,
                    status="active",
                    assigned_at=datetime.now().isoformat(timespec="seconds"),
                )
            )
    db.commit()
    db.refresh(patient)

    return patient, created


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
            source="demo_seed",
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
    random.seed(20260729)
    create_user("admin@example.com", "System Admin", "admin", "Platform Administrator", "Digital Operations")

    doctors = [
        create_user("doctor@example.com", "Dr Amelia Smith", "doctor", "Consultant Cardiologist", "Cardiology"),
        create_user("doctor2@example.com", "Dr Idris Morgan", "doctor", "Respiratory Consultant", "Respiratory Medicine"),
        create_user("doctor3@example.com", "Dr Sarah Okafor", "doctor", "Consultant Physician", "Acute Medicine"),
        create_user("doctor4@example.com", "Dr Luca Bennett", "doctor", "Diabetes Specialist", "Endocrinology"),
    ]
    nurses = [
        create_user("nurse@example.com", "Nurse Emily Taylor", "nurse", "Senior Staff Nurse", "Cardiology"),
        create_user("nurse2@example.com", "Nurse Noah Williams", "nurse", "Respiratory Nurse", "Respiratory Medicine"),
        create_user("nurse3@example.com", "Nurse Aisha Rahman", "nurse", "Advanced Nurse Practitioner", "Acute Medicine"),
        create_user("nurse4@example.com", "Nurse Chloe Davies", "nurse", "Diabetes Specialist Nurse", "Endocrinology"),
    ]

    demo_patients = [
        ("Sarah Johnson", "sarah.johnson@example.com", 62, "Hypertension", "High", 8, 0, 0, "Female"),
        ("James Brown", "james.brown@example.com", 55, "Type 2 Diabetes", "Moderate", 5, 3, 3, "Male"),
        ("Amina Yusuf", "amina.yusuf@example.com", 47, "Asthma", "Critical", 9, 1, 1, "Female"),
        ("David Miller", "david.miller@example.com", 70, "Coronary Heart Disease", "High", 8, 0, 0, "Male"),
        ("Grace Lee", "grace.lee@example.com", 38, "General Monitoring", "Low", 3, 2, 2, "Female"),
        ("Michael Adams", "michael.adams@example.com", 44, "Post-operative Monitoring", "Moderate", 6, 2, 2, "Male"),
        ("Priya Shah", "priya.shah@example.com", 59, "COPD", "High", 8, 1, 1, "Female"),
        ("Daniel Evans", "daniel.evans@example.com", 31, "General Monitoring", "Low", 2, 2, 2, "Male"),
        ("Fatima Khan", "fatima.khan@example.com", 66, "Hypertension", "Moderate", 6, 0, 0, "Female"),
        ("Oliver Green", "oliver.green@example.com", 73, "Heart Failure", "Critical", 9, 0, 3, "Male"),
    ]

    for index, (
        name,
        email,
        age,
        condition,
        risk_level,
        base_risk,
        doctor_index,
        nurse_index,
        gender,
    ) in enumerate(demo_patients):
        patient_user = create_user(email, name, "patient")
        patient, created = create_patient(
            name,
            age,
            condition,
            risk_level,
            patient_user,
            doctors[doctor_index],
            nurses[nurse_index],
            {
                "gender": gender,
                "phone": f"+44 7700 900{index:03d}",
                "address": f"{10 + index} Demo Street, London",
                "emergency_contact_name": f"Emergency Contact {index + 1}",
                "emergency_contact_phone": f"+44 7700 910{index:03d}",
                "gp_name": f"Dr GP {chr(65 + index)}",
                "gp_practice": "Northstar Community Practice",
                "allergies": "No known allergies" if index % 3 else "Penicillin",
            },
        )
        if not created:
            continue
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
    print("Additional clinicians: doctor2-4@example.com and nurse2-4@example.com")
    print("Patient login example: sarah.johnson@example.com / Password123")
    print("All seeded demo accounts use Password123 (development only).")


if __name__ == "__main__":
    main()
