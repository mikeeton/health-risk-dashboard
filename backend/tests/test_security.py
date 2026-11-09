from datetime import datetime, timezone
from uuid import uuid4
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import pytest
import pyotp
from starlette.websockets import WebSocketDisconnect
from fastapi.testclient import TestClient

import main as main_module
import models
from auth_utils import create_access_token, create_websocket_ticket, hash_password, verify_password
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
        db.query(models.PatientStaffAssignment).filter(
            models.PatientStaffAssignment.patient_id.in_(patient_ids)
        ).delete(synchronize_session=False)
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
        user_ids = [
            user_id
            for (user_id,) in db.query(models.User.id)
            .filter(models.User.email.in_(emails))
            .all()
        ]

        if user_ids:
            db.query(models.PatientStaffAssignment).filter(
                models.PatientStaffAssignment.staff_user_id.in_(user_ids)
            ).delete(synchronize_session=False)

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
    db.flush()
    for staff_id, role in ((doctor_id, "doctor"), (nurse_id, "nurse")):
        if staff_id is not None:
            db.add(models.PatientStaffAssignment(
                patient_id=patient.id,
                staff_user_id=staff_id,
                role=role,
                status="active",
                assigned_at=datetime.now(timezone.utc).isoformat(),
            ))
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


def test_notification_read_receipts_are_private_per_user(client, db, cleanup):
    first_doctor = create_user(db, cleanup, "doctor")
    second_doctor = create_user(db, cleanup, "doctor")
    notification = models.Notification(
        user_email=None,
        target_role="doctor",
        title="Shared clinical update",
        message="A role-wide update for receipt isolation testing.",
        type="assignment",
        is_read="false",
        created_at=datetime.now().isoformat(timespec="seconds"),
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)

    try:
        first_headers = auth_header(login_token(client, first_doctor.email))
        second_headers = auth_header(login_token(client, second_doctor.email))

        first_inbox = client.get(
            "/notifications/?status=unread", headers=first_headers
        )
        second_inbox = client.get(
            "/notifications/?status=unread", headers=second_headers
        )
        assert first_inbox.status_code == 200
        assert second_inbox.status_code == 200
        assert notification.id in {item["id"] for item in first_inbox.json()}
        assert notification.id in {item["id"] for item in second_inbox.json()}

        marked = client.patch(
            f"/notifications/{notification.id}/read", headers=first_headers
        )
        assert marked.status_code == 200
        assert marked.json()["is_read"] == "true"
        assert marked.json()["read_at"]

        first_after = client.get(
            "/notifications/?status=unread", headers=first_headers
        )
        second_after = client.get(
            "/notifications/?status=unread", headers=second_headers
        )
        first_history = client.get(
            "/notifications/?status=read", headers=first_headers
        )

        assert notification.id not in {item["id"] for item in first_after.json()}
        assert notification.id in {item["id"] for item in second_after.json()}
        assert notification.id in {item["id"] for item in first_history.json()}
    finally:
        db.query(models.NotificationRead).filter(
            models.NotificationRead.notification_id == notification.id
        ).delete(synchronize_session=False)
        db.query(models.Notification).filter(
            models.Notification.id == notification.id
        ).delete(synchronize_session=False)
        db.commit()


