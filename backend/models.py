"""Database models for the health risk dashboard.

The schema deliberately separates system administration from clinical access.
For example, staff assignment and referral tables describe who may access a
patient, while the patient-scoped clinical tables remain protected by backend
access-control helpers.
"""

from database import Base
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, Integer, String, Float, ForeignKey, DateTime, UniqueConstraint, Text


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
    phone = Column(String, nullable=True)
    job_title = Column(String, nullable=True)
    department = Column(String, nullable=True)
    organisation = Column(String, nullable=True)
    mfa_enabled = Column(Boolean, default=False, nullable=False)
    mfa_secret_encrypted = Column(String, nullable=True)
    hospital_id = Column(Integer, nullable=True)
    last_login_at = Column(DateTime, nullable=True)


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


class PasswordResetToken(Base):
    """Single-use, short-lived password-reset token stored only as a hash."""

    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String, nullable=False, unique=True, index=True)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    requested_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
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
    date_of_birth = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    phone = Column(String, nullable=True)
    emergency_contact_name = Column(String, nullable=True)
    emergency_contact_phone = Column(String, nullable=True)
    gp_name = Column(String, nullable=True)
    gp_practice = Column(String, nullable=True)
    allergies = Column(Text, nullable=True)
    hospital_id = Column(Integer, nullable=True)


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
    source = Column(String, default="manual", nullable=False)
    external_id = Column(String, unique=True, nullable=True, index=True)
    verification_status = Column(String, default="unverified", nullable=False)
    recorded_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    corrected_from_id = Column(Integer, ForeignKey("vitals.id"), nullable=True)


class WithingsConnection(Base):
    """Encrypted OAuth connection between one patient and Withings user."""

    __tablename__ = "withings_connections"

    id = Column(Integer, primary_key=True)
    patient_id = Column(
        Integer,
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    connected_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    withings_userid = Column(String, nullable=False, unique=True, index=True)
    access_token_encrypted = Column(String, nullable=False)
    refresh_token_encrypted = Column(String, nullable=False)
    token_expires_at = Column(DateTime, nullable=False)
    scopes = Column(String, nullable=True)
    last_sync_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now_naive, nullable=False)
    updated_at = Column(DateTime, default=utc_now_naive, nullable=False)


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
    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    acknowledged_at = Column(String, nullable=True)
    resolved_at = Column(String, nullable=True)
    resolution_reason = Column(Text, nullable=True)
    escalation_due_at = Column(String, nullable=True)
    alert_type = Column(String, default="clinical_review", nullable=False)
    predicted_risk_level = Column(String, nullable=True)
    probability = Column(Float, nullable=True)
    confidence = Column(Float, nullable=True)
    prediction_window_hours = Column(Integer, nullable=True)
    model_version = Column(String, nullable=True)
    evidence_json = Column(Text, nullable=True)
    shap_json = Column(Text, nullable=True)
    data_quality_json = Column(Text, nullable=True)
    missing_information_json = Column(Text, nullable=True)
    recommended_checks_json = Column(Text, nullable=True)
    escalation_conditions_json = Column(Text, nullable=True)
    contact_status = Column(String, default="not_contacted", nullable=False)
    intervention = Column(Text, nullable=True)
    duplicate_updates = Column(Integer, default=0, nullable=False)


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
    prescriber_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    start_date = Column(String, nullable=True)
    end_date = Column(String, nullable=True)
    route = Column(String, nullable=True)
    active = Column(Boolean, default=True, nullable=False)


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


class NotificationRead(Base):
    """Per-user read receipt for direct, role-wide, and global notifications."""

    __tablename__ = "notification_reads"
    __table_args__ = (
        UniqueConstraint(
            "notification_id",
            "user_email",
            name="uq_notification_reads_notification_user",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    notification_id = Column(
        Integer,
        ForeignKey("notifications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_email = Column(String, nullable=False, index=True)
    read_at = Column(String, nullable=False)


class AIConversationMemory(Base):
    """Encrypted, patient- and user-scoped assistant conversation memory."""

    __tablename__ = "ai_conversation_memories"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "patient_id",
            name="uq_ai_memory_user_patient",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    patient_id = Column(
        Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False
    )
    encrypted_history = Column(Text, nullable=False)
    updated_at = Column(String, nullable=False)


class AIFeedback(Base):
    """Human feedback metadata without storing the clinical answer itself."""

    __tablename__ = "ai_feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    patient_id = Column(
        Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False
    )
    response_id = Column(String, nullable=False, index=True)
    rating = Column(String, nullable=False)
    comment = Column(String, nullable=True)
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
    specialist_response = Column(Text, nullable=True)
    outcome = Column(Text, nullable=True)
    completed_at = Column(String, nullable=True)


class Appointment(Base):
    """Patient-visible appointment with controlled scheduling lifecycle."""

    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    clinician_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    starts_at = Column(DateTime, nullable=False, index=True)
    duration_minutes = Column(Integer, default=30, nullable=False)
    appointment_type = Column(String, nullable=False)
    location = Column(String, nullable=True)
    status = Column(String, default="scheduled", nullable=False)
    reason = Column(Text, nullable=True)
    cancellation_reason = Column(Text, nullable=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=utc_now_naive, nullable=False)
    updated_at = Column(DateTime, default=utc_now_naive, nullable=False)


class CareMessage(Base):
    """Patient-scoped secure message; recipients must belong to the care relationship."""

    __tablename__ = "care_messages"

    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    recipient_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now_naive, nullable=False)
    read_at = Column(DateTime, nullable=True)


class CareTask(Base):
    """Assigned clinical/patient task with due date and escalation state."""

    __tablename__ = "care_tasks"

    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_to_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String, default="general", nullable=False)
    priority = Column(String, default="medium", nullable=False)
    due_at = Column(DateTime, nullable=True)
    status = Column(String, default="open", nullable=False)
    completed_at = Column(DateTime, nullable=True)
    completion_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now_naive, nullable=False)


