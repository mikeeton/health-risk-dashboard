from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from access_control import get_accessible_patient, require_roles
from auth_utils import get_current_user
from database import get_db
from notification_utils import create_notification, notify_role
from routes.audit import write_audit_log
from early_warning import evaluate_new_vital

router = APIRouter(
    prefix="/role-actions",
    tags=["Role Actions"],
)


@router.post("/doctor/clinical-note", response_model=schemas.PatientEventResponse)
def doctor_add_clinical_note(
    payload: schemas.DoctorClinicalNoteCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_roles(current_user, {"doctor"})
    get_accessible_patient(db, payload.patient_id, current_user)

    # Clinical notes are stored as patient timeline events so they stay scoped
    # by the same patient access rules used for vitals, medication, and reports.
    event = models.PatientEvent(
        patient_id=payload.patient_id,
        event_type=payload.note_type,
        title=payload.title.strip(),
        description=payload.description.strip(),
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
        user_email=current_user.email,
    )

    return event


@router.post("/doctor/escalate", response_model=schemas.ReviewCaseResponse)
def doctor_escalate_patient(
    payload: schemas.EscalationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_roles(current_user, {"doctor"})
    patient = get_accessible_patient(db, payload.patient_id, current_user)

    latest_vital = (
        db.query(models.Vital)
        .filter(models.Vital.patient_id == payload.patient_id)
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
        note=payload.note.strip(),
        created_at=datetime.now().isoformat(timespec="seconds"),
        updated_at=None,
    )

    db.add(case)
    notify_role(
        db,
        role="admin",
        title="Critical patient escalation",
        message=f"{current_user.full_name} escalated {patient.name}.",
        notification_type="critical",
        link="/audit-logs",
        related_entity="ReviewCase",
        related_entity_id=None,
    )
    db.commit()
    db.refresh(case)

    write_audit_log(
        db=db,
        action="DOCTOR_ESCALATE_PATIENT",
        entity="ReviewCase",
        entity_id=str(case.id),
        user_email=current_user.email,
    )

    return case


@router.get("/doctor/patient-history/{patient_id}")
def doctor_view_patient_history(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_roles(current_user, {"doctor"})
    patient = get_accessible_patient(db, patient_id, current_user)

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


@router.post("/nurse/record-vitals", response_model=schemas.VitalResponse)
def nurse_record_vitals(
    vital: schemas.VitalCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_roles(current_user, {"nurse"})
    get_accessible_patient(db, vital.patient_id, current_user)

    new_vital = models.Vital(
        patient_id=vital.patient_id,
        timestamp=vital.timestamp,
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
    evaluate_new_vital(db, new_vital)

    write_audit_log(
        db=db,
        action="NURSE_RECORD_VITALS",
        entity="Vital",
        entity_id=str(new_vital.id),
        user_email=current_user.email,
    )

    return new_vital


@router.post(
    "/nurse/mark-medication-given/{medication_id}",
    response_model=schemas.MedicationResponse,
)
def nurse_mark_medication_given(
    medication_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_roles(current_user, {"nurse"})

    medication = (
        db.query(models.Medication)
        .filter(models.Medication.id == medication_id)
        .first()
    )

    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")

    get_accessible_patient(db, medication.patient_id, current_user)

    medication.status = "Taken"
    db.commit()
    db.refresh(medication)

    write_audit_log(
        db=db,
        action="NURSE_MARK_MEDICATION_GIVEN",
        entity="Medication",
        entity_id=str(medication.id),
        user_email=current_user.email,
    )

    return medication


@router.post("/nurse/nursing-note", response_model=schemas.PatientEventResponse)
def nurse_add_nursing_note(
    payload: schemas.NursingNoteCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_roles(current_user, {"nurse"})
    get_accessible_patient(db, payload.patient_id, current_user)

    event = models.PatientEvent(
        patient_id=payload.patient_id,
        event_type="Nursing Note",
        title=payload.title.strip(),
        description=payload.description.strip(),
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
        user_email=current_user.email,
    )

    return event


@router.post("/nurse/raise-alert", response_model=schemas.ReviewCaseResponse)
def nurse_raise_alert(
    payload: schemas.NurseAlertCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_roles(current_user, {"nurse"})
    patient = get_accessible_patient(db, payload.patient_id, current_user)

    case = models.ReviewCase(
        patient_id=patient.id,
        patient_name=patient.name,
        risk_level="High",
        risk_score=8,
        status="Open",
        note=payload.note.strip(),
        created_at=datetime.now().isoformat(timespec="seconds"),
        updated_at=None,
    )

    db.add(case)
    notify_role(
        db,
        role="admin",
        title="High-risk patient alert",
        message=f"{current_user.full_name} raised an alert for {patient.name}.",
        notification_type="alert",
        link="/audit-logs",
        related_entity="ReviewCase",
        related_entity_id=None,
    )

    if patient.primary_doctor_id:
        doctor = db.query(models.User).filter(models.User.id == patient.primary_doctor_id).first()
        if doctor:
            create_notification(
                db,
                user_email=doctor.email,
                title="High-risk patient alert",
                message=f"A nursing alert was raised for {patient.name}.",
                notification_type="alert",
                link="/review-cases",
                related_entity="ReviewCase",
                related_entity_id=None,
            )

    db.commit()
    db.refresh(case)

    write_audit_log(
        db=db,
        action="NURSE_RAISE_ALERT",
        entity="ReviewCase",
        entity_id=str(case.id),
        user_email=current_user.email,
    )

    return case


@router.get("/patient/my-records/{patient_id}")
def patient_view_own_records(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_roles(current_user, {"patient"})
    patient = get_accessible_patient(db, patient_id, current_user)

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
