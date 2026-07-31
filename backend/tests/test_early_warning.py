from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import models
from database import Base
from early_warning import _critical_reasons, _trend_reasons, _patient_threshold, _data_quality, evaluate_new_vital


def make_vital(patient_id, index, *, spo2=97, heart=75, systolic=120, risk=2):
    return models.Vital(
        patient_id=patient_id,
        timestamp=f"2026-07-31T0{index}:00:00+00:00",
        heart_rate=heart,
        spo2=spo2,
        systolic_bp=systolic,
        diastolic_bp=80,
        steps=1000,
        sleep_hours=7,
        active_minutes=20,
        calories=1800,
        risk_score=risk,
        activity_state="resting",
    )


def test_critical_and_developing_trend_detection():
    assert _critical_reasons(make_vital(1, 1, spo2=88))
    recent_desc = [
        make_vital(1, 3, spo2=93, systolic=145, risk=5),
        make_vital(1, 2, spo2=95, systolic=130, risk=3),
        make_vital(1, 1, spo2=97, systolic=120, risk=2),
    ]
    reasons = _trend_reasons(recent_desc)
    assert any("oxygen saturation declined" in item for item in reasons)
    assert any("blood pressure rose" in item for item in reasons)


def test_patient_specific_threshold_and_data_quality_are_explicit():
    high = models.Patient(name="High", age=80, condition="Monitoring", risk_level="High")
    low = models.Patient(name="Low", age=30, condition="Monitoring", risk_level="Low")
    governance = {"threshold": 0.2, "false_positive_cost": 1, "false_negative_cost": 8}
    assert _patient_threshold(high, governance, 0.5) < _patient_threshold(low, governance, 0.5)
    vital = make_vital(1, 1)
    vital.source = "withings"
    quality = _data_quality(vital)
    assert quality["source"] == "withings"
    assert quality["complete"] is True


def test_urgent_alert_is_deduplicated_and_only_assigned_clinician_is_notified():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    doctor = models.User(email="assigned@example.com", full_name="Assigned Doctor", role="doctor", password_hash="x")
    outsider = models.User(email="outsider@example.com", full_name="Other Doctor", role="doctor", password_hash="x")
    admin = models.User(email="admin@example.com", full_name="Admin", role="admin", password_hash="x")
    session.add_all([doctor, outsider, admin]); session.flush()
    patient = models.Patient(name="Alert Patient", age=62, condition="Monitoring", risk_level="Low")
    session.add(patient); session.flush()
    session.add(models.PatientStaffAssignment(patient_id=patient.id, staff_user_id=doctor.id, role="doctor", status="active", assigned_at="2026-07-31T00:00:00+00:00"))
    session.commit()

    first = make_vital(patient.id, 1, spo2=88)
    session.add(first); session.commit(); session.refresh(first)
    evaluate_new_vital(session, first)
    second = make_vital(patient.id, 2, spo2=88)
    session.add(second); session.commit(); session.refresh(second)
    evaluate_new_vital(session, second)

    assert session.query(models.ReviewCase).count() == 1
    notifications = session.query(models.Notification).all()
    assert [item.user_email for item in notifications] == [doctor.email]
    assert notifications[0].type == "critical"
    assert session.query(models.AuditLog).count() == 2
    session.close()
