from datetime import datetime, date

from pydantic import BaseModel, EmailStr


# =========================
# USERS
# =========================

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    role: str
    password: str
    hospital_id: int | None = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str
    hospital_id: int | None = None

    class Config:
        from_attributes = True


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
    hospital_id: int | None = None


class PatientResponse(BaseModel):
    id: int
    name: str
    age: int
    condition: str
    risk_level: str
    last_checkup: date
    hospital_id: int | None = None

    class Config:
        from_attributes = True


# =========================
# VITALS
# =========================

class VitalCreate(BaseModel):
    patient_id: int
    timestamp: datetime

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
    id: int

    patient_id: int
    timestamp: datetime

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

    class Config:
        from_attributes = True


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
    id: int

    patient_id: int
    patient_name: str

    risk_level: str
    risk_score: int

    status: str
    note: str

    created_at: str
    updated_at: str | None = None

    class Config:
        from_attributes = True


# =========================
# AUDIT LOGS
# =========================

class AuditLogResponse(BaseModel):
    id: int

    user_email: str | None = None

    action: str
    entity: str
    entity_id: str | None = None

    timestamp: datetime

    class Config:
        from_attributes = True