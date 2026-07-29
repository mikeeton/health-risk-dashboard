"""Deployment-oriented shared workflows for patients, clinicians, and admins."""

from datetime import datetime, timezone
import json
import pyotp
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import or_, text
from sqlalchemy.orm import Session

import models
from access_control import get_accessible_patient, require_admin, require_roles, role_name
from auth_utils import (
    decrypt_mfa_secret,
    encrypt_mfa_secret,
    get_current_user,
    hash_password,
    verify_password,
)
from config import get_settings
from database import get_db
from routes.audit import write_audit_log

router = APIRouter(prefix="/care", tags=["Care workflows"])
settings = get_settings()


def now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def audit(db: Session, user: models.User, action: str, entity: str, entity_id: int):
    write_audit_log(
        db=db,
        action=action,
        entity=entity,
        entity_id=str(entity_id),
        user_email=user.email,
    )


def row_dict(row, fields):
    return {field: getattr(row, field) for field in fields}


def active_care_user_ids(db: Session, patient: models.Patient) -> set[int]:
    ids = {
        value
        for value in (patient.user_id, patient.primary_doctor_id, patient.assigned_nurse_id)
        if value
    }
    ids.update(
        item[0]
        for item in db.query(models.PatientStaffAssignment.staff_user_id)
        .filter(models.PatientStaffAssignment.patient_id == patient.id)
        .filter(models.PatientStaffAssignment.status == "active")
        .all()
    )
    return ids


@router.get("/team/{patient_id}")
def care_team(
    patient_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    patient = get_accessible_patient(db, patient_id, user)
    ids = active_care_user_ids(db, patient)
    return [
        row_dict(item, ("id", "full_name", "email", "role", "job_title", "department"))
        for item in db.query(models.User)
        .filter(models.User.id.in_(ids), models.User.status == "active")
        .order_by(models.User.role, models.User.full_name)
        .all()
    ]


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: str | None = Field(default=None, max_length=40)
    job_title: str | None = Field(default=None, max_length=120)
    department: str | None = Field(default=None, max_length=120)
    organisation: str | None = Field(default=None, max_length=160)
    address: str | None = Field(default=None, max_length=1000)
    emergency_contact_name: str | None = Field(default=None, max_length=120)
    emergency_contact_phone: str | None = Field(default=None, max_length=40)
    gp_name: str | None = Field(default=None, max_length=120)
    gp_practice: str | None = Field(default=None, max_length=160)


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=12, max_length=128)


class MFAConfirm(BaseModel):
    code: str = Field(min_length=6, max_length=8)


class MFADisable(BaseModel):
    password: str
    code: str = Field(min_length=6, max_length=8)


class AppointmentCreate(BaseModel):
    patient_id: int
    clinician_user_id: int | None = None
    starts_at: datetime
    duration_minutes: int = Field(default=30, ge=10, le=240)
    appointment_type: str = Field(min_length=2, max_length=100)
    location: str | None = Field(default=None, max_length=200)
    reason: str | None = Field(default=None, max_length=2000)


class AppointmentUpdate(BaseModel):
    starts_at: datetime | None = None
    status: Literal["requested", "scheduled", "confirmed", "completed", "cancelled", "reschedule_requested"] | None = None
    cancellation_reason: str | None = Field(default=None, max_length=1000)


class MessageCreate(BaseModel):
    patient_id: int
    recipient_user_id: int
    subject: str = Field(min_length=2, max_length=160)
    body: str = Field(min_length=2, max_length=5000)


class TaskCreate(BaseModel):
    patient_id: int
    assigned_to_user_id: int
    title: str = Field(min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=3000)
    category: str = Field(default="general", max_length=80)
    priority: Literal["low", "medium", "high", "critical"] = "medium"
    due_at: datetime | None = None


class TaskUpdate(BaseModel):
    status: Literal["open", "in_progress", "completed", "cancelled"]
    completion_note: str | None = Field(default=None, max_length=2000)


class ConsentCreate(BaseModel):
    patient_id: int
    consent_type: Literal["care_team_access", "device_sync", "ai_processing", "research", "communications"]
    granted: bool
    policy_version: str = Field(default="2026-07", max_length=40)


class ClinicalDocumentCreate(BaseModel):
    patient_id: int
    document_type: Literal["SOAP Note", "Diagnosis", "Care Plan", "Report", "Handover"]
    title: str = Field(min_length=3, max_length=160)
    subjective: str | None = Field(default=None, max_length=6000)
    objective: str | None = Field(default=None, max_length=6000)
    assessment: str | None = Field(default=None, max_length=6000)
    plan: str | None = Field(default=None, max_length=6000)
    terminology_code: str | None = Field(default=None, max_length=80)
    terminology_system: Literal["SNOMED CT", "ICD-10", "LOINC", "dm+d"] | None = None
    patient_visible: bool = False
    parent_document_id: int | None = None