def test_complete_role_based_clinical_workflow(
    client, db, cleanup, monkeypatch
):
    """Exercise the deployment-critical admin, doctor, nurse, and patient path."""

    from routes import assistant as assistant_routes

    admin = create_user(db, cleanup, "admin")
    doctor = create_user(db, cleanup, "doctor")
    receiving_doctor = create_user(db, cleanup, "doctor")
    nurse = create_user(db, cleanup, "nurse")
    patient_user = create_user(db, cleanup, "patient")
    patient = create_patient(
        db,
        cleanup,
        name=f"Workflow Patient {uuid4().hex[:8]}",
        doctor_id=doctor.id,
        user_id=patient_user.id,
    )

    def role_header(user: models.User) -> dict[str, str]:
        return auth_header(
            create_access_token(
                {"sub": user.email, "role": user.role, "user_id": user.id}
            )
        )

    # Login itself is exercised through the public endpoint; the remaining
    # role tokens are minted directly so this single workflow does not consume
    # the suite's brute-force rate-limit budget.
    admin_headers = auth_header(login_token(client, admin.email))
    doctor_headers = role_header(doctor)
    nurse_headers = role_header(nurse)
    patient_headers = role_header(patient_user)

    created_ids: dict[str, int] = {}
    try:
        assignment = client.post(
            "/admin/assignments/",
            headers=admin_headers,
            json={
                "patient_id": patient.id,
                "staff_user_id": nurse.id,
                "role": "nurse",
            },
        )
        assert assignment.status_code == 200
        created_ids["assignment"] = assignment.json()["id"]

        timestamp = datetime.now(timezone.utc).isoformat(timespec="microseconds")
        vital = client.post(
            "/vitals/",
            headers=doctor_headers,
            json={
                "patient_id": patient.id,
                "timestamp": timestamp,
                "heart_rate": 82,
                "spo2": 97,
                "systolic_bp": 124,
                "diastolic_bp": 78,
                "steps": 4200,
                "sleep_hours": 7.2,
                "active_minutes": 35,
                "calories": 1900,
                "risk_score": 2,
                "activity_state": "resting",
            },
        )
        assert vital.status_code == 200
        created_ids["vital"] = vital.json()["id"]
        assert client.get(
            f"/vitals/{patient.id}", headers=nurse_headers
        ).status_code == 200
        assert client.get(
            f"/vitals/{patient.id}", headers=patient_headers
        ).status_code == 200
        assert client.post(
            "/vitals/",
            headers=patient_headers,
            json={
                "patient_id": patient.id,
                    "timestamp": timestamp,
                "heart_rate": 82,
                "spo2": 97,
                "systolic_bp": 124,
                "diastolic_bp": 78,
                "steps": 0,
                "sleep_hours": 7,
                "active_minutes": 0,
                "calories": 1800,
                "risk_score": 2,
                "activity_state": "resting",
            },
        ).status_code == 403

        medication = client.post(
            "/medications/",
            headers=nurse_headers,
            json={
                "patient_id": patient.id,
                "name": "Workflow Medicine",
                "dosage": "5 mg",
                "schedule_time": "09:00",
                "status": "Due",
                "notes": "Role workflow verification",
            },
        )
        assert medication.status_code == 200
        created_ids["medication"] = medication.json()["id"]
        assert client.patch(
            f"/medications/{created_ids['medication']}",
            headers=nurse_headers,
            json={"status": "Taken", "notes": "Verified"},
        ).status_code == 200
        assert client.get(
            f"/medications/{patient.id}", headers=patient_headers
        ).status_code == 200

        monkeypatch.setattr(
            assistant_routes,
            "request_structured_ai",
            lambda **kwargs: (
                assistant_routes.deterministic_output(kwargs["context"]),
                "deployment-test-model",
                "available",
            ),
        )
        summary = client.get(
            f"/assistant/patient-summary/{patient.id}",
            headers=doctor_headers,
        )
        assert summary.status_code == 200
        assert summary.json()["model_used"] == "deployment-test-model"
        handover = client.get(
            f"/assistant/handover/{patient.id}", headers=doctor_headers
        )
        assert handover.status_code == 200

        referral = client.post(
            "/referrals/",
            headers=doctor_headers,
            json={
                "patient_id": patient.id,
                "receiving_user_id": receiving_doctor.id,
                "reason": "Specialist review requested",
                "urgency": "Medium",
                "notes": "Synthetic deployment workflow",
            },
        )
        assert referral.status_code == 200
        created_ids["referral"] = referral.json()["id"]
        receiving_doctor.status = "suspended"
        db.commit()
        blocked_approval = client.post(
            f"/referrals/{created_ids['referral']}/approve",
            headers=admin_headers,
            json={"admin_note": "Must recheck recipient"},
        )
        assert blocked_approval.status_code == 400
        db.refresh(receiving_doctor)
        receiving_doctor.status = "active"
        db.commit()
        approval = client.post(
            f"/referrals/{created_ids['referral']}/approve",
            headers=admin_headers,
            json={"admin_note": "Approved during deployment workflow"},
        )
        assert approval.status_code == 200
        assert approval.json()["status"] == "approved"

        receiving_headers = role_header(receiving_doctor)
        assert client.get(
            f"/patients/{patient.id}", headers=receiving_headers
        ).status_code == 200
        inbox = client.get(
            "/notifications/?status=unread", headers=receiving_headers
        )
        assert inbox.status_code == 200
        assert any(
            item["related_entity"] == "ReferralRequest"
            for item in inbox.json()
        )
    finally:
        db.rollback()
        db.query(models.NotificationRead).filter(
            models.NotificationRead.user_email.in_(
                [
                    admin.email,
                    doctor.email,
                    receiving_doctor.email,
                    nurse.email,
                    patient_user.email,
                ]
            )
        ).delete(synchronize_session=False)
        db.query(models.Notification).filter(
            models.Notification.user_email.in_(
                [
                    admin.email,
                    doctor.email,
                    receiving_doctor.email,
                    nurse.email,
                    patient_user.email,
                ]
            )
        ).delete(synchronize_session=False)
        if "referral" in created_ids:
            db.query(models.ReferralRequest).filter(
                models.ReferralRequest.id == created_ids["referral"]
            ).delete(synchronize_session=False)
        db.query(models.PatientStaffAssignment).filter(
            models.PatientStaffAssignment.patient_id == patient.id
        ).delete(synchronize_session=False)
        db.query(models.Medication).filter(
            models.Medication.patient_id == patient.id
        ).delete(synchronize_session=False)
        db.query(models.Vital).filter(
            models.Vital.patient_id == patient.id
        ).delete(synchronize_session=False)
        db.commit()


def test_notification_commit_publishes_cross_instance_invalidation(
    db, monkeypatch
):
    import notification_broadcast

    published: list[tuple[str, str]] = []

    class FakeRedis:
        def publish(self, channel: str, message: str):
            published.append((channel, message))

    monkeypatch.setattr(
        notification_broadcast,
        "_get_sync_client",
        lambda: FakeRedis(),
    )
    notification_broadcast.queue_notification_broadcast(db)
    db.commit()

    assert published == [
        (notification_broadcast.CHANNEL, "changed")
    ]


def test_ai_memory_is_encrypted_and_isolated_by_patient(db, cleanup):
    from routes import assistant as assistant_routes

    doctor = create_user(db, cleanup, "doctor")
    first_patient = create_patient(
        db,
        cleanup,
        name=f"Memory Patient A {uuid4().hex[:6]}",
        doctor_id=doctor.id,
    )
    second_patient = create_patient(
        db,
        cleanup,
        name=f"Memory Patient B {uuid4().hex[:6]}",
        doctor_id=doctor.id,
    )
    secret_text = "patient-a-private-conversation"
    try:
        assistant_routes.save_memory(
            db,
            doctor.id,
            first_patient.id,
            [{"role": "user", "content": secret_text}],
        )
        row = (
            db.query(models.AIConversationMemory)
            .filter(models.AIConversationMemory.user_id == doctor.id)
            .filter(models.AIConversationMemory.patient_id == first_patient.id)
            .one()
        )
        assert secret_text not in row.encrypted_history
        assert assistant_routes.load_memory(
            db, doctor.id, first_patient.id
        )[0]["content"] == secret_text
        assert assistant_routes.load_memory(
            db, doctor.id, second_patient.id
        ) == []
    finally:
        db.query(models.AIConversationMemory).filter(
            models.AIConversationMemory.user_id == doctor.id
        ).delete(synchronize_session=False)
        db.commit()


