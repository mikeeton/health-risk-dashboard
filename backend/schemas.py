from datetime import datetime, date

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# =========================
# USERS
# =========================

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1)
    role: str
    password: str = Field(min_length=8)
    hospital_id: int | None = None


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
    name: str
    age: int
    condition: str
    risk_level: str
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


# =========================
# VITALS
# =========================

class VitalCreate(BaseModel):
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
    user_email: str | None = None
    title: str
    message: str
    type: str = "info"


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_email: str | None = None
    title: str
    message: str
    type: str
    is_read: str
    created_at: str

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
    password: str = Field(min_length=8)

    age: int | None = Field(default=None, ge=0, le=130)
    gender: str | None = None
    conditions: str | None = None
    medication_notes: str | None = None
    lifestyle_notes: str | None = None


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