class AdministrationCreate(BaseModel):
    patient_id: int
    medication_id: int
    scheduled_at: datetime
    status: Literal["administered", "missed", "refused", "delayed", "unavailable"]
    reason: str | None = Field(default=None, max_length=1000)
    notes: str | None = Field(default=None, max_length=2000)
    witness_user_id: int | None = None


class OutcomeCreate(BaseModel):
    patient_id: int
    outcome_type: Literal["symptom diary", "questionnaire", "side effect", "pain score", "wellbeing"]
    severity: int | None = Field(default=None, ge=0, le=10)
    response: str = Field(min_length=2, max_length=4000)


class DataRequestCreate(BaseModel):
    patient_id: int
    request_type: Literal["access", "export", "correction", "restriction", "deletion"]
    details: str | None = Field(default=None, max_length=4000)


class DataRequestResolve(BaseModel):
    status: Literal["in_review", "fulfilled", "declined"]
    resolution_note: str = Field(min_length=3, max_length=4000)


class IncidentCreate(BaseModel):
    incident_type: Literal["security", "clinical_safety", "availability", "integration", "privacy"]
    severity: Literal["low", "medium", "high", "critical"]
    title: str = Field(min_length=3, max_length=160)
    description: str = Field(min_length=5, max_length=5000)


class InvestigationCreate(BaseModel):
    patient_id: int
    investigation_type: str = Field(min_length=2, max_length=160)
    code: str | None = Field(default=None, max_length=80)
    code_system: Literal["LOINC", "SNOMED CT", "local"] | None = None
    priority: Literal["routine", "urgent", "stat"] = "routine"
    instructions: str | None = Field(default=None, max_length=2000)


class InvestigationResult(BaseModel):
    result: str = Field(min_length=1, max_length=5000)
    reference_range: str | None = Field(default=None, max_length=200)
    abnormal_flag: Literal["normal", "low", "high", "critical", "unknown"] = "unknown"


class NursingAssessmentCreate(BaseModel):
    patient_id: int
    assessment_type: Literal["NEWS2", "pain", "falls", "mobility", "wound", "fluid balance", "general"]
    score: float | None = Field(default=None, ge=0, le=100)
    findings: dict[str, str | int | float | bool | None]
    escalation_required: bool = False


class ObservationScheduleCreate(BaseModel):
    patient_id: int
    assigned_to_user_id: int
    metric: str = Field(min_length=2, max_length=120)
    frequency_minutes: int = Field(ge=5, le=10080)
    next_due_at: datetime
    escalation_minutes: int = Field(default=30, ge=5, le=1440)


class AlertWorkflowUpdate(BaseModel):
    action: Literal["acknowledge", "assign", "resolve", "reopen"]
    owner_user_id: int | None = None
    resolution_reason: str | None = Field(default=None, max_length=2000)
    escalation_due_at: str | None = Field(default=None, max_length=80)


class OrganisationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    unit_type: Literal["organisation", "facility", "department", "ward"]
    parent_id: int | None = None


class PermissionSet(BaseModel):
    role: Literal["admin", "doctor", "nurse", "patient"]
    permission: str = Field(min_length=3, max_length=120)
    enabled: bool


class NotificationRuleCreate(BaseModel):
    event_type: str = Field(min_length=2, max_length=120)
    severity: Literal["info", "warning", "high", "critical"]
    escalation_minutes: int = Field(ge=0, le=10080)
    target_role: Literal["admin", "doctor", "nurse", "patient"]
    template: str = Field(min_length=3, max_length=2000)