def test_admin_only_routes_reject_doctor_and_allow_admin(client, db, cleanup):
    admin = create_user(db, cleanup, "admin")
    doctor = create_user(db, cleanup, "doctor")

    admin_token = login_token(client, admin.email)
    doctor_token = login_token(client, doctor.email)

    protected_paths = [
        "/admin/users/",
        "/admin/assignments/",
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


def test_admin_cannot_read_or_delete_clinical_patient_records(client, db, cleanup):
    admin = create_user(db, cleanup, "admin")
    doctor = create_user(db, cleanup, "doctor")
    nurse = create_user(db, cleanup, "nurse")
    patient_user = create_user(db, cleanup, "patient")
    patient = create_patient(
        db,
        cleanup,
        name="Admin Hidden Patient",
        doctor_id=doctor.id,
        nurse_id=nurse.id,
        user_id=patient_user.id,
    )

    admin_token = login_token(client, admin.email)

    patient_list_response = client.get(
        "/patients/",
        headers=auth_header(admin_token),
    )
    patient_detail_response = client.get(
        f"/patients/{patient.id}",
        headers=auth_header(admin_token),
    )
    vitals_response = client.get(
        f"/vitals/{patient.id}",
        headers=auth_header(admin_token),
    )
    legacy_care_team_response = client.patch(
        f"/patients/{patient.id}/care-team",
        json={"primary_doctor_id": doctor.id},
        headers=auth_header(admin_token),
    )
    delete_response = client.delete(
        f"/patients/{patient.id}",
        headers=auth_header(admin_token),
    )

    assert patient_list_response.status_code == 200
    assert patient_list_response.json() == []
    assert patient_detail_response.status_code == 404
    assert vitals_response.status_code == 404
    assert legacy_care_team_response.status_code == 410
    assert delete_response.status_code == 403


def test_admin_staff_assignment_grants_and_removes_patient_access(client, db, cleanup):
    admin = create_user(db, cleanup, "admin")
    doctor_one = create_user(db, cleanup, "doctor")
    doctor_two = create_user(db, cleanup, "doctor")
    nurse = create_user(db, cleanup, "nurse")
    patient = create_patient(
        db,
        cleanup,
        name="Shared Care Patient",
        doctor_id=doctor_one.id,
        nurse_id=nurse.id,
    )

    admin_token = login_token(client, admin.email)
    doctor_two_token = login_token(client, doctor_two.email)

    denied_before_assignment = client.get(
        f"/patients/{patient.id}",
        headers=auth_header(doctor_two_token),
    )

    directory_response = client.get(
        "/admin/assignments/patients",
        headers=auth_header(admin_token),
    )
    doctor_directory_response = client.get(
        "/admin/assignments/patients",
        headers=auth_header(doctor_two_token),
    )
    assign_response = client.post(
        "/admin/assignments/",
        json={
            "patient_id": patient.id,
            "staff_user_id": doctor_two.id,
            "role": "doctor",
        },
        headers=auth_header(admin_token),
    )
    allowed_after_assignment = client.get(
        f"/patients/{patient.id}",
        headers=auth_header(doctor_two_token),
    )

    assert denied_before_assignment.status_code == 404
    assert directory_response.status_code == 200
    matching_patient = next(
        item for item in directory_response.json() if item["id"] == patient.id
    )
    assert set(matching_patient.keys()) == {
        "id",
        "name",
        "linked_user_id",
        "linked_user_email",
    }
    assert doctor_directory_response.status_code == 403
    assert assign_response.status_code == 200
    assert assign_response.json()["staff_user_id"] == doctor_two.id
    assert allowed_after_assignment.status_code == 200

    remove_response = client.delete(
        f"/admin/assignments/{assign_response.json()['id']}",
        headers=auth_header(admin_token),
    )
    denied_after_removal = client.get(
        f"/patients/{patient.id}",
        headers=auth_header(doctor_two_token),
    )

    assert remove_response.status_code == 200
    assert remove_response.json()["status"] == "removed"
    assert denied_after_removal.status_code == 404


def test_legacy_staff_columns_cannot_restore_revoked_access(client, db, cleanup):
    doctor = create_user(db, cleanup, "doctor")
    nurse = create_user(db, cleanup, "nurse")
    patient_user = create_user(db, cleanup, "patient")
    patient = create_patient(
        db, cleanup, name="Revoked Legacy Patient", doctor_id=doctor.id,
        nurse_id=nurse.id, user_id=patient_user.id,
    )
    assignment = db.query(models.PatientStaffAssignment).filter_by(
        patient_id=patient.id, staff_user_id=doctor.id, role="doctor"
    ).one()
    assignment.status = "removed"
    db.commit()
    assert patient.primary_doctor_id == doctor.id

    doctor_headers = auth_header(create_access_token({"sub": doctor.email, "role": doctor.role, "user_id": doctor.id}))
    patient_headers = auth_header(create_access_token({"sub": patient_user.email, "role": patient_user.role, "user_id": patient_user.id}))
    nurse_headers = auth_header(create_access_token({"sub": nurse.email, "role": nurse.role, "user_id": nurse.id}))
    for path in (
        f"/patients/{patient.id}", f"/vitals/{patient.id}",
        f"/events/{patient.id}", f"/care/team/{patient.id}",
        f"/care/export/{patient.id}",
    ):
        assert client.get(path, headers=doctor_headers).status_code == 404
    assert client.post(
        "/role-actions/doctor/clinical-note",
        json={"patient_id": patient.id, "title": "Revoked note", "description": "Must be denied"},
        headers=doctor_headers,
    ).status_code == 404
    assert doctor.id not in {item["id"] for item in client.get(
        f"/care/team/{patient.id}", headers=patient_headers,
    ).json()}
    assert client.post(
        "/care/appointments",
        json={"patient_id": patient.id, "clinician_user_id": doctor.id,
              "starts_at": "2026-12-01T10:00:00Z", "appointment_type": "Review"},
        headers=patient_headers,
    ).status_code == 400
    assert client.post(
        "/role-actions/nurse/raise-alert",
        json={"patient_id": patient.id, "note": "Review current observation"},
        headers=nurse_headers,
    ).status_code == 200
    assert db.query(models.Notification).filter_by(user_email=doctor.email, title="High-risk patient alert").count() == 0


def test_live_socket_permission_tracks_assignment_and_account_revocation(db, cleanup):
    doctor = create_user(db, cleanup, "doctor")
    other_doctor = create_user(db, cleanup, "doctor")
    patient = create_patient(db, cleanup, name="Socket Scope Patient", doctor_id=other_doctor.id)
    assignment = models.PatientStaffAssignment(
        patient_id=patient.id,
        staff_user_id=doctor.id,
        role="doctor",
        status="active",
        assigned_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(assignment)
    db.commit()

    assert main_module.live_socket_access_valid(doctor.id, patient.id)
    assignment.status = "removed"
    db.commit()
    assert not main_module.live_socket_access_valid(doctor.id, patient.id)

    assignment.status = "active"
    doctor.status = "suspended"
    db.commit()
    assert not main_module.live_socket_access_valid(doctor.id, patient.id)

    doctor.status = "active"
    doctor.role = "patient"
    db.commit()
    assert not main_module.live_socket_access_valid(doctor.id, patient.id)


def test_live_socket_closes_before_delivery_when_scope_is_revoked(client, db, cleanup, monkeypatch):
    doctor = create_user(db, cleanup, "doctor")
    patient = create_patient(db, cleanup, name="Socket Delivery Patient", doctor_id=doctor.id)
    ticket = create_websocket_ticket(doctor, "live_vitals", patient.id)
    queue = main_module.asyncio.Queue()
    queue.put_nowait({"patient_id": patient.id, "kind": "synthetic_test_event"})
    monkeypatch.setattr(main_module, "subscribe", lambda _patient_id: queue)
    monkeypatch.setattr(main_module, "live_socket_access_valid", lambda *_args: False)

    with client.websocket_connect(f"/ws/live/{patient.id}?ticket={ticket}") as socket:
        with pytest.raises(WebSocketDisconnect) as closed:
            socket.receive_json()
    assert closed.value.code == 1008


def test_device_observation_reads_respect_patient_scope(client, db, cleanup):
    first_doctor = create_user(db, cleanup, "doctor")
    second_doctor = create_user(db, cleanup, "doctor")
    first_patient_user = create_user(db, cleanup, "patient")
    second_patient_user = create_user(db, cleanup, "patient")
    first = create_patient(db, cleanup, name="First Device Patient", doctor_id=first_doctor.id, user_id=first_patient_user.id)
    second = create_patient(db, cleanup, name="Second Device Patient", doctor_id=second_doctor.id, user_id=second_patient_user.id)

    first_patient_headers = auth_header(create_access_token({"sub": first_patient_user.email, "role": "patient", "user_id": first_patient_user.id}))
    first_doctor_headers = auth_header(create_access_token({"sub": first_doctor.email, "role": "doctor", "user_id": first_doctor.id}))
    admin = create_user(db, cleanup, "admin")
    admin_headers = auth_header(create_access_token({"sub": admin.email, "role": "admin", "user_id": admin.id}))

    assert client.get(f"/integrations/withings/observations/{first.id}", headers=first_patient_headers).status_code == 200
    for headers in (first_patient_headers, first_doctor_headers, admin_headers):
        assert client.get(f"/integrations/withings/observations/{second.id}", headers=headers).status_code == 404


def test_clinician_actions_use_validated_payloads_and_block_admin(
    client,
    db,
    cleanup,
):
    admin = create_user(db, cleanup, "admin")
    doctor = create_user(db, cleanup, "doctor")
    nurse = create_user(db, cleanup, "nurse")
    patient_user = create_user(db, cleanup, "patient")
    patient = create_patient(
        db,
        cleanup,
        name="Clinical Action Patient",
        doctor_id=doctor.id,
        nurse_id=nurse.id,
        user_id=patient_user.id,
    )

    admin_token = login_token(client, admin.email)
    doctor_token = login_token(client, doctor.email)

    admin_note_response = client.post(
        "/role-actions/doctor/clinical-note",
        json={
            "patient_id": patient.id,
            "note_type": "Diagnosis",
            "title": "Admin diagnosis attempt",
            "description": "Admins should not be able to create clinical notes.",
        },
        headers=auth_header(admin_token),
    )
    invalid_note_response = client.post(
        "/role-actions/doctor/clinical-note",
        json={
            "patient_id": patient.id,
            "note_type": "Diagnosis",
            "title": "No",
            "description": "Bad",
        },
        headers=auth_header(doctor_token),
    )
    valid_note_response = client.post(
        "/role-actions/doctor/clinical-note",
        json={
            "patient_id": patient.id,
            "note_type": "Diagnosis",
            "title": "Hypertension review",
            "description": "Patient remains under observation with elevated blood pressure.",
        },
        headers=auth_header(doctor_token),
    )
    admin_history_response = client.get(
        f"/role-actions/doctor/patient-history/{patient.id}",
        headers=auth_header(admin_token),
    )
    admin_patient_records_response = client.get(
        f"/role-actions/patient/my-records/{patient.id}",
        headers=auth_header(admin_token),
    )

    assert admin_note_response.status_code == 403
    assert invalid_note_response.status_code == 422
    assert valid_note_response.status_code == 200
    assert valid_note_response.json()["event_type"] == "Diagnosis"
    assert admin_history_response.status_code == 403
    assert admin_patient_records_response.status_code == 403


def test_analytics_summary_scopes_audit_count_to_current_user(client, db, cleanup):
    doctor = create_user(db, cleanup, "doctor")
    other = create_user(db, cleanup, "nurse")
    db.add(models.AuditLog(
        user_email=other.email,
        action="TEST_EVENT",
        entity="Test",
        timestamp=datetime.now(timezone.utc).replace(tzinfo=None),
    ))
    db.commit()

    token = login_token(client, doctor.email)
    response = client.get("/analytics/system-summary", headers=auth_header(token))

    assert response.status_code == 200
    assert response.json()["audit_logs"] == db.query(models.AuditLog).filter(
        models.AuditLog.user_email == doctor.email
    ).count()
    assert db.query(models.AuditLog).count() > response.json()["audit_logs"]


def test_care_team_excludes_account_after_patient_role_changes(db, cleanup):
    from routes.care_workflows import active_care_user_ids

    doctor = create_user(db, cleanup, "doctor")
    patient_user = create_user(db, cleanup, "patient")
    patient = create_patient(
        db, cleanup, name=f"Role Changed {uuid4().hex[:8]}",
        doctor_id=doctor.id, user_id=patient_user.id,
    )
    assert patient_user.id in active_care_user_ids(db, patient)
    patient_user.role = "admin"
    db.commit()
    assert patient_user.id not in active_care_user_ids(db, patient)


def test_refresh_tokens_rotate_and_reuse_is_rejected(client, db, cleanup):
    user = create_user(db, cleanup, "doctor")
    login_response = client.post(
        "/auth/login",
        json={"email": user.email, "password": TEST_PASSWORD},
    )
    assert login_response.status_code == 200
    original_refresh = login_response.json()["refresh_token"]

    rotated = client.post(
        "/auth/refresh",
        json={"refresh_token": original_refresh},
    )
    assert rotated.status_code == 200
    assert rotated.json()["refresh_token"] != original_refresh

    replay = client.post(
        "/auth/refresh",
        json={"refresh_token": original_refresh},
    )
    assert replay.status_code == 401


def test_browser_refresh_cookie_is_http_only_and_requires_csrf(client, db, cleanup):
    user = create_user(db, cleanup, "doctor")
    login = client.post("/auth/login", headers={"X-Auth-Mode": "cookie"}, json={"email": user.email, "password": TEST_PASSWORD})
    assert login.status_code == 200
    assert login.json()["refresh_token"] is None
    assert "httponly" in login.headers["set-cookie"].lower()
    csrf = login.json()["csrf_token"]
    assert client.post("/auth/refresh", headers={"X-Auth-Mode": "cookie"}).status_code == 403
    rotated = client.post("/auth/refresh", headers={"X-Auth-Mode": "cookie", "X-CSRF-Token": csrf})
    assert rotated.status_code == 200
    assert rotated.json()["refresh_token"] is None
    assert rotated.json()["csrf_token"] != csrf
    assert client.post("/auth/logout", headers={"X-Auth-Mode": "cookie", "X-CSRF-Token": rotated.json()["csrf_token"]}).status_code == 204


def test_simultaneous_refresh_requests_rotate_only_once(client, db, cleanup):
    user = create_user(db, cleanup, "doctor")
    login = client.post("/auth/login", json={"email": user.email, "password": TEST_PASSWORD})
    token = login.json()["refresh_token"]
    barrier = Barrier(2)

    def refresh_once():
        with TestClient(app) as worker:
            barrier.wait(timeout=10)
            return worker.post("/auth/refresh", json={"refresh_token": token}).status_code

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(lambda _: refresh_once(), range(2)))
    assert sorted(results) == [200, 401]


def test_logout_revokes_access_token_and_socket_ticket(client, db, cleanup):
    user = create_user(db, cleanup, "doctor")
    patient = create_patient(db, cleanup, name="Socket Session Patient", doctor_id=user.id)
    login = client.post("/auth/login", json={"email": user.email, "password": TEST_PASSWORD})
    assert login.status_code == 200
    access = login.json()["access_token"]
    refresh = login.json()["refresh_token"]
    headers = auth_header(access)
    assert client.get("/care/account/profile", headers=headers).status_code == 200
    ticket = client.post("/auth/websocket-ticket", headers=headers, json={"audience": "notifications"})
    assert ticket.status_code == 200
    from auth_utils import decode_access_token, get_user_from_websocket_ticket, socket_session_is_active
    from routes import notifications
    access_payload = decode_access_token(access)
    session_jti = access_payload["session_jti"]
    ticket_expiry = decode_access_token(ticket.json()["ticket"])["exp"]
    assert main_module.live_socket_access_valid(user.id, patient.id, session_jti, ticket_expiry)
    assert notifications.notification_socket_signature(user.id, session_jti, ticket_expiry) is not None
    assert get_user_from_websocket_ticket(ticket.json()["ticket"], db, audience="notifications") is not None

    assert client.post("/auth/logout", json={"refresh_token": refresh}).status_code == 204
    assert client.get("/care/account/profile", headers=headers).status_code == 401
    assert get_user_from_websocket_ticket(ticket.json()["ticket"], db, audience="notifications") is None
    assert not main_module.live_socket_access_valid(user.id, patient.id, session_jti, ticket_expiry)
    assert notifications.notification_socket_signature(user.id, session_jti, ticket_expiry) is None
    assert not socket_session_is_active(db, user.id, None, 0)


def test_refresh_rotation_revokes_previous_access_token(client, db, cleanup):
    user = create_user(db, cleanup, "doctor")
    login = client.post("/auth/login", json={"email": user.email, "password": TEST_PASSWORD})
    assert login.status_code == 200
    old_access = login.json()["access_token"]
    rotated = client.post("/auth/refresh", json={"refresh_token": login.json()["refresh_token"]})
    assert rotated.status_code == 200
    assert client.get("/care/account/profile", headers=auth_header(old_access)).status_code == 401
    assert client.get("/care/account/profile", headers=auth_header(rotated.json()["access_token"])).status_code == 200


def test_direct_registration_is_disabled(client, db):
    response = client.post(
        "/auth/register",
        json={
            "email": "privilege-escalation@example.com",
            "full_name": "Unapproved Admin",
            "role": "admin",
            "password": TEST_PASSWORD,
        },
    )
    assert response.status_code == 403
    assert db.query(models.User).filter_by(email="privilege-escalation@example.com").first() is None


def test_approved_registration_creates_login_without_direct_registration(client, db, cleanup):
    admin = create_user(db, cleanup, "admin")
    email = unique_email("approved-nurse")
    cleanup["registration_emails"].append(email)
    requested = client.post("/registration-requests/", json={
        "email": email, "full_name": "Approved Nurse", "role": "nurse", "password": TEST_PASSWORD,
    })
    assert requested.status_code == 200
    assert db.query(models.User).filter_by(email=email).first() is None
    approved = client.post(
        f"/registration-requests/{requested.json()['id']}/approve",
        headers=auth_header(create_access_token({"sub": admin.email, "role": admin.role, "user_id": admin.id})),
    )
    assert approved.status_code == 200
    cleanup["emails"].append(email)
    approved_user = db.query(models.User).filter_by(email=email).one()
    assert approved_user.role == "nurse"
    assert verify_password(TEST_PASSWORD, approved_user.password_hash)


def test_weak_registration_password_is_rejected(client):
    response = client.post(
        "/registration-requests/",
        json={
            "email": "weak-password@example.com",
            "full_name": "Weak Password",
            "role": "patient",
            "password": "password",
        },
    )
    assert response.status_code == 422


def test_ai_question_uses_post_and_emergency_rule_bypasses_provider(
    client, db, cleanup
):
    doctor = create_user(db, cleanup, "doctor")
    patient = create_patient(
        db,
        cleanup,
        name="Private Patient Name",
        doctor_id=doctor.id,
    )
    token = login_token(client, doctor.email)

    get_response = client.get(
        f"/assistant/ask/{patient.id}?question=chest%20pain",
        headers=auth_header(token),
    )
    response = client.post(
        f"/assistant/ask/{patient.id}",
        json={"question": "I have severe chest pain and cannot breathe"},
        headers=auth_header(token),
    )

    assert get_response.status_code == 405
    assert response.status_code == 200
    assert response.json()["model_used"] == "deterministic-safety-rule"
    assert response.json()["requires_human_review"] is True
    assert "emergency services" in response.json()["answer"].lower()


def test_ai_context_is_pseudonymised(db, cleanup):
    from routes.assistant import build_patient_context

    doctor = create_user(db, cleanup, "doctor")
    patient = create_patient(
        db,
        cleanup,
        name="Never Send This Name",
        doctor_id=doctor.id,
    )
    context = build_patient_context(patient.id, db)

    assert "Never Send This Name" not in context
    assert f"patient-{patient.id}" in context


def test_withings_webhook_verification_and_unknown_notifications_are_safe(
    client, monkeypatch
):
    monkeypatch.setenv("WITHINGS_WEBHOOK_SECRET", "test-webhook-secret")
    assert client.head("/integrations/withings/webhook").status_code == 401
    assert client.head(
        "/integrations/withings/webhook?withings_token=wrong"
    ).status_code == 401
    assert client.head(
        "/integrations/withings/webhook?withings_token=test-webhook-secret"
    ).status_code == 204
    response = client.post(
        "/integrations/withings/webhook?withings_token=test-webhook-secret",
        content="userid=unknown&appli=4&startdate=1&enddate=2",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 204


def test_withings_connection_requires_complete_server_configuration(
    client, db, cleanup
):
    doctor = create_user(db, cleanup, "doctor")
    patient = create_patient(
        db,
        cleanup,
        name="Withings Test",
        doctor_id=doctor.id,
    )
    token = login_token(client, doctor.email)
    response = client.get(
        f"/integrations/withings/connect/{patient.id}",
        headers=auth_header(token),
    )
    assert response.status_code == 503


def test_care_workflows_enforce_assigned_patient_boundaries(client, db, cleanup):
    assigned_doctor = create_user(db, cleanup, "doctor")
    unrelated_doctor = create_user(db, cleanup, "doctor")
    patient_user = create_user(db, cleanup, "patient")
    patient = create_patient(
        db,
        cleanup,
        name="Care Workflow Patient",
        doctor_id=assigned_doctor.id,
        user_id=patient_user.id,
    )
    assigned_token = create_access_token({"sub": assigned_doctor.email, "role": "doctor", "user_id": assigned_doctor.id})
    unrelated_token = create_access_token({"sub": unrelated_doctor.email, "role": "doctor", "user_id": unrelated_doctor.id})
    patient_token = create_access_token({"sub": patient_user.email, "role": "patient", "user_id": patient_user.id})

    created = client.post(
        "/care/appointments",
        json={
            "patient_id": patient.id,
            "starts_at": "2026-08-01T10:00:00",
            "appointment_type": "Clinical review",
            "reason": "Review monitoring plan",
        },
        headers=auth_header(patient_token),
    )
    assert created.status_code == 200
    assert created.json()["status"] == "requested"

    assert client.get(
        f"/care/appointments/{patient.id}",
        headers=auth_header(assigned_token),
    ).status_code == 200
    assert client.get(
        f"/care/appointments/{patient.id}",
        headers=auth_header(unrelated_token),
    ).status_code == 404


def test_secure_messages_require_an_active_care_relationship(client, db, cleanup):
    doctor = create_user(db, cleanup, "doctor")
    outsider = create_user(db, cleanup, "nurse")
    patient_user = create_user(db, cleanup, "patient")
    patient = create_patient(
        db,
        cleanup,
        name="Secure Message Patient",
        doctor_id=doctor.id,
        user_id=patient_user.id,
    )
    patient_token = create_access_token({"sub": patient_user.email, "role": "patient", "user_id": patient_user.id})

    allowed = client.post(
        "/care/messages",
        json={
            "patient_id": patient.id,
            "recipient_user_id": doctor.id,
            "subject": "Care question",
            "body": "Please review my latest care instructions.",
        },
        headers=auth_header(patient_token),
    )
    denied = client.post(
        "/care/messages",
        json={
            "patient_id": patient.id,
            "recipient_user_id": outsider.id,
            "subject": "Should not send",
            "body": "This recipient is not assigned.",
        },
        headers=auth_header(patient_token),
    )

    assert allowed.status_code == 200
    assert denied.status_code == 400


def test_only_signed_shared_documents_are_visible_to_patients(client, db, cleanup):
    doctor = create_user(db, cleanup, "doctor")
    patient_user = create_user(db, cleanup, "patient")
    patient = create_patient(
        db,
        cleanup,
        name="Document Visibility Patient",
        doctor_id=doctor.id,
        user_id=patient_user.id,
    )
    doctor_token = create_access_token({"sub": doctor.email, "role": "doctor", "user_id": doctor.id})
    patient_token = create_access_token({"sub": patient_user.email, "role": "patient", "user_id": patient_user.id})
    draft = client.post(
        "/care/documents",
        json={
            "patient_id": patient.id,
            "document_type": "Report",
            "title": "Reviewed monitoring report",
            "assessment": "Stable based on reviewed observations.",
            "plan": "Continue the agreed monitoring plan.",
            "patient_visible": True,
        },
        headers=auth_header(doctor_token),
    )
    assert draft.status_code == 200
    assert client.get(
        f"/care/documents/{patient.id}",
        headers=auth_header(patient_token),
    ).json() == []

    signed = client.post(
        f"/care/documents/{draft.json()['id']}/sign",
        headers=auth_header(doctor_token),
    )
    visible = client.get(
        f"/care/documents/{patient.id}",
        headers=auth_header(patient_token),
    )
    assert signed.status_code == 200
    assert len(visible.json()) == 1
    assert visible.json()[0]["status"] == "signed"


def test_patient_controls_consent_and_can_export_only_own_record(client, db, cleanup):
    doctor = create_user(db, cleanup, "doctor")
    first_user = create_user(db, cleanup, "patient")
    second_user = create_user(db, cleanup, "patient")
    first = create_patient(
        db,
        cleanup,
        name="First Export Patient",
        doctor_id=doctor.id,
        user_id=first_user.id,
    )
    second = create_patient(
        db,
        cleanup,
        name="Second Export Patient",
        doctor_id=doctor.id,
        user_id=second_user.id,
    )
    first_token = create_access_token({"sub": first_user.email, "role": "patient", "user_id": first_user.id})
    consent = client.post(
        "/care/consents",
        json={
            "patient_id": first.id,
            "consent_type": "ai_processing",
            "granted": False,
            "policy_version": "2026-07",
        },
        headers=auth_header(first_token),
    )
    own_export = client.get(
        f"/care/export/{first.id}",
        headers=auth_header(first_token),
    )
    other_export = client.get(
        f"/care/export/{second.id}",
        headers=auth_header(first_token),
    )
    assert consent.status_code == 200
    assert consent.json()["granted"] is False
    assert own_export.status_code == 200
    assert other_export.status_code == 404


def test_totp_mfa_secret_is_encrypted_and_requires_confirmation(client, db, cleanup):
    user = create_user(db, cleanup, "doctor")
    token = create_access_token({"sub": user.email, "role": user.role, "user_id": user.id})
    enrolment = client.post(
        "/care/account/mfa/enrol",
        headers=auth_header(token),
    )
    assert enrolment.status_code == 200
    secret = enrolment.json()["secret"]
    db.refresh(user)
    assert secret not in user.mfa_secret_encrypted
    assert user.mfa_enabled is False

    confirmation = client.post(
        "/care/account/mfa/confirm",
        json={"code": pyotp.TOTP(secret).now()},
        headers=auth_header(token),
    )
    db.refresh(user)
    assert confirmation.status_code == 204
    assert user.mfa_enabled is True


def test_admin_password_reset_link_is_single_use_and_revokes_sessions(
    client, db, cleanup
):
    admin = create_user(db, cleanup, "admin")
    target = create_user(db, cleanup, "nurse")
    admin_token = create_access_token(
        {"sub": admin.email, "role": admin.role, "user_id": admin.id}
    )
    created = client.post(
        f"/admin/users/{target.id}/password-reset-link",
        headers=auth_header(admin_token),
    )
    assert created.status_code == 200
    raw_token = created.json()["reset_url"].split("token=", 1)[1]
    new_password = "ChangedSecurePassword987!"
    confirmed = client.post(
        "/auth/password-reset/confirm",
        json={"token": raw_token, "new_password": new_password},
    )
    replay = client.post(
        "/auth/password-reset/confirm",
        json={"token": raw_token, "new_password": "AnotherSecurePassword987!"},
    )
    db.refresh(target)
    assert confirmed.status_code == 204
    assert replay.status_code == 400
    assert verify_password(new_password, target.password_hash)


def test_doctor_patient_creation_does_not_auto_assign_nurses(client, db, cleanup):
    doctor = create_user(db, cleanup, "doctor")
    create_user(db, cleanup, "nurse")
    create_user(db, cleanup, "nurse")
    token = login_token(client, doctor.email)
    response = client.post(
        "/patients/",
        headers=auth_header(token),
        json={
            "name": f"Multi Nurse Patient {uuid4().hex[:8]}",
            "age": 45,
            "condition": "General Monitoring",
            "risk_level": "Low",
            "last_checkup": datetime.now().date().isoformat(),
        },
    )
    assert response.status_code == 200
    cleanup["patient_ids"].append(response.json()["id"])
    assert response.json()["assigned_nurse_id"] is None
    assert db.query(models.PatientStaffAssignment).filter(
        models.PatientStaffAssignment.patient_id == response.json()["id"],
        models.PatientStaffAssignment.role == "nurse",
    ).count() == 0
    same_name = client.post(
        "/patients/", headers=auth_header(token),
        json={
            "name": response.json()["name"],
            "age": 46,
            "condition": "Another record with a shared name",
            "risk_level": "Low",
            "last_checkup": datetime.now().date().isoformat(),
        },
    )
    assert same_name.status_code == 200
    cleanup["patient_ids"].append(same_name.json()["id"])


def test_doctor_cannot_link_patient_account_or_assign_other_staff(client, db, cleanup):
    doctor = create_user(db, cleanup, "doctor")
    other_doctor = create_user(db, cleanup, "doctor")
    nurse = create_user(db, cleanup, "nurse")
    patient_user = create_user(db, cleanup, "patient")
    token = login_token(client, doctor.email)
    name = f"Unauthorized Link {uuid4().hex[:8]}"
    base = {
        "name": name,
        "age": 45,
        "condition": "General Monitoring",
        "risk_level": "Low",
        "last_checkup": datetime.now().date().isoformat(),
    }
    for override in (
        {"user_id": patient_user.id},
        {"assigned_nurse_id": nurse.id},
        {"primary_doctor_id": other_doctor.id},
    ):
        response = client.post("/patients/", headers=auth_header(token), json={**base, **override})
        assert response.status_code == 403
    assert db.query(models.Patient).filter(models.Patient.name == name).count() == 0


def test_complete_extended_care_workspace_workflow(client, db, cleanup):
    admin = create_user(db, cleanup, "admin")
    doctor = create_user(db, cleanup, "doctor")
    nurse = create_user(db, cleanup, "nurse")
    patient_user = create_user(db, cleanup, "patient")
    patient = create_patient(
        db,
        cleanup,
        name=f"Extended Workflow {uuid4().hex[:8]}",
        doctor_id=doctor.id,
        nurse_id=nurse.id,
        user_id=patient_user.id,
    )
    medication = models.Medication(
        patient_id=patient.id,
        name="Workflow Tablet",
        dosage="10 mg",
        schedule_time="09:00",
        status="Due",
        notes="Extended workflow",
    )
    alert = models.ReviewCase(
        patient_id=patient.id,
        patient_name=patient.name,
        risk_level="High",
        risk_score=8,
        status="Open",
        note="Extended workflow alert",
        created_at=datetime.now().isoformat(),
    )
    db.add_all([medication, alert])
    db.commit()
    db.refresh(medication)
    db.refresh(alert)

    def headers(user):
        return auth_header(
            create_access_token(
                {"sub": user.email, "role": user.role, "user_id": user.id}
            )
        )

    admin_headers = headers(admin)
    doctor_headers = headers(doctor)
    nurse_headers = headers(nurse)
    patient_headers = headers(patient_user)

    team = client.get(f"/care/team/{patient.id}", headers=doctor_headers)
    assert team.status_code == 200
    assert {item["role"] for item in team.json()} == {"doctor", "nurse", "patient"}

    appointment = client.post(
        "/care/appointments",
        headers=patient_headers,
        json={
            "patient_id": patient.id,
            "starts_at": "2026-08-10T09:30:00",
            "appointment_type": "Monitoring review",
            "reason": "Discuss current readings",
        },
    )
    assert appointment.status_code == 200
    assert client.patch(
        f"/care/appointments/{appointment.json()['id']}",
        headers=doctor_headers,
        json={"status": "confirmed"},
    ).status_code == 200

    message = client.post(
        "/care/messages",
        headers=patient_headers,
        json={
            "patient_id": patient.id,
            "recipient_user_id": doctor.id,
            "subject": "Monitoring question",
            "body": "Please review the latest readings.",
        },
    )
    assert message.status_code == 200
    assert client.patch(
        f"/care/messages/{message.json()['id']}/read",
        headers=doctor_headers,
    ).status_code == 200

    task = client.post(
        "/care/tasks",
        headers=doctor_headers,
        json={
            "patient_id": patient.id,
            "assigned_to_user_id": nurse.id,
            "title": "Repeat observations",
            "priority": "high",
            "due_at": "2026-08-10T10:00:00",
        },
    )
    assert task.status_code == 200
    assert client.patch(
        f"/care/tasks/{task.json()['id']}",
        headers=nurse_headers,
        json={"status": "completed", "completion_note": "Observations repeated"},
    ).status_code == 200
    assert client.post(
        "/care/tasks",
        headers=patient_headers,
        json={
            "patient_id": patient.id,
            "assigned_to_user_id": patient_user.id,
            "title": "Forbidden self-created task",
            "priority": "low",
        },
    ).status_code == 403

    consent = client.post(
        "/care/consents",
        headers=patient_headers,
        json={
            "patient_id": patient.id,
            "consent_type": "ai_processing",
            "granted": True,
            "policy_version": "2026-07",
        },
    )
    assert consent.status_code == 200

    outcome = client.post(
        "/care/outcomes",
        headers=patient_headers,
        json={
            "patient_id": patient.id,
            "outcome_type": "pain score",
            "severity": 4,
            "response": "Mild intermittent discomfort.",
        },
    )
    assert outcome.status_code == 200

    document = client.post(
        "/care/documents",
        headers=doctor_headers,
        json={
            "patient_id": patient.id,
            "document_type": "SOAP Note",
            "title": "Extended workflow note",
            "subjective": "Patient reports mild discomfort.",
            "objective": "Reviewed observations.",
            "assessment": "Continue monitoring.",
            "plan": "Repeat observations.",
            "patient_visible": True,
        },
    )
    assert document.status_code == 200
    assert client.post(
        f"/care/documents/{document.json()['id']}/sign",
        headers=doctor_headers,
    ).status_code == 200
    patient_documents = client.get(
        f"/care/documents/{patient.id}",
        headers=patient_headers,
    )
    assert patient_documents.status_code == 200
    assert patient_documents.json()[0]["status"] == "signed"

    administration = client.post(
        "/care/medication-administrations",
        headers=nurse_headers,
        json={
            "patient_id": patient.id,
            "medication_id": medication.id,
            "scheduled_at": "2026-08-10T09:00:00",
            "status": "refused",
            "reason": "Patient declined after explanation",
        },
    )
    assert administration.status_code == 200
    assert client.post(
        "/care/medication-administrations",
        headers=nurse_headers,
        json={
            "patient_id": patient.id,
            "medication_id": medication.id,
            "scheduled_at": "2026-08-10T12:00:00",
            "status": "missed",
        },
    ).status_code == 422

    investigation = client.post(
        "/care/investigations",
        headers=doctor_headers,
        json={
            "patient_id": patient.id,
            "investigation_type": "Full blood count",
            "code": "58410-2",
            "code_system": "LOINC",
            "priority": "routine",
        },
    )
    assert investigation.status_code == 200
    assert client.patch(
        f"/care/investigations/{investigation.json()['id']}/result",
        headers=doctor_headers,
        json={
            "result": "Within stated reference range",
            "reference_range": "Local laboratory range",
            "abnormal_flag": "normal",
        },
    ).status_code == 200
    assert client.post(
        "/care/investigations",
        headers=nurse_headers,
        json={
            "patient_id": patient.id,
            "investigation_type": "Nurse cannot order",
        },
    ).status_code == 403

    assessment = client.post(
        "/care/nursing-assessments",
        headers=nurse_headers,
        json={
            "patient_id": patient.id,
            "assessment_type": "NEWS2",
            "score": 2,
            "findings": {"summary": "Low score; continue routine monitoring"},
            "escalation_required": False,
        },
    )
    assert assessment.status_code == 200

    schedule = client.post(
        "/care/observation-schedules",
        headers=doctor_headers,
        json={
            "patient_id": patient.id,
            "assigned_to_user_id": nurse.id,
            "metric": "Blood pressure",
            "frequency_minutes": 240,
            "next_due_at": "2026-08-10T12:00:00",
            "escalation_minutes": 30,
        },
    )
    assert schedule.status_code == 200

    assert client.patch(
        f"/care/alerts/{alert.id}",
        headers=nurse_headers,
        json={"action": "acknowledge", "owner_user_id": nurse.id},
    ).status_code == 200
    resolved = client.patch(
        f"/care/alerts/{alert.id}",
        headers=doctor_headers,
        json={"action": "resolve", "resolution_reason": "Reviewed and closed"},
    )
    assert resolved.status_code == 200
    assert resolved.json()["status"] == "Resolved"

    data_request = client.post(
        "/care/data-requests",
        headers=patient_headers,
        json={
            "patient_id": patient.id,
            "request_type": "correction",
            "details": "Please verify one demographic entry.",
        },
    )
    assert data_request.status_code == 200
    assert client.patch(
        f"/care/data-requests/{data_request.json()['id']}",
        headers=admin_headers,
        json={
            "status": "fulfilled",
            "resolution_note": "Demographic entry verified.",
        },
    ).status_code == 200

    record_export = client.get(
        f"/care/export/{patient.id}",
        headers=patient_headers,
    )
    assert record_export.status_code == 200
    assert record_export.json()["patient"]["id"] == patient.id
    operations = client.get("/care/admin/operations", headers=admin_headers)
    assert operations.status_code == 200
    assert operations.json()["services"]["database"] is True
