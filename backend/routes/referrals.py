from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import aliased
from sqlalchemy.orm import Session

import models
import schemas
from access_control import get_accessible_patient, require_admin, require_roles, role_name
from auth_utils import get_current_user
from database import get_db
from notification_utils import create_notification, notify_role
from routes.audit import write_audit_log

router = APIRouter(prefix="/referrals", tags=["Referrals"])


def serialize_referral(
    referral: models.ReferralRequest,
    patient: models.Patient,
    referring_user: models.User,
    receiving_user: models.User | None,
) -> dict:
    """Return a safe referral representation for admin and clinician screens.

    Admins need enough context to approve/reject a referral, but this response
    intentionally avoids vitals, diagnoses, medications, and report details.
    """

    return {
        "id": referral.id,
        "patient_id": referral.patient_id,
        "patient_name": patient.name,
        "referring_user_id": referral.referring_user_id,
        "referring_name": referring_user.full_name,
        "referring_email": referring_user.email,
        "receiving_user_id": referral.receiving_user_id,
        "receiving_name": receiving_user.full_name if receiving_user else None,
        "receiving_email": receiving_user.email if receiving_user else None,
        "receiving_role": receiving_user.role if receiving_user else None,
        "receiving_department": referral.receiving_department,
        "reason": referral.reason,
        "urgency": referral.urgency,
        "notes": referral.notes,
        "status": referral.status,
        "admin_note": referral.admin_note,
        "requested_at": referral.requested_at,
        "reviewed_at": referral.reviewed_at,
        "reviewed_by_user_id": referral.reviewed_by_user_id,
    }


