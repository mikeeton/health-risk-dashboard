from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    role: str
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class PatientBase(BaseModel):
    name: str
    age: int
    condition: str
    risk_level: str = "Low"
    last_checkup: str | None = None


class PatientCreate(PatientBase):
    pass


class PatientResponse(PatientBase):
    id: int

    class Config:
        from_attributes = True


class VitalBase(BaseModel):
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


class VitalCreate(VitalBase):
    pass


class VitalResponse(VitalBase):
    id: int

    class Config:
        from_attributes = True


class ReviewCaseCreate(BaseModel):
    patient_id: int
    patient_name: str
    risk_level: str
    risk_score: int
    note: str | None = None


class ReviewCaseUpdate(BaseModel):
    status: str
    note: str | None = None


class ReviewCaseResponse(BaseModel):
    id: int
    patient_id: int
    patient_name: str
    risk_level: str
    risk_score: int
    status: str
    note: str | None = None
    created_at: str
    updated_at: str | None = None

    class Config:
        from_attributes = True