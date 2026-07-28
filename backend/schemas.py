from datetime import datetime, date

from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


COMMON_PASSWORDS = {
    "password", "password123", "password123!", "admin123", "qwerty123",
    "letmein123", "welcome123",
}


def validate_password_strength(value: str) -> str:
    if len(value) < 12:
        raise ValueError("Password must contain at least 12 characters")
    if value.lower() in COMMON_PASSWORDS:
        raise ValueError("Password is too common")
    if not any(character.islower() for character in value):
        raise ValueError("Password must contain a lowercase letter")
    if not any(character.isupper() for character in value):
        raise ValueError("Password must contain an uppercase letter")
    if not any(character.isdigit() for character in value):
        raise ValueError("Password must contain a number")
    if not any(not character.isalnum() for character in value):
        raise ValueError("Password must contain a symbol")
    return value


# =========================
# USERS
# =========================

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1)
    role: str
    password: str = Field(min_length=12, max_length=128)
    hospital_id: int | None = None

    _strong_password = field_validator("password")(validate_password_strength)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
    role: str
    hospital_id: int | None = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user: UserResponse


# =========================
# PATIENTS
# =========================

class PatientCreate(BaseModel):
    """Payload for doctor-created patients.

    Admins use assignment/approval flows instead of creating clinical records
    directly, so this schema is intentionally used by clinician routes.
    """

    name: str = Field(min_length=1, max_length=120)
    age: int = Field(ge=0, le=130)
    condition: str = Field(min_length=1, max_length=500)
    risk_level: str = Field(min_length=1, max_length=40)
    last_checkup: date
    user_id: int | None = None
    primary_doctor_id: int | None = None
    assigned_nurse_id: int | None = None
    hospital_id: int | None = None


class PatientCareTeamUpdate(BaseModel):
    user_id: int | None = None
    primary_doctor_id: int | None = None
    assigned_nurse_id: int | None = None


class PatientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int | None = None
    primary_doctor_id: int | None = None
    assigned_nurse_id: int | None = None
    name: str
    age: int
    condition: str
    risk_level: str
    last_checkup: date
    hospital_id: int | None = None


class AdminPatientDirectoryResponse(BaseModel):
    id: int
    name: str
    linked_user_id: int | None = None
    linked_user_email: EmailStr | None = None


class AdminStaffResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str
    status: str | None = None


class AdminPasswordReset(BaseModel):
    """Admin-verified password reset for an existing account."""

    admin_password: str = Field(min_length=8)
    new_password: str = Field(min_length=12, max_length=128)

    _strong_password = field_validator("new_password")(validate_password_strength)


class AssistantQuestion(BaseModel):
    question: str = Field(min_length=2, max_length=500)


class StaffAssignmentCreate(BaseModel):
    patient_id: int = Field(gt=0)
    staff_user_id: int = Field(gt=0)
    role: str


class StaffAssignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    patient_name: str
    staff_user_id: int
    staff_name: str
    staff_email: EmailStr
    role: str
    status: str
    assigned_at: str
    assigned_by_user_id: int | None = None


# =========================
# VITALS
# =========================

class VitalCreate(BaseModel):
    """Validated vital reading.

    Bounds keep impossible values out of charts, risk scoring, and ML
    prediction routines.
    """

    patient_id: int = Field(gt=0)
    timestamp: str = Field(min_length=1, max_length=80)

    heart_rate: int = Field(ge=20, le=240)
    spo2: float = Field(ge=50, le=100)

    systolic_bp: int = Field(ge=40, le=260)
    diastolic_bp: int = Field(ge=20, le=180)

    steps: int = Field(ge=0, le=200000)
    sleep_hours: float = Field(ge=0, le=24)
    active_minutes: int = Field(ge=0, le=1440)
    calories: int = Field(ge=0, le=20000)

    risk_score: int = Field(ge=0, le=10)
    activity_state: str = Field(min_length=1, max_length=80)


class VitalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int

    patient_id: int
    timestamp: str

    heart_rate: int
    spo2: float

    systolic_bp: int
    diastolic_bp: int

    steps: int
    sleep_hours: float
    active_minutes: int
    calories: int

    risk_score: int
    activity_state: str

# =========================
# REVIEW CASES
# =========================

class ReviewCaseCreate(BaseModel):
    patient_id: int
    patient_name: str
    risk_level: str
    risk_score: int
    note: str


class ReviewCaseUpdate(BaseModel):
    status: str
    note: str


class ReviewCaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int

    patient_id: int
    patient_name: str

    risk_level: str
    risk_score: int

    status: str
    note: str

    created_at: str
    updated_at: str | None = None


# =========================
# AUDIT LOGS
# =========================