@router.get("/account/profile")
def get_profile(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    result = row_dict(
        user,
        ("id", "email", "full_name", "role", "phone", "job_title", "department", "organisation", "mfa_enabled", "last_login_at"),
    )
    patient = db.query(models.Patient).filter(models.Patient.user_id == user.id).first()
    if patient:
        result["patient_profile"] = row_dict(
            patient,
            ("id", "date_of_birth", "gender", "address", "phone", "emergency_contact_name", "emergency_contact_phone", "gp_name", "gp_practice", "allergies"),
        )
    return result


@router.patch("/account/profile")
def update_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    values = payload.model_dump(exclude_unset=True)
    for field in ("full_name", "phone", "job_title", "department", "organisation"):
        if field in values:
            setattr(user, field, values[field])
    if role_name(user) == "patient":
        patient = db.query(models.Patient).filter(models.Patient.user_id == user.id).first()
        if patient:
            for field in ("address", "emergency_contact_name", "emergency_contact_phone", "gp_name", "gp_practice"):
                if field in values:
                    setattr(patient, field, values[field])
    db.commit()
    audit(db, user, "UPDATE_OWN_PROFILE", "User", user.id)
    return get_profile(db, user)


@router.post("/account/password", status_code=204)
def change_password(
    payload: PasswordChange,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(400, "Current password is incorrect")
    from schemas import validate_password_strength

    validate_password_strength(payload.new_password)
    user.password_hash = hash_password(payload.new_password)
    db.query(models.AuthSession).filter(models.AuthSession.user_id == user.id).update(
        {"revoked_at": now()}, synchronize_session=False
    )
    db.commit()
    audit(db, user, "CHANGE_PASSWORD", "User", user.id)


@router.post("/account/mfa/enrol")
def enrol_mfa(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    secret = pyotp.random_base32()
    user.mfa_secret_encrypted = encrypt_mfa_secret(secret)
    user.mfa_enabled = False
    db.commit()
    audit(db, user, "START_MFA_ENROLMENT", "User", user.id)
    return {
        "secret": secret,
        "otpauth_uri": pyotp.TOTP(secret).provisioning_uri(
            name=user.email,
            issuer_name="Health AI Monitoring",
        ),
        "warning": "Store the secret in an authenticator, then confirm a current code.",
    }


@router.post("/account/mfa/confirm", status_code=204)
def confirm_mfa(
    payload: MFAConfirm,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    secret = decrypt_mfa_secret(user.mfa_secret_encrypted)
    if not secret or not pyotp.TOTP(secret).verify(payload.code, valid_window=1):
        raise HTTPException(400, "Invalid MFA code")
    user.mfa_enabled = True
    db.commit()
    audit(db, user, "ENABLE_MFA", "User", user.id)


@router.post("/account/mfa/disable", status_code=204)
def disable_mfa(
    payload: MFADisable,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    secret = decrypt_mfa_secret(user.mfa_secret_encrypted)
    if (
        not verify_password(payload.password, user.password_hash)
        or not secret
        or not pyotp.TOTP(secret).verify(payload.code, valid_window=1)
    ):
        raise HTTPException(400, "Password and current MFA code are required")
    user.mfa_enabled = False
    user.mfa_secret_encrypted = None
    db.commit()
    audit(db, user, "DISABLE_MFA", "User", user.id)


@router.get("/account/sessions")
def list_sessions(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return [
        row_dict(item, ("id", "created_at", "expires_at", "revoked_at"))
        for item in db.query(models.AuthSession)
        .filter(models.AuthSession.user_id == user.id)
        .order_by(models.AuthSession.created_at.desc())
        .all()
    ]


@router.delete("/account/sessions/{session_id}", status_code=204)
def revoke_session(
    session_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    session = db.query(models.AuthSession).filter(
        models.AuthSession.id == session_id, models.AuthSession.user_id == user.id
    ).first()
    if not session:
        raise HTTPException(404, "Session not found")
    session.revoked_at = now()
    db.commit()
    audit(db, user, "REVOKE_SESSION", "AuthSession", session.id)


APPOINTMENT_FIELDS = ("id", "patient_id", "clinician_user_id", "starts_at", "duration_minutes", "appointment_type", "location", "status", "reason", "cancellation_reason", "created_at", "updated_at")


@router.get("/appointments/{patient_id}")
def list_appointments(
    patient_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    get_accessible_patient(db, patient_id, user)
    return [row_dict(item, APPOINTMENT_FIELDS) for item in db.query(models.Appointment).filter(models.Appointment.patient_id == patient_id).order_by(models.Appointment.starts_at).all()]


@router.post("/appointments")
def create_appointment(
    payload: AppointmentCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    patient = get_accessible_patient(db, payload.patient_id, user)
    clinician_id = payload.clinician_user_id or patient.primary_doctor_id
    if not clinician_id or clinician_id not in active_care_user_ids(db, patient):
        raise HTTPException(400, "Clinician must belong to the active care team")
    item = models.Appointment(
        **payload.model_dump(exclude={"clinician_user_id"}),
        clinician_user_id=clinician_id,
        status="requested" if role_name(user) == "patient" else "scheduled",
        created_by_user_id=user.id,
        created_at=now(),
        updated_at=now(),
    )
    db.add(item); db.commit(); db.refresh(item)
    audit(db, user, "CREATE_APPOINTMENT", "Appointment", item.id)
    return row_dict(item, APPOINTMENT_FIELDS)


@router.patch("/appointments/{appointment_id}")
def update_appointment(
    appointment_id: int,
    payload: AppointmentUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    item = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not item:
        raise HTTPException(404, "Appointment not found")
    get_accessible_patient(db, item.patient_id, user)
    values = payload.model_dump(exclude_unset=True)
    if role_name(user) == "patient" and values.get("status") not in (None, "cancelled", "reschedule_requested"):
        raise HTTPException(403, "Patients may cancel or request rescheduling")
    for key, value in values.items():
        setattr(item, key, value)
    item.updated_at = now(); db.commit(); db.refresh(item)
    audit(db, user, "UPDATE_APPOINTMENT", "Appointment", item.id)
    return row_dict(item, APPOINTMENT_FIELDS)


MESSAGE_FIELDS = ("id", "patient_id", "sender_user_id", "recipient_user_id", "subject", "body", "created_at", "read_at")


@router.get("/messages/{patient_id}")
def list_messages(patient_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    get_accessible_patient(db, patient_id, user)
    query = db.query(models.CareMessage).filter(models.CareMessage.patient_id == patient_id)
    if role_name(user) == "patient":
        query = query.filter(or_(models.CareMessage.sender_user_id == user.id, models.CareMessage.recipient_user_id == user.id))
    return [row_dict(item, MESSAGE_FIELDS) for item in query.order_by(models.CareMessage.created_at.desc()).limit(100).all()]


@router.post("/messages")
def send_message(payload: MessageCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    patient = get_accessible_patient(db, payload.patient_id, user)
    if payload.recipient_user_id not in active_care_user_ids(db, patient) or payload.recipient_user_id == user.id:
        raise HTTPException(400, "Recipient must be another member of the active care relationship")
    item = models.CareMessage(**payload.model_dump(), sender_user_id=user.id, created_at=now())
    db.add(item); db.commit(); db.refresh(item)
    audit(db, user, "SEND_CARE_MESSAGE", "CareMessage", item.id)
    return row_dict(item, MESSAGE_FIELDS)


@router.patch("/messages/{message_id}/read")
def read_message(message_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    item = db.query(models.CareMessage).filter(models.CareMessage.id == message_id, models.CareMessage.recipient_user_id == user.id).first()
    if not item:
        raise HTTPException(404, "Message not found")
    item.read_at = now(); db.commit(); db.refresh(item)
    return row_dict(item, MESSAGE_FIELDS)


TASK_FIELDS = ("id", "patient_id", "assigned_to_user_id", "created_by_user_id", "title", "description", "category", "priority", "due_at", "status", "completed_at", "completion_note", "created_at")


@router.get("/tasks/{patient_id}")
def list_tasks(patient_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    get_accessible_patient(db, patient_id, user)
    query = db.query(models.CareTask).filter(models.CareTask.patient_id == patient_id)
    if role_name(user) == "patient":
        query = query.filter(models.CareTask.assigned_to_user_id == user.id)
    return [row_dict(item, TASK_FIELDS) for item in query.order_by(models.CareTask.created_at.desc()).all()]


@router.post("/tasks")
def create_task(payload: TaskCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    require_roles(user, {"doctor", "nurse"})
    patient = get_accessible_patient(db, payload.patient_id, user)
    if payload.assigned_to_user_id not in active_care_user_ids(db, patient):
        raise HTTPException(400, "Assignee must belong to the active care relationship")
    item = models.CareTask(**payload.model_dump(), created_by_user_id=user.id, created_at=now())
    db.add(item); db.commit(); db.refresh(item)
    audit(db, user, "CREATE_CARE_TASK", "CareTask", item.id)
    return row_dict(item, TASK_FIELDS)


@router.patch("/tasks/{task_id}")
def update_task(task_id: int, payload: TaskUpdate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    item = db.query(models.CareTask).filter(models.CareTask.id == task_id).first()
    if not item:
        raise HTTPException(404, "Task not found")
    get_accessible_patient(db, item.patient_id, user)
    if role_name(user) == "patient" and item.assigned_to_user_id != user.id:
        raise HTTPException(404, "Task not found")
    item.status = payload.status
    item.completion_note = payload.completion_note
    item.completed_at = now() if payload.status == "completed" else None
    db.commit(); db.refresh(item)
    audit(db, user, "UPDATE_CARE_TASK", "CareTask", item.id)
    return row_dict(item, TASK_FIELDS)


CONSENT_FIELDS = ("id", "patient_id", "consent_type", "granted", "policy_version", "recorded_by_user_id", "recorded_at", "withdrawn_at")


@router.get("/consents/{patient_id}")
def list_consents(patient_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    get_accessible_patient(db, patient_id, user)
    return [row_dict(item, CONSENT_FIELDS) for item in db.query(models.ConsentRecord).filter(models.ConsentRecord.patient_id == patient_id).order_by(models.ConsentRecord.recorded_at.desc()).all()]


@router.post("/consents")
def record_consent(payload: ConsentCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    patient = get_accessible_patient(db, payload.patient_id, user)
    if role_name(user) != "patient" or patient.user_id != user.id:
        raise HTTPException(403, "Only the patient can change consent")
    item = models.ConsentRecord(**payload.model_dump(), recorded_by_user_id=user.id, recorded_at=now(), withdrawn_at=None if payload.granted else now())
    db.add(item); db.commit(); db.refresh(item)
    audit(db, user, "RECORD_CONSENT", "ConsentRecord", item.id)
    return row_dict(item, CONSENT_FIELDS)


DOCUMENT_FIELDS = ("id", "patient_id", "author_user_id", "document_type", "title", "subjective", "objective", "assessment", "plan", "terminology_code", "terminology_system", "version", "parent_document_id", "status", "signed_at", "cosigned_by_user_id", "patient_visible", "created_at")


@router.get("/documents/{patient_id}")
def list_documents(patient_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    get_accessible_patient(db, patient_id, user)
    query = db.query(models.ClinicalDocument).filter(models.ClinicalDocument.patient_id == patient_id)
    if role_name(user) == "patient":
        query = query.filter(models.ClinicalDocument.patient_visible.is_(True), models.ClinicalDocument.status == "signed")
    return [row_dict(item, DOCUMENT_FIELDS) for item in query.order_by(models.ClinicalDocument.created_at.desc()).all()]


@router.post("/documents")
def create_document(payload: ClinicalDocumentCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    require_roles(user, {"doctor", "nurse"})
    get_accessible_patient(db, payload.patient_id, user)
    version = 1
    if payload.parent_document_id:
        parent = db.query(models.ClinicalDocument).filter(models.ClinicalDocument.id == payload.parent_document_id, models.ClinicalDocument.patient_id == payload.patient_id).first()
        if not parent:
            raise HTTPException(400, "Parent document not found")
        version = parent.version + 1
    item = models.ClinicalDocument(**payload.model_dump(), author_user_id=user.id, version=version, created_at=now())
    db.add(item); db.commit(); db.refresh(item)
    audit(db, user, "CREATE_CLINICAL_DOCUMENT", "ClinicalDocument", item.id)
    return row_dict(item, DOCUMENT_FIELDS)


@router.post("/documents/{document_id}/sign")
def sign_document(document_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    require_roles(user, {"doctor"})
    item = db.query(models.ClinicalDocument).filter(models.ClinicalDocument.id == document_id).first()
    if not item:
        raise HTTPException(404, "Document not found")
    get_accessible_patient(db, item.patient_id, user)
    item.status = "signed"; item.signed_at = now(); db.commit(); db.refresh(item)
    audit(db, user, "SIGN_CLINICAL_DOCUMENT", "ClinicalDocument", item.id)
    return row_dict(item, DOCUMENT_FIELDS)


MAR_FIELDS = ("id", "patient_id", "medication_id", "administered_by_user_id", "witness_user_id", "scheduled_at", "administered_at", "status", "reason", "notes")


@router.get("/medication-administrations/{patient_id}")
def list_administrations(patient_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    get_accessible_patient(db, patient_id, user)
    return [row_dict(item, MAR_FIELDS) for item in db.query(models.MedicationAdministration).filter(models.MedicationAdministration.patient_id == patient_id).order_by(models.MedicationAdministration.scheduled_at.desc()).all()]


@router.post("/medication-administrations")
def record_administration(payload: AdministrationCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    require_roles(user, {"nurse"})
    patient = get_accessible_patient(db, payload.patient_id, user)
    medication = db.query(models.Medication).filter(models.Medication.id == payload.medication_id, models.Medication.patient_id == payload.patient_id).first()
    if not medication:
        raise HTTPException(400, "Medication is not active for this patient")
    if payload.status != "administered" and not payload.reason:
        raise HTTPException(422, "A reason is required for medication exceptions")
    if payload.witness_user_id and payload.witness_user_id not in active_care_user_ids(db, patient):
        raise HTTPException(400, "Witness must belong to the care team")
    item = models.MedicationAdministration(
        **payload.model_dump(),
        administered_by_user_id=user.id,
        administered_at=now() if payload.status == "administered" else None,
    )
    db.add(item); db.commit(); db.refresh(item)
    audit(db, user, "RECORD_MEDICATION_ADMINISTRATION", "MedicationAdministration", item.id)
    return row_dict(item, MAR_FIELDS)


OUTCOME_FIELDS = ("id", "patient_id", "outcome_type", "severity", "response", "recorded_at")


@router.get("/outcomes/{patient_id}")
def list_outcomes(patient_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    get_accessible_patient(db, patient_id, user)
    return [row_dict(item, OUTCOME_FIELDS) for item in db.query(models.PatientReportedOutcome).filter(models.PatientReportedOutcome.patient_id == patient_id).order_by(models.PatientReportedOutcome.recorded_at.desc()).all()]


@router.post("/outcomes")
def create_outcome(payload: OutcomeCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    patient = get_accessible_patient(db, payload.patient_id, user)
    if role_name(user) != "patient" or patient.user_id != user.id:
        raise HTTPException(403, "Only the patient can submit patient-reported outcomes")
    item = models.PatientReportedOutcome(**payload.model_dump(), recorded_at=now())
    db.add(item); db.commit(); db.refresh(item)
    audit(db, user, "SUBMIT_PATIENT_OUTCOME", "PatientReportedOutcome", item.id)
    return row_dict(item, OUTCOME_FIELDS)


REQUEST_FIELDS = ("id", "patient_id", "request_type", "details", "status", "submitted_at", "resolved_at", "resolution_note")


@router.get("/data-requests")
def list_data_requests(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    query = db.query(models.DataRightsRequest)
    if role_name(user) == "patient":
        patient = db.query(models.Patient).filter(models.Patient.user_id == user.id).first()
        query = query.filter(models.DataRightsRequest.patient_id == (patient.id if patient else -1))
    else:
        require_admin(user)
    return [row_dict(item, REQUEST_FIELDS) for item in query.order_by(models.DataRightsRequest.submitted_at.desc()).all()]


@router.post("/data-requests")
def create_data_request(payload: DataRequestCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    patient = get_accessible_patient(db, payload.patient_id, user)
    if role_name(user) != "patient" or patient.user_id != user.id:
        raise HTTPException(403, "Only the patient can submit a data-rights request")
    item = models.DataRightsRequest(**payload.model_dump(), submitted_at=now())
    db.add(item); db.commit(); db.refresh(item)
    audit(db, user, "CREATE_DATA_RIGHTS_REQUEST", "DataRightsRequest", item.id)
    return row_dict(item, REQUEST_FIELDS)


@router.patch("/data-requests/{request_id}")
def resolve_data_request(request_id: int, payload: DataRequestResolve, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    require_admin(user)
    item = db.query(models.DataRightsRequest).filter(models.DataRightsRequest.id == request_id).first()
    if not item:
        raise HTTPException(404, "Request not found")
    item.status = payload.status; item.resolution_note = payload.resolution_note
    item.resolved_at = now() if payload.status in ("fulfilled", "declined") else None
    db.commit(); db.refresh(item)
    audit(db, user, "RESOLVE_DATA_RIGHTS_REQUEST", "DataRightsRequest", item.id)
    return row_dict(item, REQUEST_FIELDS)


@router.get("/export/{patient_id}")
def export_patient_record(patient_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    patient = get_accessible_patient(db, patient_id, user)
    if role_name(user) == "patient" and patient.user_id != user.id:
        raise HTTPException(404, "Patient not found")
    return {
        "exported_at": now(),
        "format": "FHIR-ready JSON export (local schema)",
        "patient": row_dict(patient, ("id", "name", "age", "condition", "risk_level", "date_of_birth", "gender", "address", "phone", "emergency_contact_name", "emergency_contact_phone", "gp_name", "gp_practice", "allergies")),
        "vitals": [row_dict(x, ("id", "timestamp", "heart_rate", "spo2", "systolic_bp", "diastolic_bp", "source", "verification_status")) for x in db.query(models.Vital).filter(models.Vital.patient_id == patient_id).all()],
        "medications": [row_dict(x, ("id", "name", "dosage", "schedule_time", "status", "notes")) for x in db.query(models.Medication).filter(models.Medication.patient_id == patient_id).all()],
        "events": [row_dict(x, ("id", "event_type", "title", "description", "timestamp")) for x in db.query(models.PatientEvent).filter(models.PatientEvent.patient_id == patient_id).all()],
        "appointments": list_appointments(patient_id, db, user),
        "consents": list_consents(patient_id, db, user),
        "documents": list_documents(patient_id, db, user),
    }


INVESTIGATION_FIELDS = ("id", "patient_id", "ordered_by_user_id", "investigation_type", "code", "code_system", "priority", "status", "instructions", "result", "reference_range", "abnormal_flag", "ordered_at", "resulted_at")


@router.get("/investigations/{patient_id}")
def list_investigations(patient_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    get_accessible_patient(db, patient_id, user)
    return [row_dict(item, INVESTIGATION_FIELDS) for item in db.query(models.InvestigationOrder).filter(models.InvestigationOrder.patient_id == patient_id).order_by(models.InvestigationOrder.ordered_at.desc()).all()]


@router.post("/investigations")
def order_investigation(payload: InvestigationCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    require_roles(user, {"doctor"})
    get_accessible_patient(db, payload.patient_id, user)
    item = models.InvestigationOrder(**payload.model_dump(), ordered_by_user_id=user.id, ordered_at=now())
    db.add(item); db.commit(); db.refresh(item)
    audit(db, user, "ORDER_INVESTIGATION", "InvestigationOrder", item.id)
    return row_dict(item, INVESTIGATION_FIELDS)


@router.patch("/investigations/{investigation_id}/result")
def result_investigation(investigation_id: int, payload: InvestigationResult, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    require_roles(user, {"doctor"})
    item = db.query(models.InvestigationOrder).filter(models.InvestigationOrder.id == investigation_id).first()
    if not item:
        raise HTTPException(404, "Investigation not found")
    get_accessible_patient(db, item.patient_id, user)
    for key, value in payload.model_dump().items():
        setattr(item, key, value)
    item.status = "resulted"; item.resulted_at = now()
    db.commit(); db.refresh(item)
    audit(db, user, "RESULT_INVESTIGATION", "InvestigationOrder", item.id)
    return row_dict(item, INVESTIGATION_FIELDS)


ASSESSMENT_FIELDS = ("id", "patient_id", "nurse_user_id", "assessment_type", "score", "findings_json", "escalation_required", "created_at")


@router.get("/nursing-assessments/{patient_id}")
def list_nursing_assessments(patient_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    get_accessible_patient(db, patient_id, user)
    rows = []
    for item in db.query(models.NursingAssessment).filter(models.NursingAssessment.patient_id == patient_id).order_by(models.NursingAssessment.created_at.desc()).all():
        result = row_dict(item, ASSESSMENT_FIELDS)
        result["findings"] = json.loads(result.pop("findings_json"))
        rows.append(result)
    return rows


@router.post("/nursing-assessments")
def create_nursing_assessment(payload: NursingAssessmentCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    require_roles(user, {"nurse"})
    get_accessible_patient(db, payload.patient_id, user)
    item = models.NursingAssessment(
        patient_id=payload.patient_id,
        nurse_user_id=user.id,
        assessment_type=payload.assessment_type,
        score=payload.score,
        findings_json=json.dumps(payload.findings),
        escalation_required=payload.escalation_required,
        created_at=now(),
    )
    db.add(item); db.commit(); db.refresh(item)
    audit(db, user, "CREATE_NURSING_ASSESSMENT", "NursingAssessment", item.id)
    return list_nursing_assessments(payload.patient_id, db, user)[0]


SCHEDULE_FIELDS = ("id", "patient_id", "assigned_to_user_id", "metric", "frequency_minutes", "next_due_at", "escalation_minutes", "active", "created_by_user_id")


@router.get("/observation-schedules/{patient_id}")
def list_observation_schedules(patient_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    get_accessible_patient(db, patient_id, user)
    return [row_dict(item, SCHEDULE_FIELDS) for item in db.query(models.ObservationSchedule).filter(models.ObservationSchedule.patient_id == patient_id).order_by(models.ObservationSchedule.next_due_at).all()]


@router.post("/observation-schedules")
def create_observation_schedule(payload: ObservationScheduleCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    require_roles(user, {"doctor", "nurse"})
    patient = get_accessible_patient(db, payload.patient_id, user)
    if payload.assigned_to_user_id not in active_care_user_ids(db, patient):
        raise HTTPException(400, "Assignee must belong to the care team")
    item = models.ObservationSchedule(**payload.model_dump(), created_by_user_id=user.id)
    db.add(item); db.commit(); db.refresh(item)
    audit(db, user, "CREATE_OBSERVATION_SCHEDULE", "ObservationSchedule", item.id)
    return row_dict(item, SCHEDULE_FIELDS)


ALERT_FIELDS = ("id", "patient_id", "patient_name", "risk_level", "risk_score", "status", "note", "created_at", "updated_at", "owner_user_id", "acknowledged_at", "resolved_at", "resolution_reason", "escalation_due_at")


@router.get("/alerts/{patient_id}")
def list_alerts(patient_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    get_accessible_patient(db, patient_id, user)
    return [row_dict(item, ALERT_FIELDS) for item in db.query(models.ReviewCase).filter(models.ReviewCase.patient_id == patient_id).order_by(models.ReviewCase.id.desc()).all()]


@router.patch("/alerts/{alert_id}")
def update_alert_workflow(alert_id: int, payload: AlertWorkflowUpdate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    require_roles(user, {"doctor", "nurse"})
    item = db.query(models.ReviewCase).filter(models.ReviewCase.id == alert_id).first()
    if not item:
        raise HTTPException(404, "Alert not found")
    patient = get_accessible_patient(db, item.patient_id, user)
    if payload.owner_user_id and payload.owner_user_id not in active_care_user_ids(db, patient):
        raise HTTPException(400, "Alert owner must belong to the care team")
    if payload.action == "acknowledge":
        item.acknowledged_at = now().isoformat()
        item.owner_user_id = payload.owner_user_id or user.id
        item.status = "Acknowledged"
    elif payload.action == "assign":
        if not payload.owner_user_id:
            raise HTTPException(422, "owner_user_id is required")
        item.owner_user_id = payload.owner_user_id
    elif payload.action == "resolve":
        if not payload.resolution_reason:
            raise HTTPException(422, "resolution_reason is required")
        item.status = "Resolved"; item.resolved_at = now().isoformat()
        item.resolution_reason = payload.resolution_reason
    else:
        item.status = "Open"; item.resolved_at = None; item.resolution_reason = None
    if payload.escalation_due_at is not None:
        item.escalation_due_at = payload.escalation_due_at
    item.updated_at = now().isoformat()
    db.commit(); db.refresh(item)
    audit(db, user, f"{payload.action.upper()}_ALERT", "ReviewCase", item.id)
    return row_dict(item, ALERT_FIELDS)


@router.get("/medication-safety/{patient_id}")
def medication_safety(patient_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    patient = get_accessible_patient(db, patient_id, user)
    medications = db.query(models.Medication).filter(models.Medication.patient_id == patient_id, models.Medication.active.is_(True)).all()
    names = [item.name.strip().lower() for item in medications]
    duplicate_names = sorted({name for name in names if names.count(name) > 1})
    allergy_text = (patient.allergies or "").lower()
    allergy_matches = sorted({item.name for item in medications if item.name.lower() in allergy_text})
    return {
        "checked_at": now(),
        "status": "review_required" if duplicate_names or allergy_matches else "no_local_conflict_detected",
        "duplicate_medications": duplicate_names,
        "allergy_matches": allergy_matches,
        "external_interaction_database": "not_configured",
        "warning": "This local screen cannot replace a licensed medicines interaction and allergy database.",
    }


@router.get("/admin/operations")
def admin_operations(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    require_admin(user)
    latest_backup = None
    return {
        "services": {
            "api": "ok",
            "database": db.execute(text("SELECT 1")).scalar_one() == 1,
            "redis": "configured" if settings.redis_url else "not_configured",
            "groq": "enabled" if settings.ai_enabled else "disabled",
            "withings": "configured" if settings.withings_client_id else "not_configured",
            "error_reporting": "configured" if settings.sentry_dsn else "not_configured",
        },
        "governance": {
            "ai_data_classification": settings.ai_data_classification,
            "provider_dpa_approved": settings.ai_provider_dpa_approved,
            "retention_reviewed": settings.ai_retention_reviewed,
            "regional_processing_approved": settings.ai_regional_processing_approved,
            "clinical_approval": settings.ai_clinical_approval,
        },
        "counts": {
            "active_users": db.query(models.User).filter(models.User.status == "active").count(),
            "open_incidents": db.query(models.SystemIncident).filter(models.SystemIncident.status != "resolved").count(),
            "open_data_requests": db.query(models.DataRightsRequest).filter(models.DataRightsRequest.status.in_(["submitted", "in_review"])).count(),
            "ai_feedback": db.query(models.AIFeedback).count(),
        },
        "backup": {"latest_verified_at": latest_backup, "status": "external_monitor_required"},
    }


@router.get("/admin/incidents")
def list_incidents(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    require_admin(user)
    return [row_dict(item, ("id", "incident_type", "severity", "title", "description", "status", "created_at", "resolved_at")) for item in db.query(models.SystemIncident).order_by(models.SystemIncident.created_at.desc()).all()]


@router.post("/admin/incidents")
def create_incident(payload: IncidentCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    require_admin(user)
    item = models.SystemIncident(**payload.model_dump(), created_by_user_id=user.id, created_at=now())
    db.add(item); db.commit(); db.refresh(item)
    audit(db, user, "CREATE_SYSTEM_INCIDENT", "SystemIncident", item.id)
    return row_dict(item, ("id", "incident_type", "severity", "title", "description", "status", "created_at", "resolved_at"))


@router.get("/admin/organisation-units")
def list_organisation_units(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    require_admin(user)
    return [row_dict(item, ("id", "name", "unit_type", "parent_id", "active", "created_at")) for item in db.query(models.OrganisationUnit).order_by(models.OrganisationUnit.name).all()]


@router.post("/admin/organisation-units")
def create_organisation_unit(payload: OrganisationCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    require_admin(user)
    if payload.parent_id and not db.query(models.OrganisationUnit).filter(models.OrganisationUnit.id == payload.parent_id).first():
        raise HTTPException(400, "Parent organisation unit not found")
    item = models.OrganisationUnit(**payload.model_dump(), created_at=now())
    db.add(item); db.commit(); db.refresh(item)
    audit(db, user, "CREATE_ORGANISATION_UNIT", "OrganisationUnit", item.id)
    return row_dict(item, ("id", "name", "unit_type", "parent_id", "active", "created_at"))


@router.get("/admin/permissions")
def list_role_permissions(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    require_admin(user)
    return [row_dict(item, ("id", "role", "permission", "enabled")) for item in db.query(models.RolePermission).order_by(models.RolePermission.role, models.RolePermission.permission).all()]


@router.put("/admin/permissions")
def set_role_permission(payload: PermissionSet, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    require_admin(user)
    item = db.query(models.RolePermission).filter(models.RolePermission.role == payload.role, models.RolePermission.permission == payload.permission).first()
    if item:
        item.enabled = payload.enabled
    else:
        item = models.RolePermission(**payload.model_dump())
        db.add(item)
    db.commit(); db.refresh(item)
    audit(db, user, "SET_ROLE_PERMISSION", "RolePermission", item.id)
    return row_dict(item, ("id", "role", "permission", "enabled"))


@router.get("/admin/notification-rules")
def list_notification_rules(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    require_admin(user)
    return [row_dict(item, ("id", "event_type", "severity", "escalation_minutes", "target_role", "template", "active")) for item in db.query(models.NotificationRule).order_by(models.NotificationRule.event_type).all()]


@router.post("/admin/notification-rules")
def create_notification_rule(payload: NotificationRuleCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    require_admin(user)
    item = models.NotificationRule(**payload.model_dump())
    db.add(item); db.commit(); db.refresh(item)
    audit(db, user, "CREATE_NOTIFICATION_RULE", "NotificationRule", item.id)
    return row_dict(item, ("id", "event_type", "severity", "escalation_minutes", "target_role", "template", "active"))


@router.get("/admin/users-export")
def export_users(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    require_admin(user)
    return {
        "exported_at": now(),
        "users": [
            row_dict(item, ("public_id", "email", "full_name", "role", "status", "department", "organisation", "mfa_enabled", "last_login_at"))
            for item in db.query(models.User).order_by(models.User.id).all()
        ],
    }
