"""add staff assignments

Revision ID: 20260621_0002
Revises: 20260621_0001
Create Date: 2026-06-21
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260621_0002"
down_revision: Union[str, None] = "20260621_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    return sa.inspect(bind).has_table(table_name)


def upgrade() -> None:
    if not table_exists("patient_staff_assignments"):
        op.create_table(
            "patient_staff_assignments",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "patient_id",
                sa.Integer(),
                sa.ForeignKey("patients.id"),
                nullable=False,
            ),
            sa.Column(
                "staff_user_id",
                sa.Integer(),
                sa.ForeignKey("users.id"),
                nullable=False,
            ),
            sa.Column("role", sa.String(), nullable=False),
            sa.Column("status", sa.String(), nullable=True),
            sa.Column("assigned_at", sa.String(), nullable=False),
            sa.Column(
                "assigned_by_user_id",
                sa.Integer(),
                sa.ForeignKey("users.id"),
                nullable=True,
            ),
        )
        op.create_index(
            "ix_patient_staff_assignments_id",
            "patient_staff_assignments",
            ["id"],
        )
        op.create_index(
            "ix_patient_staff_assignments_patient_id",
            "patient_staff_assignments",
            ["patient_id"],
        )
        op.create_index(
            "ix_patient_staff_assignments_staff_user_id",
            "patient_staff_assignments",
            ["staff_user_id"],
        )

    op.execute(
        """
        INSERT INTO patient_staff_assignments (
            patient_id,
            staff_user_id,
            role,
            status,
            assigned_at,
            assigned_by_user_id
        )
        SELECT
            patients.id,
            patients.primary_doctor_id,
            'doctor',
            'active',
            NOW()::text,
            NULL
        FROM patients
        WHERE patients.primary_doctor_id IS NOT NULL
          AND NOT EXISTS (
              SELECT 1
              FROM patient_staff_assignments existing
              WHERE existing.patient_id = patients.id
                AND existing.staff_user_id = patients.primary_doctor_id
                AND existing.role = 'doctor'
          )
        """
    )

    op.execute(
        """
        INSERT INTO patient_staff_assignments (
            patient_id,
            staff_user_id,
            role,
            status,
            assigned_at,
            assigned_by_user_id
        )
        SELECT
            patients.id,
            patients.assigned_nurse_id,
            'nurse',
            'active',
            NOW()::text,
            NULL
        FROM patients
        WHERE patients.assigned_nurse_id IS NOT NULL
          AND NOT EXISTS (
              SELECT 1
              FROM patient_staff_assignments existing
              WHERE existing.patient_id = patients.id
                AND existing.staff_user_id = patients.assigned_nurse_id
                AND existing.role = 'nurse'
          )
        """
    )


def downgrade() -> None:
    if table_exists("patient_staff_assignments"):
        op.drop_index(
            "ix_patient_staff_assignments_staff_user_id",
            table_name="patient_staff_assignments",
        )
        op.drop_index(
            "ix_patient_staff_assignments_patient_id",
            table_name="patient_staff_assignments",
        )
        op.drop_index(
            "ix_patient_staff_assignments_id",
            table_name="patient_staff_assignments",
        )
        op.drop_table("patient_staff_assignments")
