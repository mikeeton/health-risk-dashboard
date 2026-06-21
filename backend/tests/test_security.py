from datetime import datetime
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

import models
from auth_utils import hash_password
from database import SessionLocal
from main import app


TEST_PASSWORD = "TestPassword123!"


@pytest.fixture()
def client():
    return TestClient(app)


@pytest.fixture()
def db():
    session = SessionLocal()

    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def cleanup(db):
    emails: list[str] = []
    patient_ids: list[int] = []
    registration_emails: list[str] = []

    yield {
        "emails": emails,
        "patient_ids": patient_ids,
        "registration_emails": registration_emails,
    }

    if patient_ids:
        db.query(models.Vital).filter(models.Vital.patient_id.in_(patient_ids)).delete(
            synchronize_session=False
        )
        db.query(models.ReviewCase).filter(
            models.ReviewCase.patient_id.in_(patient_ids)
        ).delete(synchronize_session=False)
        db.query(models.Medication).filter(
            models.Medication.patient_id.in_(patient_ids)
        ).delete(synchronize_session=False)
        db.query(models.PatientEvent).filter(
            models.PatientEvent.patient_id.in_(patient_ids)
        ).delete(synchronize_session=False)
        db.query(models.Patient).filter(models.Patient.id.in_(patient_ids)).delete(
            synchronize_session=False
        )

    if registration_emails:
        db.query(models.RegistrationRequest).filter(
            models.RegistrationRequest.email.in_(registration_emails)
        ).delete(synchronize_session=False)

    if emails:
        db.query(models.AuditLog).filter(
            models.AuditLog.user_email.in_(emails)
        ).delete(synchronize_session=False)
        db.query(models.User).filter(models.User.email.in_(emails)).delete(
            synchronize_session=False
        )

    db.commit()


def unique_email(prefix: str) -> str:
    return f"{prefix}-{uuid4().hex[:10]}@example.com"


def create_user(db, cleanup, role: str, email: str | None = None) -> models.User:
    user_email = email or unique_email(role)
    user = models.User(
        public_id=f"TEST-{uuid4().hex[:8].upper()}",
        email=user_email,
        full_name=f"Test {role.title()}",
        role=role,
        password_hash=hash_password(TEST_PASSWORD),
        status="active",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    cleanup["emails"].append(user.email)

    return user


def create_patient(
    db,
    cleanup,
    *,
    name: str,
    doctor_id: int,
    nurse_id: int | None = None,
    user_id: int | None = None,
) -> models.Patient:
    patient = models.Patient(
        user_id=user_id,
        primary_doctor_id=doctor_id,
        assigned_nurse_id=nurse_id,
        name=name,
        age=44,
        condition="General Monitoring",
        risk_level="Low",
        last_checkup=datetime.now().date().isoformat(),
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)

    cleanup["patient_ids"].append(patient.id)

    return patient


def login_token(client: TestClient, email: str) -> str:
    response = client.post(
        "/auth/login",
        json={"email": email, "password": TEST_PASSWORD},
    )

    assert response.status_code == 200

    return response.json()["access_token"]


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_admin_only_routes_reject_doctor_and_allow_admin(client, db, cleanup):
    admin = create_user(db, cleanup, "admin")
    doctor = create_user(db, cleanup, "doctor")

    admin_token = login_token(client, admin.email)
    doctor_token = login_token(client, doctor.email)

    protected_paths = [
        "/admin/users/",
        "/registration-requests/",
        "/audit/",
        "/metrics",
    ]

    for path in protected_paths:
        doctor_response = client.get(path, headers=auth_header(doctor_token))
        assert doctor_response.status_code == 403

        admin_response = client.get(path, headers=auth_header(admin_token))
        assert admin_response.status_code == 200


def test_registration_request_is_public_but_review_is_admin_only(
    client,
    db,
    cleanup,
):
    admin = create_user(db, cleanup, "admin")
    doctor = create_user(db, cleanup, "doctor")
    request_email = unique_email("requested-nurse")
    cleanup["registration_emails"].append(request_email)

    create_response = client.post(
        "/registration-requests/",
        json={
            "email": request_email,
            "full_name": "Requested Nurse",
            "role": "nurse",
            "password": TEST_PASSWORD,
        },
    )

    assert create_response.status_code == 200

    public_review_response = client.get("/registration-requests/")
    assert public_review_response.status_code == 401

    doctor_token = login_token(client, doctor.email)
    doctor_review_response = client.get(
        "/registration-requests/",
        headers=auth_header(doctor_token),
    )
    assert doctor_review_response.status_code == 403

    admin_token = login_token(client, admin.email)
    admin_review_response = client.get(
        "/registration-requests/",
        headers=auth_header(admin_token),
    )

    assert admin_review_response.status_code == 200
    assert any(
        item["email"] == request_email
        for item in admin_review_response.json()
    )


def test_patient_assignment_blocks_other_doctors_and_patients(client, db, cleanup):
    doctor_one = create_user(db, cleanup, "doctor")
    doctor_two = create_user(db, cleanup, "doctor")
    nurse = create_user(db, cleanup, "nurse")
    patient_user = create_user(db, cleanup, "patient")

    patient_one = create_patient(
        db,
        cleanup,
        name="Assigned Patient One",
        doctor_id=doctor_one.id,
        nurse_id=nurse.id,
        user_id=patient_user.id,
    )
    patient_two = create_patient(
        db,
        cleanup,
        name="Assigned Patient Two",
        doctor_id=doctor_two.id,
        nurse_id=nurse.id,
    )

    doctor_one_token = login_token(client, doctor_one.email)
    patient_token = login_token(client, patient_user.email)

    own_patient_response = client.get(
        f"/patients/{patient_one.id}",
        headers=auth_header(doctor_one_token),
    )
    other_patient_response = client.get(
        f"/patients/{patient_two.id}",
        headers=auth_header(doctor_one_token),
    )
    other_vitals_response = client.get(
        f"/vitals/{patient_two.id}",
        headers=auth_header(doctor_one_token),
    )

    assert own_patient_response.status_code == 200
    assert other_patient_response.status_code == 404
    assert other_vitals_response.status_code == 404

    patient_own_response = client.get(
        f"/patients/{patient_one.id}",
        headers=auth_header(patient_token),
    )
    patient_other_response = client.get(
        f"/patients/{patient_two.id}",
        headers=auth_header(patient_token),
    )

    assert patient_own_response.status_code == 200
    assert patient_other_response.status_code == 404