@router.get("/staff", response_model=list[schemas.AdminStaffResponse])
def get_referral_staff_directory(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_roles(current_user, {"admin", "doctor", "nurse"})

    # Clinicians can see a lightweight staff directory for referrals. This is
    # not the same as patient access; approval is still required before records
    # are shared.
    return (
        db.query(models.User)
        .filter(models.User.role.in_(["doctor", "nurse"]))
        .filter((models.User.status == "active") | (models.User.status.is_(None)))
        .order_by(models.User.role.asc(), models.User.full_name.asc())
        .all()
    )


def get_referral_row(db: Session, referral_id: int):
    """Load a referral with patient and user display names.

    SQL aliases are required because the users table is joined twice: once for
    the referring clinician and once for the receiving clinician.
    """

    referring_user_alias = aliased(models.User)
    receiving_user_alias = aliased(models.User)

    return (
        db.query(
            models.ReferralRequest,
            models.Patient,
            referring_user_alias,
            receiving_user_alias,
        )
        .join(models.Patient, models.ReferralRequest.patient_id == models.Patient.id)
        .join(
            referring_user_alias,
            models.ReferralRequest.referring_user_id == referring_user_alias.id,
        )
        .outerjoin(
            receiving_user_alias,
            models.ReferralRequest.receiving_user_id == receiving_user_alias.id,
        )
        .filter(models.ReferralRequest.id == referral_id)
        .first()
    )


@router.post("/", response_model=schemas.ReferralResponse)
def create_referral(
    payload: schemas.ReferralCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_roles(current_user, {"doctor", "nurse"})
    patient = get_accessible_patient(db, payload.patient_id, current_user)

    # A referral can be to a named clinician or to a department. Named clinician
    # referrals can become assignments after admin approval.
    if payload.receiving_user_id is None and not payload.receiving_department:
        raise HTTPException(
            status_code=400,
            detail="Choose a receiving clinician or department.",
        )

    receiving_user = None
    if payload.receiving_user_id is not None:
        # The receiving clinician is validated up front, but no patient access
        # is granted here. Access changes happen only in approve_referral().
        receiving_user = (
            db.query(models.User)
            .filter(models.User.id == payload.receiving_user_id)
            .filter(models.User.role.in_(["doctor", "nurse"]))
            .filter((models.User.status == "active") | (models.User.status.is_(None)))
            .first()
        )

        if not receiving_user:
            raise HTTPException(
                status_code=400,
                detail="Receiving clinician must be an active doctor or nurse.",
            )

        if receiving_user.id == current_user.id:
            raise HTTPException(
                status_code=400,
                detail="You cannot refer a patient to yourself.",
            )

    referral = models.ReferralRequest(
        patient_id=patient.id,
        referring_user_id=current_user.id,
        receiving_user_id=receiving_user.id if receiving_user else None,
        receiving_department=payload.receiving_department,
        reason=payload.reason.strip(),
        urgency=payload.urgency,
        notes=payload.notes.strip() if payload.notes else None,
        status="pending",
        requested_at=datetime.now().isoformat(timespec="seconds"),
    )

    db.add(referral)
    db.flush()

    # Notify admins after the row has an id but before commit so the referral and
    # notification are saved atomically.
    notify_role(
        db,
        role="admin",
        title="Referral approval needed",
        message=f"{current_user.full_name} requested a referral for {patient.name}.",
        notification_type="referral",
        link="/admin/referrals",
        related_entity="ReferralRequest",
        related_entity_id=str(referral.id),
    )

    db.commit()
    db.refresh(referral)

    write_audit_log(
        db=db,
        action="CREATE_REFERRAL_REQUEST",
        entity="ReferralRequest",
        entity_id=str(referral.id),
        user_email=current_user.email,
    )

    return serialize_referral(referral, patient, current_user, receiving_user)


@router.get("/", response_model=list[schemas.ReferralResponse])
def get_referrals(
    status: str | None = Query(default=None, max_length=40),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Admins can review all referral requests. Clinicians only see referrals
    # they sent or referrals addressed to them; this avoids exposing unrelated
    # patient-care workflow.
    referring_user_alias = aliased(models.User)
    receiving_user_alias = aliased(models.User)

    query = (
        db.query(
            models.ReferralRequest,
            models.Patient,
            referring_user_alias,
            receiving_user_alias,
        )
        .join(models.Patient, models.ReferralRequest.patient_id == models.Patient.id)
        .join(
            referring_user_alias,
            models.ReferralRequest.referring_user_id == referring_user_alias.id,
        )
        .outerjoin(
            receiving_user_alias,
            models.ReferralRequest.receiving_user_id == receiving_user_alias.id,
        )
    )

    if role_name(current_user) != "admin":
        require_roles(current_user, {"doctor", "nurse"})
        query = query.filter(
            or_(
                models.ReferralRequest.referring_user_id == current_user.id,
                models.ReferralRequest.receiving_user_id == current_user.id,
            )
        )

    if status:
        query = query.filter(models.ReferralRequest.status == status)

    rows = query.order_by(models.ReferralRequest.id.desc()).all()
    return [
        serialize_referral(referral, patient, referring_user, receiving_user)
        for referral, patient, referring_user, receiving_user in rows
    ]


@router.post("/{referral_id}/approve", response_model=schemas.ReferralResponse)
def approve_referral(
    referral_id: int,
    payload: schemas.ReferralReview,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_admin(current_user)

    row = get_referral_row(db, referral_id)
    if not row:
        raise HTTPException(status_code=404, detail="Referral request not found")

    referral, patient, referring_user, receiving_user = row

    if referral.status != "pending":
        raise HTTPException(status_code=400, detail="Referral has already been reviewed")

    referral.status = "approved"
    referral.admin_note = payload.admin_note
    referral.reviewed_at = datetime.now().isoformat(timespec="seconds")
    referral.reviewed_by_user_id = current_user.id

    if receiving_user:
        # Approval is the exact point where record sharing happens. We create or
        # reactivate a staff assignment, which the central access-control helper
        # will then honor for patient records.
        assignment = (
            db.query(models.PatientStaffAssignment)
            .filter(models.PatientStaffAssignment.patient_id == patient.id)
            .filter(models.PatientStaffAssignment.staff_user_id == receiving_user.id)
            .filter(models.PatientStaffAssignment.role == receiving_user.role)
            .first()
        )

        if assignment:
            assignment.status = "active"
            assignment.assigned_at = datetime.now().isoformat(timespec="seconds")
            assignment.assigned_by_user_id = current_user.id
        else:
            db.add(
                models.PatientStaffAssignment(
                    patient_id=patient.id,
                    staff_user_id=receiving_user.id,
                    role=receiving_user.role,
                    status="active",
                    assigned_at=datetime.now().isoformat(timespec="seconds"),
                    assigned_by_user_id=current_user.id,
                )
            )

        create_notification(
            db,
            user_email=receiving_user.email,
            title="Referral approved",
            message=f"You have been added to {patient.name}'s care team.",
            notification_type="assignment",
            link="/",
            related_entity="ReferralRequest",
            related_entity_id=str(referral.id),
        )

    create_notification(
        db,
        user_email=referring_user.email,
        title="Referral approved",
        message=f"Your referral request for {patient.name} was approved.",
        notification_type="referral",
        link="/referrals",
        related_entity="ReferralRequest",
        related_entity_id=str(referral.id),
    )

    db.commit()

    write_audit_log(
        db=db,
        action="APPROVE_REFERRAL_REQUEST",
        entity="ReferralRequest",
        entity_id=str(referral.id),
        user_email=current_user.email,
    )

    return serialize_referral(referral, patient, referring_user, receiving_user)


@router.post("/{referral_id}/reject", response_model=schemas.ReferralResponse)
def reject_referral(
    referral_id: int,
    payload: schemas.ReferralReview,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_admin(current_user)

    row = get_referral_row(db, referral_id)
    if not row:
        raise HTTPException(status_code=404, detail="Referral request not found")

    referral, patient, referring_user, receiving_user = row

    if referral.status != "pending":
        raise HTTPException(status_code=400, detail="Referral has already been reviewed")

    referral.status = "rejected"
    referral.admin_note = payload.admin_note
    referral.reviewed_at = datetime.now().isoformat(timespec="seconds")
    referral.reviewed_by_user_id = current_user.id

    create_notification(
        db,
        user_email=referring_user.email,
        title="Referral rejected",
        message=f"Your referral request for {patient.name} was rejected.",
        notification_type="referral",
        link="/referrals",
        related_entity="ReferralRequest",
        related_entity_id=str(referral.id),
    )

    db.commit()

    write_audit_log(
        db=db,
        action="REJECT_REFERRAL_REQUEST",
        entity="ReferralRequest",
        entity_id=str(referral.id),
        user_email=current_user.email,
    )

    return serialize_referral(referral, patient, referring_user, receiving_user)


@router.post("/{referral_id}/more-info", response_model=schemas.ReferralResponse)
def request_more_referral_info(
    referral_id: int,
    payload: schemas.ReferralReview,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_admin(current_user)

    # "More information" keeps the request visible without expanding access.
    row = get_referral_row(db, referral_id)
    if not row:
        raise HTTPException(status_code=404, detail="Referral request not found")

    referral, patient, referring_user, receiving_user = row
    referral.status = "more_info"
    referral.admin_note = payload.admin_note
    referral.reviewed_at = datetime.now().isoformat(timespec="seconds")
    referral.reviewed_by_user_id = current_user.id

    create_notification(
        db,
        user_email=referring_user.email,
        title="Referral needs more information",
        message=f"Admin requested more information for {patient.name}'s referral.",
        notification_type="referral",
        link="/referrals",
        related_entity="ReferralRequest",
        related_entity_id=str(referral.id),
    )

    db.commit()

    write_audit_log(
        db=db,
        action="REQUEST_REFERRAL_MORE_INFO",
        entity="ReferralRequest",
        entity_id=str(referral.id),
        user_email=current_user.email,
    )

    return serialize_referral(referral, patient, referring_user, receiving_user)
