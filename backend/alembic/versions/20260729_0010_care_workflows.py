"""Add multi-role care, security, consent, and operations workflows.

Revision ID: 20260729_0010
Revises: 20260728_0009
"""

from alembic import op
import sqlalchemy as sa


revision = "20260729_0010"
down_revision = "20260728_0009"
branch_labels = None
depends_on = None


def upgrade():
    for name, column in (
        ("phone", sa.Column("phone", sa.String(), nullable=True)),
        ("job_title", sa.Column("job_title", sa.String(), nullable=True)),
        ("department", sa.Column("department", sa.String(), nullable=True)),
        ("organisation", sa.Column("organisation", sa.String(), nullable=True)),
        ("mfa_enabled", sa.Column("mfa_enabled", sa.Boolean(), nullable=False, server_default=sa.false())),
        ("hospital_id", sa.Column("hospital_id", sa.Integer(), nullable=True)),
        ("last_login_at", sa.Column("last_login_at", sa.DateTime(), nullable=True)),
    ):
        op.add_column("users", column)

    for name, column in (
        ("date_of_birth", sa.Column("date_of_birth", sa.String(), nullable=True)),
        ("gender", sa.Column("gender", sa.String(), nullable=True)),
        ("address", sa.Column("address", sa.Text(), nullable=True)),
        ("phone", sa.Column("phone", sa.String(), nullable=True)),
        ("emergency_contact_name", sa.Column("emergency_contact_name", sa.String(), nullable=True)),
        ("emergency_contact_phone", sa.Column("emergency_contact_phone", sa.String(), nullable=True)),
        ("gp_name", sa.Column("gp_name", sa.String(), nullable=True)),
        ("gp_practice", sa.Column("gp_practice", sa.String(), nullable=True)),
        ("allergies", sa.Column("allergies", sa.Text(), nullable=True)),
        ("hospital_id", sa.Column("hospital_id", sa.Integer(), nullable=True)),
    ):
        op.add_column("patients", column)

    op.add_column("vitals", sa.Column("verification_status", sa.String(), nullable=False, server_default="unverified"))
    op.add_column("vitals", sa.Column("recorded_by_user_id", sa.Integer(), nullable=True))
    op.add_column("vitals", sa.Column("corrected_from_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_vitals_recorded_by", "vitals", "users", ["recorded_by_user_id"], ["id"])
    op.create_foreign_key("fk_vitals_corrected_from", "vitals", "vitals", ["corrected_from_id"], ["id"])

    for column in (
        sa.Column("owner_user_id", sa.Integer(), nullable=True),
        sa.Column("acknowledged_at", sa.String(), nullable=True),
        sa.Column("resolved_at", sa.String(), nullable=True),
        sa.Column("resolution_reason", sa.Text(), nullable=True),
        sa.Column("escalation_due_at", sa.String(), nullable=True),
    ):
        op.add_column("review_cases", column)
    op.create_foreign_key("fk_review_owner", "review_cases", "users", ["owner_user_id"], ["id"])

    for column in (
        sa.Column("prescriber_user_id", sa.Integer(), nullable=True),
        sa.Column("start_date", sa.String(), nullable=True),
        sa.Column("end_date", sa.String(), nullable=True),
        sa.Column("route", sa.String(), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
    ):
        op.add_column("medications", column)
    op.create_foreign_key("fk_medication_prescriber", "medications", "users", ["prescriber_user_id"], ["id"])

    for column in (
        sa.Column("specialist_response", sa.Text(), nullable=True),
        sa.Column("outcome", sa.Text(), nullable=True),
        sa.Column("completed_at", sa.String(), nullable=True),
    ):
        op.add_column("referral_requests", column)

    op.create_table(
        "appointments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("clinician_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("starts_at", sa.DateTime(), nullable=False, index=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("appointment_type", sa.String(), nullable=False),
        sa.Column("location", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="scheduled"),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("cancellation_reason", sa.Text(), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "care_messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("sender_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("recipient_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("subject", sa.String(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("read_at", sa.DateTime(), nullable=True),
    )
    op.create_table(
        "care_tasks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("assigned_to_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(), nullable=False, server_default="general"),
        sa.Column("priority", sa.String(), nullable=False, server_default="medium"),
        sa.Column("due_at", sa.DateTime(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="open"),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("completion_note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "consent_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("consent_type", sa.String(), nullable=False),
        sa.Column("granted", sa.Boolean(), nullable=False),
        sa.Column("policy_version", sa.String(), nullable=False),
        sa.Column("recorded_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("recorded_at", sa.DateTime(), nullable=False),
        sa.Column("withdrawn_at", sa.DateTime(), nullable=True),
    )
    op.create_table(
        "clinical_documents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("author_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("document_type", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("subjective", sa.Text(), nullable=True),
        sa.Column("objective", sa.Text(), nullable=True),
        sa.Column("assessment", sa.Text(), nullable=True),
        sa.Column("plan", sa.Text(), nullable=True),
        sa.Column("terminology_code", sa.String(), nullable=True),
        sa.Column("terminology_system", sa.String(), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("parent_document_id", sa.Integer(), sa.ForeignKey("clinical_documents.id"), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="draft"),
        sa.Column("signed_at", sa.DateTime(), nullable=True),
        sa.Column("cosigned_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("patient_visible", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "medication_administrations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("medication_id", sa.Integer(), sa.ForeignKey("medications.id", ondelete="CASCADE"), nullable=False),
        sa.Column("administered_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("witness_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(), nullable=False),
        sa.Column("administered_at", sa.DateTime(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
    )
    op.create_table(
        "patient_reported_outcomes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("outcome_type", sa.String(), nullable=False),
        sa.Column("severity", sa.Integer(), nullable=True),
        sa.Column("response", sa.Text(), nullable=False),
        sa.Column("recorded_at", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "data_rights_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("request_type", sa.String(), nullable=False),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="submitted"),
        sa.Column("submitted_at", sa.DateTime(), nullable=False),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.Column("resolution_note", sa.Text(), nullable=True),
    )
    op.create_table(
        "system_incidents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("incident_type", sa.String(), nullable=False),
        sa.Column("severity", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="open"),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
    )


def downgrade():
    for table in (
        "system_incidents", "data_rights_requests", "patient_reported_outcomes",
        "medication_administrations", "clinical_documents", "consent_records",
        "care_tasks", "care_messages", "appointments",
    ):
        op.drop_table(table)
    for column in ("specialist_response", "outcome", "completed_at"):
        op.drop_column("referral_requests", column)
    op.drop_constraint("fk_medication_prescriber", "medications", type_="foreignkey")
    for column in ("prescriber_user_id", "start_date", "end_date", "route", "active"):
        op.drop_column("medications", column)
    op.drop_constraint("fk_review_owner", "review_cases", type_="foreignkey")
    for column in ("owner_user_id", "acknowledged_at", "resolved_at", "resolution_reason", "escalation_due_at"):
        op.drop_column("review_cases", column)
    op.drop_constraint("fk_vitals_corrected_from", "vitals", type_="foreignkey")
    op.drop_constraint("fk_vitals_recorded_by", "vitals", type_="foreignkey")
    for column in ("verification_status", "recorded_by_user_id", "corrected_from_id"):
        op.drop_column("vitals", column)
    for column in ("date_of_birth", "gender", "address", "phone", "emergency_contact_name", "emergency_contact_phone", "gp_name", "gp_practice", "allergies", "hospital_id"):
        op.drop_column("patients", column)
    for column in ("phone", "job_title", "department", "organisation", "mfa_enabled", "hospital_id", "last_login_at"):
        op.drop_column("users", column)
