from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from routes.audit import write_audit_log

router = APIRouter(
    prefix="/role-actions",
    tags=["Role Actions"],
)


@router.post("/doctor/clinical-note")
def doctor_add_clinical_note(
    patient_id: int,
    title: str,
    description: str,
    db: Session = Depends(get_db),
):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    event = models.PatientEvent(
        patient_id=patient_id,
        event_type="Clinical Note",
        title=title,
        description=description,
        timestamp=datetime.now().isoformat(timespec="seconds"),
    )

    db.add(event)
    db.commit()
    db.refresh(event)

    write_audit_log(
        db=db,
        action="DOCTOR_ADD_CLINICAL_NOTE",
        entity="PatientEvent",
        entity_id=str(event.id),
        user_email=None,
    )

    return event


@router.post("/doctor/escalate")
def doctor_escalate_patient(
    patient_id: int,
    note: str,
    db: Session = Depends(get_db),
):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    latest_vital = (
        db.query(models.Vital)
        .filter(models.Vital.patient_id == patient_id)
        .order_by(models.Vital.id.desc())
        .first()
    )

    risk_score = latest_vital.risk_score if latest_vital else 7

    case = models.ReviewCase(
        patient_id=patient.id,
        patient_name=patient.name,
        risk_level="High",
        risk_score=risk_score,
        status="Escalated",
        note=note,
        created_at=datetime.now().isoformat(timespec="seconds"),
        updated_at=None,
    )

    db.add(case)
    db.commit()
    db.refresh(case)

    write_audit_log(
        db=db,
        action="DOCTOR_ESCALATE_PATIENT",
        entity="ReviewCase",
        entity_id=str(case.id),
        user_email=None,
    )

    return case


@router.get("/doctor/patient-history/{patient_id}")
def doctor_view_patient_history(
    patient_id: int,
    db: Session = Depends(get_db),
):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    vitals = (
        db.query(models.Vital)
        .filter(models.Vital.patient_id == patient_id)
        .order_by(models.Vital.id.desc())
        .limit(20)
        .all()
    )

    medications = (
        db.query(models.Medication)
        .filter(models.Medication.patient_id == patient_id)
        .order_by(models.Medication.id.desc())
        .all()
    )

    events = (
        db.query(models.PatientEvent)
        .filter(models.PatientEvent.patient_id == patient_id)
        .order_by(models.PatientEvent.id.desc())
        .all()
    )

    return {
        "patient": patient,
        "vitals": vitals,
        "medications": medications,
        "events": events,
    }


@router.post("/nurse/record-vitals")
def nurse_record_vitals(
    vital: schemas.VitalCreate,
    db: Session = Depends(get_db),
):
    patient = db.query(models.Patient).filter(models.Patient.id == vital.patient_id).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    new_vital = models.Vital(
        patient_id=vital.patient_id,
        timestamp=vital.timestamp.isoformat(timespec="seconds"),
        heart_rate=vital.heart_rate,
        spo2=vital.spo2,
        systolic_bp=vital.systolic_bp,
        diastolic_bp=vital.diastolic_bp,
        steps=vital.steps,
        sleep_hours=vital.sleep_hours,
        active_minutes=vital.active_minutes,
        calories=vital.calories,
        risk_score=vital.risk_score,
        activity_state=vital.activity_state,
    )

    db.add(new_vital)
    db.commit()
    db.refresh(new_vital)

    write_audit_log(
        db=db,
        action="NURSE_RECORD_VITALS",
        entity="Vital",
        entity_id=str(new_vital.id),
        user_email=None,
    )

    return new_vital


@router.post("/nurse/mark-medication-given/{medication_id}")
def nurse_mark_medication_given(
    medication_id: int,
    db: Session = Depends(get_db),
):
    medication = (
        db.query(models.Medication)
        .filter(models.Medication.id == medication_id)
        .first()
    )

    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")

    medication.status = "Taken"
    db.commit()
    db.refresh(medication)

    write_audit_log(
        db=db,
        action="NURSE_MARK_MEDICATION_GIVEN",
        entity="Medication",
        entity_id=str(medication.id),
        user_email=None,
    )

    return medication


@router.post("/nurse/nursing-note")
def nurse_add_nursing_note(
    patient_id: int,
    title: str,
    description: str,
    db: Session = Depends(get_db),
):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    event = models.PatientEvent(
        patient_id=patient_id,
        event_type="Nursing Note",
        title=title,
        description=description,
        timestamp=datetime.now().isoformat(timespec="seconds"),
    )

    db.add(event)
    db.commit()
    db.refresh(event)

    write_audit_log(
        db=db,
        action="NURSE_ADD_NURSING_NOTE",
        entity="PatientEvent",
        entity_id=str(event.id),
        user_email=None,
    )

    return event


@router.post("/nurse/raise-alert")
def nurse_raise_alert(
    patient_id: int,
    note: str,
    db: Session = Depends(get_db),
):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    case = models.ReviewCase(
        patient_id=patient.id,
        patient_name=patient.name,
        risk_level="High",
        risk_score=8,
        status="Open",
        note=note,
        created_at=datetime.now().isoformat(timespec="seconds"),
        updated_at=None,
    )

    db.add(case)
    db.commit()
    db.refresh(case)

    write_audit_log(
        db=db,
        action="NURSE_RAISE_ALERT",
        entity="ReviewCase",
        entity_id=str(case.id),
        user_email=None,
    )

    return case


@router.get("/patient/my-records/{patient_id}")
def patient_view_own_records(
    patient_id: int,
    db: Session = Depends(get_db),
):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    vitals = (
        db.query(models.Vital)
        .filter(models.Vital.patient_id == patient_id)
        .order_by(models.Vital.id.desc())
        .limit(10)
        .all()
    )

    medications = (
        db.query(models.Medication)
        .filter(models.Medication.patient_id == patient_id)
        .all()
    )

    events = (
        db.query(models.PatientEvent)
        .filter(models.PatientEvent.patient_id == patient_id)
        .order_by(models.PatientEvent.id.desc())
        .limit(10)
        .all()
    )

    return {
        "patient": patient,
        "vitals": vitals,
        "medications": medications,
        "events": events,
    }