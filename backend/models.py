from sqlalchemy import Column, Integer, String, Float, ForeignKey
from database import Base


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
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