class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int

    user_email: str | None = None

    action: str
    entity: str
    entity_id: str | None = None

    timestamp: datetime

# =========================
# MEDICATIONS
# =========================

class MedicationCreate(BaseModel):
    patient_id: int
    name: str
    dosage: str
    schedule_time: str
    status: str = "Due"
    notes: str | None = None


class MedicationUpdate(BaseModel):
    status: str
    notes: str | None = None


class MedicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    name: str
    dosage: str
    schedule_time: str
    status: str
    notes: str | None = None


# =========================
# PATIENT EVENTS
# =========================

class PatientEventCreate(BaseModel):
    patient_id: int
    event_type: str
    title: str
    description: str | None = None
    timestamp: str


class PatientEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    event_type: str
    title: str
    description: str | None = None
    timestamp: str


# =========================
# ROLE ACTIONS
# =========================

class DoctorClinicalNoteCreate(BaseModel):
    patient_id: int = Field(gt=0)
    note_type: Literal["Clinical Note", "Diagnosis", "Treatment Plan"] = "Clinical Note"
    title: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=5, max_length=4000)


class EscalationCreate(BaseModel):
    patient_id: int = Field(gt=0)
    note: str = Field(min_length=5, max_length=2000)


class NursingNoteCreate(BaseModel):
    patient_id: int = Field(gt=0)
    title: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=5, max_length=3000)


class NurseAlertCreate(BaseModel):
    patient_id: int = Field(gt=0)
    note: str = Field(min_length=5, max_length=2000)


# =========================
# ML PREDICTION
# =========================

class MLPredictionResponse(BaseModel):
    patient_id: int
    prediction_score: int
    prediction_level: str
    confidence: float
    message: str

# =========================
# NOTIFICATIONS 
# =========================
class NotificationCreate(BaseModel):
    """Admin/system notification creation payload."""

    user_email: str | None = None
    target_role: str | None = None
    title: str
    message: str
    type: str = "info"
    link: str | None = None
    related_entity: str | None = None
    related_entity_id: str | None = None


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_email: str | None = None
    target_role: str | None = None
    title: str
    message: str
    type: str
    is_read: str
    link: str | None = None
    related_entity: str | None = None
    related_entity_id: str | None = None
    created_at: str
    read_at: str | None = None


class NotificationMarkAllResponse(BaseModel):
    updated: int


class ReferralCreate(BaseModel):
    """Clinician referral request.

    The request records intent only. It does not grant the receiving clinician
    patient access until an admin approves it.
    """

    patient_id: int = Field(gt=0)
    receiving_user_id: int | None = Field(default=None, gt=0)
    receiving_department: str | None = Field(default=None, min_length=2, max_length=120)
    reason: str = Field(min_length=5, max_length=500)
    urgency: Literal["Low", "Medium", "High", "Critical"]
    notes: str | None = Field(default=None, max_length=2000)


class ReferralReview(BaseModel):
    """Admin review note for approval, rejection, or more-info decisions."""

    admin_note: str | None = Field(default=None, max_length=2000)


class ReferralResponse(BaseModel):
    """Safe referral response used by admin and clinician UIs.

    Includes patient/staff names for workflow context but excludes clinical
    vitals, diagnoses, medications, and reports.
    """

    id: int
    patient_id: int
    patient_name: str
    referring_user_id: int
    referring_name: str
    referring_email: EmailStr
    receiving_user_id: int | None = None
    receiving_name: str | None = None
    receiving_email: EmailStr | None = None
    receiving_role: str | None = None
    receiving_department: str | None = None
    reason: str
    urgency: str
    notes: str | None = None
    status: str
    admin_note: str | None = None
    requested_at: str
    reviewed_at: str | None = None
    reviewed_by_user_id: int | None = None

# =========================
# Registration and Login
# =========================

# =========================
# wearable connection
# =========================

class WearableVitalCreate(BaseModel):
    patient_id: int

    device_name: str

    heart_rate: int
    spo2: float

    steps: int

    sleep_hours: float

    timestamp: str


class WearableDeviceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int

    patient_id: int

    device_name: str

    manufacturer: str

    device_type: str

    last_sync: str | None

    is_connected: str

# =========================
# registration requests
# =========================

class RegistrationRequestCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1)
    role: str
    password: str = Field(min_length=12, max_length=128)

    age: int | None = Field(default=None, ge=0, le=130)
    gender: str | None = None
    conditions: str | None = None
    medication_notes: str | None = None
    lifestyle_notes: str | None = None

    _strong_password = field_validator("password")(validate_password_strength)


class RegistrationRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
    role: str
    status: str
    created_at: str

    age: int | None = None
    gender: str | None = None
    conditions: str | None = None
    medication_notes: str | None = None
    lifestyle_notes: str | None = None
