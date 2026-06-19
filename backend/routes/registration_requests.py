from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from auth_utils import hash_password
from database import get_db
from routes.audit import write_audit_log

router = APIRouter(
    prefix="/registration-requests",
    tags=["Registration Requests"],
)

ALLOWED_ROLES = ["doctor", "nurse", "patient"]


@router.post("/", response_model=schemas.RegistrationRequestResponse)
def create_registration_request(
    request: schemas.RegistrationRequestCreate,
    db: Session = Depends(get_db),
):
    role = request.role.lower()

    if role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=400,
            detail="You can only request doctor, nurse, or patient access.",
        )

    if role == "patient":
        if request.age is None:
            raise HTTPException(
                status_code=400,
                detail="Patients must provide age.",
            )

        if not request.conditions:
            raise HTTPException(
                status_code=400,
                detail="Patients must provide at least one condition or ailment.",
            )

    existing_user = (
        db.query(models.User)
        .filter(models.User.email == request.email.lower())
        .first()
    )

    if existing_user:
        raise HTTPException(status_code=409, detail="User already exists")

    existing_request = (
        db.query(models.RegistrationRequest)
        .filter(models.RegistrationRequest.email == request.email.lower())
        .first()
    )

    if existing_request:
        raise HTTPException(
            status_code=409,
            detail="Registration request already exists",
        )

    new_request = models.RegistrationRequest(
        email=request.email.lower(),
        full_name=request.full_name.strip(),
        role=role,
        password_hash=hash_password(request.password),
        status="pending",
        created_at=datetime.now().isoformat(timespec="seconds"),
        age=request.age,
        gender=request.gender,
        conditions=request.conditions,
        medication_notes=request.medication_notes,
        lifestyle_notes=request.lifestyle_notes,
    )

    db.add(new_request)
    db.commit()
    db.refresh(new_request)

    write_audit_log(
        db=db,
        action="CREATE_REGISTRATION_REQUEST",
        entity="RegistrationRequest",
        entity_id=str(new_request.id),
        user_email=new_request.email,
    )

    return new_request


@router.get("/", response_model=list[schemas.RegistrationRequestResponse])
def get_registration_requests(db: Session = Depends(get_db)):
    return (
        db.query(models.RegistrationRequest)
        .order_by(models.RegistrationRequest.id.desc())
        .all()
    )


@router.post("/{request_id}/approve")
def approve_registration_request(
    request_id: int,
    db: Session = Depends(get_db),
):
    request = (
        db.query(models.RegistrationRequest)
        .filter(models.RegistrationRequest.id == request_id)
        .first()
    )

    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    if request.status != "pending":
        raise HTTPException(status_code=400, detail="Request already reviewed")

    existing_user = (
        db.query(models.User)
        .filter(models.User.email == request.email)
        .first()
    )

    if existing_user:
        raise HTTPException(status_code=409, detail="User already exists")

    new_user = models.User(
        email=request.email,
        full_name=request.full_name,
        role=request.role,
        password_hash=request.password_hash,
        status="active",
    )

    db.add(new_user)
    db.flush()

    created_patient_id = None

    if request.role == "patient":
        patient = models.Patient(
            name=request.full_name,
            age=request.age or 18,
            condition=request.conditions or "General Monitoring",
            risk_level="Low",
            last_checkup=datetime.now().date().isoformat(),
        )

        db.add(patient)
        db.flush()

        created_patient_id = patient.id

        event = models.PatientEvent(
            patient_id=patient.id,
            event_type="Registration",
            title="Patient profile created",
            description=(
                f"Patient registered with conditions: "
                f"{request.conditions or 'General Monitoring'}. "
                f"Medication notes: {request.medication_notes or 'None'}. "
                f"Lifestyle notes: {request.lifestyle_notes or 'None'}."
            ),
            timestamp=datetime.now().isoformat(timespec="seconds"),
        )

        db.add(event)

    request.status = "approved"

    db.commit()
    db.refresh(new_user)

    write_audit_log(
        db=db,
        action="APPROVE_REGISTRATION_REQUEST",
        entity="User",
        entity_id=str(new_user.id),
        user_email=new_user.email,
    )

    return {
        "message": "Registration request approved and user created",
        "user_id": new_user.id,
        "patient_id": created_patient_id,
    }


@router.post("/{request_id}/reject")
def reject_registration_request(
    request_id: int,
    db: Session = Depends(get_db),
):
    request = (
        db.query(models.RegistrationRequest)
        .filter(models.RegistrationRequest.id == request_id)
        .first()
    )

    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    if request.status != "pending":
        raise HTTPException(status_code=400, detail="Request already reviewed")

    request.status = "rejected"

    db.commit()

    write_audit_log(
        db=db,
        action="REJECT_REGISTRATION_REQUEST",
        entity="RegistrationRequest",
        entity_id=str(request.id),
        user_email=request.email,
    )

    return {"message": "Registration request rejected"}