class ConsentRecord(Base):
    """Versioned consent/privacy preference for patient data use."""

    __tablename__ = "consent_records"

    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    consent_type = Column(String, nullable=False)
    granted = Column(Boolean, nullable=False)
    policy_version = Column(String, nullable=False)
    recorded_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    recorded_at = Column(DateTime, default=utc_now_naive, nullable=False)
    withdrawn_at = Column(DateTime, nullable=True)


class ClinicalDocument(Base):
    """Versioned structured note/report with signing and amendment support."""

    __tablename__ = "clinical_documents"

    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    author_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    document_type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    subjective = Column(Text, nullable=True)
    objective = Column(Text, nullable=True)
    assessment = Column(Text, nullable=True)
    plan = Column(Text, nullable=True)
    terminology_code = Column(String, nullable=True)
    terminology_system = Column(String, nullable=True)
    version = Column(Integer, default=1, nullable=False)
    parent_document_id = Column(Integer, ForeignKey("clinical_documents.id"), nullable=True)
    status = Column(String, default="draft", nullable=False)
    signed_at = Column(DateTime, nullable=True)
    cosigned_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    patient_visible = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=utc_now_naive, nullable=False)


class MedicationAdministration(Base):
    """Medication administration record with exception and witness capture."""

    __tablename__ = "medication_administrations"

    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    medication_id = Column(Integer, ForeignKey("medications.id", ondelete="CASCADE"), nullable=False)
    administered_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    witness_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    scheduled_at = Column(DateTime, nullable=False)
    administered_at = Column(DateTime, nullable=True)
    status = Column(String, nullable=False)
    reason = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)


class PatientReportedOutcome(Base):
    """Symptom diary, questionnaire response, or patient-reported measure."""

    __tablename__ = "patient_reported_outcomes"

    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    outcome_type = Column(String, nullable=False)
    severity = Column(Integer, nullable=True)
    response = Column(Text, nullable=False)
    recorded_at = Column(DateTime, default=utc_now_naive, nullable=False)


class DataRightsRequest(Base):
    """Auditable patient access, correction, export, or deletion request."""

    __tablename__ = "data_rights_requests"

    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    request_type = Column(String, nullable=False)
    details = Column(Text, nullable=True)
    status = Column(String, default="submitted", nullable=False)
    submitted_at = Column(DateTime, default=utc_now_naive, nullable=False)
    resolved_at = Column(DateTime, nullable=True)
    resolution_note = Column(Text, nullable=True)


class SystemIncident(Base):
    """Operational/clinical safety incident managed by administrators."""

    __tablename__ = "system_incidents"

    id = Column(Integer, primary_key=True)
    incident_type = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String, default="open", nullable=False)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=utc_now_naive, nullable=False)
    resolved_at = Column(DateTime, nullable=True)


class InvestigationOrder(Base):
    """Laboratory or diagnostic investigation with reviewed result."""

    __tablename__ = "investigation_orders"

    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    ordered_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    investigation_type = Column(String, nullable=False)
    code = Column(String, nullable=True)
    code_system = Column(String, nullable=True)
    priority = Column(String, default="routine", nullable=False)
    status = Column(String, default="ordered", nullable=False)
    instructions = Column(Text, nullable=True)
    result = Column(Text, nullable=True)
    reference_range = Column(String, nullable=True)
    abnormal_flag = Column(String, nullable=True)
    ordered_at = Column(DateTime, default=utc_now_naive, nullable=False)
    resulted_at = Column(DateTime, nullable=True)


class NursingAssessment(Base):
    """Structured nursing assessment represented as validated JSON text."""

    __tablename__ = "nursing_assessments"

    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    nurse_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assessment_type = Column(String, nullable=False)
    score = Column(Float, nullable=True)
    findings_json = Column(Text, nullable=False)
    escalation_required = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=utc_now_naive, nullable=False)


class ObservationSchedule(Base):
    """Due-time schedule for repeat observations and overdue escalation."""

    __tablename__ = "observation_schedules"

    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_to_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    metric = Column(String, nullable=False)
    frequency_minutes = Column(Integer, nullable=False)
    next_due_at = Column(DateTime, nullable=False)
    escalation_minutes = Column(Integer, default=30, nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)


