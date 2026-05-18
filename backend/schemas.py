from pydantic import BaseModel


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