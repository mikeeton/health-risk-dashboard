"""baseline schema

Revision ID: 20260621_0001
Revises:
Create Date: 2026-06-21
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260621_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    return sa.inspect(bind).has_table(table_name)


def column_exists(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table(table_name):
        return False

    return column_name in {
        column["name"]
        for column in inspector.get_columns(table_name)
    }


def add_column_if_missing(table_name: str, column: sa.Column):
    if not column_exists(table_name, column.name):
        op.add_column(table_name, column)


def upgrade() -> None:
    if not table_exists("users"):
        op.create_table(
            "users",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("public_id", sa.String(), nullable=True),
            sa.Column("email", sa.String(), nullable=False),
            sa.Column("full_name", sa.String(), nullable=False),
            sa.Column("role", sa.String(), nullable=False),
            sa.Column("password_hash", sa.String(), nullable=False),
            sa.Column("status", sa.String(), nullable=True),
            sa.UniqueConstraint("email"),
            sa.UniqueConstraint("public_id"),
        )
        op.create_index("ix_users_id", "users", ["id"])
        op.create_index("ix_users_email", "users", ["email"])
    else:
        add_column_if_missing("users", sa.Column("public_id", sa.String()))
        add_column_if_missing(
            "users",
            sa.Column("status", sa.String(), server_default="active"),
        )

    if not table_exists("patients"):
        op.create_table(
            "patients",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id")),
            sa.Column("primary_doctor_id", sa.Integer(), sa.ForeignKey("users.id")),
            sa.Column("assigned_nurse_id", sa.Integer(), sa.ForeignKey("users.id")),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("age", sa.Integer(), nullable=False),
            sa.Column("condition", sa.String(), nullable=False),
            sa.Column("risk_level", sa.String(), nullable=True),
            sa.Column("last_checkup", sa.String(), nullable=True),
        )
        op.create_index("ix_patients_id", "patients", ["id"])
    else:
        add_column_if_missing("patients", sa.Column("user_id", sa.Integer()))
        add_column_if_missing(
            "patients",
            sa.Column("primary_doctor_id", sa.Integer()),
        )
        add_column_if_missing(
            "patients",
            sa.Column("assigned_nurse_id", sa.Integer()),
        )

    if not table_exists("vitals"):
        op.create_table(
            "vitals",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "patient_id",
                sa.Integer(),
                sa.ForeignKey("patients.id"),
                nullable=False,
            ),
            sa.Column("timestamp", sa.String(), nullable=False),
            sa.Column("heart_rate", sa.Integer(), nullable=False),
            sa.Column("spo2", sa.Float(), nullable=False),
            sa.Column("systolic_bp", sa.Integer(), nullable=False),
            sa.Column("diastolic_bp", sa.Integer(), nullable=False),
            sa.Column("steps", sa.Integer(), nullable=False),
            sa.Column("sleep_hours", sa.Float(), nullable=False),
            sa.Column("active_minutes", sa.Integer(), nullable=False),
            sa.Column("calories", sa.Integer(), nullable=False),
            sa.Column("risk_score", sa.Integer(), nullable=False),
            sa.Column("activity_state", sa.String(), nullable=False),
        )
        op.create_index("ix_vitals_id", "vitals", ["id"])

    if not table_exists("review_cases"):
        op.create_table(
            "review_cases",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "patient_id",
                sa.Integer(),
                sa.ForeignKey("patients.id"),
                nullable=False,
            ),
            sa.Column("patient_name", sa.String(), nullable=False),
            sa.Column("risk_level", sa.String(), nullable=False),
            sa.Column("risk_score", sa.Integer(), nullable=False),
            sa.Column("status", sa.String(), nullable=True),
            sa.Column("note", sa.String(), nullable=True),
            sa.Column("created_at", sa.String(), nullable=False),
            sa.Column("updated_at", sa.String(), nullable=True),
        )
        op.create_index("ix_review_cases_id", "review_cases", ["id"])

    if not table_exists("audit_logs"):
        op.create_table(
            "audit_logs",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_email", sa.String(), nullable=True),
            sa.Column("action", sa.String(), nullable=False),
            sa.Column("entity", sa.String(), nullable=False),
            sa.Column("entity_id", sa.String(), nullable=True),
            sa.Column("timestamp", sa.DateTime(), nullable=True),
        )
        op.create_index("ix_audit_logs_id", "audit_logs", ["id"])

    if not table_exists("medications"):
        op.create_table(
            "medications",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "patient_id",
                sa.Integer(),
                sa.ForeignKey("patients.id"),
                nullable=False,
            ),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("dosage", sa.String(), nullable=False),
            sa.Column("schedule_time", sa.String(), nullable=False),
            sa.Column("status", sa.String(), nullable=True),
            sa.Column("notes", sa.String(), nullable=True),
        )
        op.create_index("ix_medications_id", "medications", ["id"])

    if not table_exists("patient_events"):
        op.create_table(
            "patient_events",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "patient_id",
                sa.Integer(),
                sa.ForeignKey("patients.id"),
                nullable=False,
            ),
            sa.Column("event_type", sa.String(), nullable=False),
            sa.Column("title", sa.String(), nullable=False),
            sa.Column("description", sa.String(), nullable=True),
            sa.Column("timestamp", sa.String(), nullable=False),
        )
        op.create_index("ix_patient_events_id", "patient_events", ["id"])

    if not table_exists("notifications"):
        op.create_table(
            "notifications",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_email", sa.String(), nullable=True),
            sa.Column("title", sa.String(), nullable=False),
            sa.Column("message", sa.String(), nullable=False),
            sa.Column("type", sa.String(), nullable=True),
            sa.Column("is_read", sa.String(), nullable=True),
            sa.Column("created_at", sa.String(), nullable=False),
        )
        op.create_index("ix_notifications_id", "notifications", ["id"])

    if not table_exists("registration_requests"):
        op.create_table(
            "registration_requests",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("email", sa.String(), nullable=False),
            sa.Column("full_name", sa.String(), nullable=False),
            sa.Column("role", sa.String(), nullable=False),
            sa.Column("password_hash", sa.String(), nullable=False),
            sa.Column("status", sa.String(), nullable=True),
            sa.Column("created_at", sa.String(), nullable=False),
            sa.Column("age", sa.Integer(), nullable=True),
            sa.Column("gender", sa.String(), nullable=True),
            sa.Column("conditions", sa.String(), nullable=True),
            sa.Column("medication_notes", sa.String(), nullable=True),
            sa.Column("lifestyle_notes", sa.String(), nullable=True),
            sa.UniqueConstraint("email"),
        )
        op.create_index(
            "ix_registration_requests_id",
            "registration_requests",
            ["id"],
        )
    else:
        add_column_if_missing(
            "registration_requests",
            sa.Column("age", sa.Integer()),
        )
        add_column_if_missing(
            "registration_requests",
            sa.Column("gender", sa.String()),
        )
        add_column_if_missing(
            "registration_requests",
            sa.Column("conditions", sa.String()),
        )
        add_column_if_missing(
            "registration_requests",
            sa.Column("medication_notes", sa.String()),
        )
        add_column_if_missing(
            "registration_requests",
            sa.Column("lifestyle_notes", sa.String()),
        )

    if not table_exists("wearable_devices"):
        op.create_table(
            "wearable_devices",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "patient_id",
                sa.Integer(),
                sa.ForeignKey("patients.id"),
                nullable=False,
            ),
            sa.Column("device_name", sa.String(), nullable=False),
            sa.Column("manufacturer", sa.String(), nullable=False),
            sa.Column("device_type", sa.String(), nullable=True),
            sa.Column("last_sync", sa.String(), nullable=True),
            sa.Column("is_connected", sa.String(), nullable=True),
        )
        op.create_index("ix_wearable_devices_id", "wearable_devices", ["id"])


def downgrade() -> None:
    pass