class OrganisationUnit(Base):
    """Organisation/facility/ward hierarchy for administrative scoping."""

    __tablename__ = "organisation_units"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    unit_type = Column(String, nullable=False)
    parent_id = Column(Integer, ForeignKey("organisation_units.id"), nullable=True)
    active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now_naive, nullable=False)


class RolePermission(Base):
    """Fine-grained permission override layered beneath the fixed role."""

    __tablename__ = "role_permissions"
    __table_args__ = (UniqueConstraint("role", "permission", name="uq_role_permission"),)

    id = Column(Integer, primary_key=True)
    role = Column(String, nullable=False)
    permission = Column(String, nullable=False)
    enabled = Column(Boolean, default=True, nullable=False)


class NotificationRule(Base):
    """Configurable notification/escalation policy."""

    __tablename__ = "notification_rules"

    id = Column(Integer, primary_key=True)
    event_type = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    escalation_minutes = Column(Integer, nullable=False)
    target_role = Column(String, nullable=False)
    template = Column(Text, nullable=False)
    active = Column(Boolean, default=True, nullable=False)


class SystemSetting(Base):
    """Persisted administrator-controlled operational feature setting."""

    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True)
    key = Column(String, nullable=False, unique=True, index=True)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=utc_now_naive, nullable=False)
    updated_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)


class ModelPredictionRecord(Base):
    """Immutable-at-creation prediction later reconciled with observed outcomes."""

    __tablename__ = "model_prediction_records"

    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    vital_id = Column(Integer, ForeignKey("vitals.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=utc_now_naive, nullable=False, index=True)
    window_end = Column(DateTime, nullable=False, index=True)
    probability = Column(Float, nullable=False)
    threshold = Column(Float, nullable=False)
    predicted_positive = Column(Boolean, nullable=False)
    consecutive_positive_count = Column(Integer, default=0, nullable=False)
    mode = Column(String, nullable=False)
    model_version = Column(String, nullable=False)
    shap_json = Column(Text, nullable=True)
    data_quality_json = Column(Text, nullable=True)
    drift_score = Column(Float, nullable=True)
    outcome_observed = Column(Boolean, nullable=True)
    outcome_recorded_at = Column(DateTime, nullable=True)
    classification = Column(String, nullable=True)
    notified = Column(Boolean, default=False, nullable=False)


class ModelGovernanceEvent(Base):
    """Approval, activation, suspension, rollback, and retirement evidence."""

    __tablename__ = "model_governance_events"

    id = Column(Integer, primary_key=True)
    action = Column(String, nullable=False)
    model_version = Column(String, nullable=True)
    reason = Column(Text, nullable=False)
    settings_json = Column(Text, nullable=True)
    actor_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=utc_now_naive, nullable=False)


class UsabilityStudySession(Base):
    """Pseudonymous participant task and SUS evidence; never a clinical record."""

    __tablename__ = "usability_study_sessions"
    id = Column(Integer, primary_key=True)
    participant_code = Column(String, nullable=False, index=True)
    participant_role = Column(String, nullable=False)
    protocol_version = Column(String, nullable=False)
    consent_confirmed = Column(Boolean, nullable=False)
    ethics_reference = Column(String, nullable=False)
    task_results_json = Column(Text, nullable=False)
    sus_responses_json = Column(Text, nullable=False)
    sus_score = Column(Float, nullable=False)
    notes = Column(Text, nullable=True)
    recorded_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=utc_now_naive, nullable=False)


class ProspectiveValidationOutcome(Base):
    """Adjudicated future outcome linked to a prediction made beforehand."""

    __tablename__ = "prospective_validation_outcomes"
    __table_args__ = (UniqueConstraint("prediction_id", name="uq_prospective_prediction"),)
    id = Column(Integer, primary_key=True)
    prediction_id = Column(Integer, ForeignKey("model_prediction_records.id", ondelete="CASCADE"), nullable=False)
    outcome_observed = Column(Boolean, nullable=False)
    outcome_type = Column(String, nullable=False)
    observed_at = Column(DateTime, nullable=False)
    adjudication_status = Column(String, nullable=False)
    adjudicator_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now_naive, nullable=False)


class EffectivenessStudyRecord(Base):
    """Pseudonymous workflow-effectiveness evidence for an approved study."""

    __tablename__ = "effectiveness_study_records"
    id = Column(Integer, primary_key=True)
    study_code = Column(String, nullable=False, index=True)
    participant_code = Column(String, nullable=False)
    study_arm = Column(String, nullable=False)
    outcome_name = Column(String, nullable=False)
    outcome_value = Column(Float, nullable=False)
    unit = Column(String, nullable=True)
    intervention_occurred = Column(Boolean, nullable=False)
    protocol_deviation = Column(Boolean, default=False, nullable=False)
    notes = Column(Text, nullable=True)
    recorded_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=utc_now_naive, nullable=False)
