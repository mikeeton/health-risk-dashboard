"""Database models for the health risk dashboard.

The schema deliberately separates system administration from clinical access.
For example, staff assignment and referral tables describe who may access a
patient, while the patient-scoped clinical tables remain protected by backend
access-control helpers.
"""

from database import Base
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime


def utc_now_naive():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    """Application identity record used for authentication and authorization."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    public_id = Column(String, unique=True, nullable=True)

    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)

    status = Column(String, default="active")


class AuthSession(Base):
    """Rotating refresh-token session; raw refresh tokens are never stored."""

    __tablename__ = "auth_sessions"

    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    refresh_jti_hash = Column(String, nullable=False, unique=True, index=True)
    expires_at = Column(DateTime, nullable=False)
    revoked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now_naive, nullable=False)


class Patient(Base):
    """Clinical profile row.

    The legacy doctor/nurse columns are kept as compatibility fallbacks. The
    newer `PatientStaffAssignment` table is the main access model because it can
    represent multiple doctors and nurses for one patient.
    """

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


class PatientStaffAssignment(Base):
    """Many-to-many staff-to-patient access grant.

    Admins manage these rows, but the rows are consumed by clinicians through
    `access_control.patient_query_for_user()`. A removed assignment is retained
    for history instead of being deleted immediately.
    """

    __tablename__ = "patient_staff_assignments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    staff_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String, nullable=False)
    status = Column(String, default="active")
    assigned_at = Column(String, nullable=False)
    assigned_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)


class Vital(Base):
    """Patient-scoped wearable/manual vital reading."""

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
    """Clinical review/escalation case for a patient."""

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
    """Security and accountability trail for important system actions."""

    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, nullable=True)
    action = Column(String, nullable=False)
    entity = Column(String, nullable=False)
    entity_id = Column(String, nullable=True)
    timestamp = Column(DateTime, default=utc_now_naive)


class Medication(Base):
    """Medication item scoped to one patient record."""

    __tablename__ = "medications"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    name = Column(String, nullable=False)
    dosage = Column(String, nullable=False)
    schedule_time = Column(String, nullable=False)
    status = Column(String, default="Due")
    notes = Column(String, nullable=True)


class PatientEvent(Base):
    """Timeline event used for diagnoses, notes, registrations, and care history."""

    __tablename__ = "patient_events"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    event_type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    timestamp = Column(String, nullable=False)


class Notification(Base):
    """User or role-scoped notification.

    `user_email` targets a specific account, `target_role` targets a role, and
    both being null represents a system-wide announcement.
    """

    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, nullable=True)
    target_role = Column(String, nullable=True)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    type = Column(String, default="info")
    is_read = Column(String, default="false")
    link = Column(String, nullable=True)
    related_entity = Column(String, nullable=True)
    related_entity_id = Column(String, nullable=True)
    created_at = Column(String, nullable=False)


class RegistrationRequest(Base):
    """Public access request awaiting admin approval."""

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
    """Registered wearable device metadata for a patient."""

    __tablename__ = "wearable_devices"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)

    device_name = Column(String, nullable=False)
    manufacturer = Column(String, nullable=False)
    device_type = Column(String, default="watch")

    last_sync = Column(String, nullable=True)
    is_connected = Column(String, default="false")


class ReferralRequest(Base):
    """Referral workflow record.

    A referral does not grant access by itself. Access is expanded only when an
    admin approves the request and the backend creates a staff assignment row.
    """

    __tablename__ = "referral_requests"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    referring_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiving_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    receiving_department = Column(String, nullable=True)
    reason = Column(String, nullable=False)
    urgency = Column(String, nullable=False)
    notes = Column(String, nullable=True)
    status = Column(String, default="pending")
    admin_note = Column(String, nullable=True)
    requested_at = Column(String, nullable=False)
    reviewed_at = Column(String, nullable=True)
    reviewed_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
