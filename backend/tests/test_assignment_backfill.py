"""Legacy care-team migration must never reactivate removed access."""

from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

import models


def test_backfill_adds_unrepresented_staff_but_preserves_revocation(tmp_path, monkeypatch):
    engine = create_engine(f"sqlite:///{tmp_path / 'assignments.db'}")
    models.Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()
    doctor = models.User(email="legacy-doctor@example.test", full_name="Legacy Doctor", role="doctor", password_hash="x", status="active")
    nurse = models.User(email="legacy-nurse@example.test", full_name="Legacy Nurse", role="nurse", password_hash="x", status="active")
    db.add_all([doctor, nurse])
    db.flush()
    missing = models.Patient(name="Unmigrated", age=60, condition="Test", risk_level="Low", primary_doctor_id=doctor.id, assigned_nurse_id=nurse.id)
    revoked = models.Patient(name="Revoked", age=60, condition="Test", risk_level="Low", primary_doctor_id=doctor.id)
    db.add_all([missing, revoked])
    db.flush()
    db.add(models.PatientStaffAssignment(patient_id=revoked.id, staff_user_id=doctor.id, role="doctor", status="removed", assigned_at="2026-01-01T00:00:00Z"))
    db.commit()

    path = Path(__file__).resolve().parents[1] / "alembic" / "versions" / "20261109_0021_authoritative_staff_assignments.py"
    spec = spec_from_file_location("assignment_migration", path)
    migration = module_from_spec(spec)
    spec.loader.exec_module(migration)
    monkeypatch.setattr(migration.op, "execute", lambda sql: db.execute(text(sql)))
    migration.upgrade()
    db.commit()
    assert {(row.role, row.staff_user_id, row.status) for row in db.query(models.PatientStaffAssignment).filter_by(patient_id=missing.id)} == {
        ("doctor", doctor.id, "active"), ("nurse", nurse.id, "active"),
    }
    assert [(row.staff_user_id, row.status) for row in db.query(models.PatientStaffAssignment).filter_by(patient_id=revoked.id)] == [(doctor.id, "removed")]
    migration.upgrade()
    db.commit()
    assert db.query(models.PatientStaffAssignment).count() == 3
    db.close()
    engine.dispose()
