from database import Base
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    public_id = Column(String, unique=True, nullable=True)

    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)

    status = Column(String, default="active")


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    primary_doctor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_nurse_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    condition = Column(String, nullable=False)
    risk_level = Column(String, default="Low")
    last_checkup = Column(String, nullable=True)


class Vital(Base):
    __tablename__ = "vitals"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)

    timestamp = Column(String, nullable=False)
    heart_rate = Column(Integer, nullable=False)
    spo2 = Column(Float, nullable=False)
    systolic_bp = Column(Integer, nullable=False)
    diastolic_bp = Column(Integer, nullable=False)
    steps = Column(Integer, nullable=False)
    sleep_hours = Column(Float, nullable=False)
    active_minutes = Column(Integer, nullable=False)
    calories = Column(Integer, nullable=False)
    risk_score = Column(Integer, nullable=False)
    activity_state = Column(String, nullable=False)


class ReviewCase(Base):
    __tablename__ = "review_cases"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    patient_name = Column(String, nullable=False)
    risk_level = Column(String, nullable=False)
    risk_score = Column(Integer, nullable=False)
    status = Column(String, default="Open")
    note = Column(String, nullable=True)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, nullable=True)
    action = Column(String, nullable=False)
    entity = Column(String, nullable=False)
    entity_id = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)


class Medication(Base):
    __tablename__ = "medications"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    name = Column(String, nullable=False)
    dosage = Column(String, nullable=False)
    schedule_time = Column(String, nullable=False)
    status = Column(String, default="Due")
    notes = Column(String, nullable=True)


class PatientEvent(Base):
    __tablename__ = "patient_events"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    event_type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    timestamp = Column(String, nullable=False)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, nullable=True)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    type = Column(String, default="info")
    is_read = Column(String, default="false")
    created_at = Column(String, nullable=False)


class RegistrationRequest(Base):
    __tablename__ = "registration_requests"

    id = Column(Integer, primary_key=True, index=True)

    email = Column(String, unique=True, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)

    status = Column(String, default="pending")
    created_at = Column(String, nullable=False)

    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)
    conditions = Column(String, nullable=True)
    medication_notes = Column(String, nullable=True)
    lifestyle_notes = Column(String, nullable=True)


class WearableDevice(Base):
    __tablename__ = "wearable_devices"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)

    device_name = Column(String, nullable=False)
    manufacturer = Column(String, nullable=False)
    device_type = Column(String, default="watch")

    last_sync = Column(String, nullable=True)
    is_connected = Column(String, default="false")
