"""add workflow database constraints

Revision ID: 20260623_0004
Revises: 20260621_0003
Create Date: 2026-06-23
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260623_0004"
down_revision: Union[str, None] = "20260621_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def table_exists(table_name: str) -> bool:
    return sa.inspect(op.get_bind()).has_table(table_name)


def index_exists(table_name: str, index_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    if not inspector.has_table(table_name):
        return False
    return index_name in {index["name"] for index in inspector.get_indexes(table_name)}


def upgrade() -> None:
    if table_exists("patient_staff_assignments"):
        op.execute(
            """
            WITH ranked AS (
                SELECT
                    id,
                    row_number() OVER (
                        PARTITION BY patient_id, staff_user_id, role
                        ORDER BY id
                    ) AS row_number
                FROM patient_staff_assignments
                WHERE status = 'active'
            )
            UPDATE patient_staff_assignments
            SET status = 'removed'
            WHERE id IN (SELECT id FROM ranked WHERE row_number > 1)
            """
        )

        if not index_exists(
            "patient_staff_assignments",
            "uq_active_patient_staff_assignment",
        ):
            op.create_index(
                "uq_active_patient_staff_assignment",
                "patient_staff_assignments",
                ["patient_id", "staff_user_id", "role"],
                unique=True,
                postgresql_where=sa.text("status = 'active'"),
            )

    if table_exists("referral_requests"):
        op.execute(
            """
            WITH ranked AS (
                SELECT
                    id,
                    row_number() OVER (
                        PARTITION BY
                            patient_id,
                            referring_user_id,
                            COALESCE(receiving_user_id, 0),
                            COALESCE(receiving_department, '')
                        ORDER BY id
                    ) AS row_number
                FROM referral_requests
                WHERE status = 'pending'
            )
            UPDATE referral_requests
            SET status = 'superseded'
            WHERE id IN (SELECT id FROM ranked WHERE row_number > 1)
            """
        )

        if not index_exists("referral_requests", "uq_pending_referral_request"):
            op.execute(
                """
                CREATE UNIQUE INDEX uq_pending_referral_request
                ON referral_requests (
                    patient_id,
                    referring_user_id,
                    COALESCE(receiving_user_id, 0),
                    COALESCE(receiving_department, '')
                )
                WHERE status = 'pending'
                """
            )

    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'ck_users_role'
            ) THEN
                ALTER TABLE users
                ADD CONSTRAINT ck_users_role
                CHECK (role IN ('admin', 'doctor', 'nurse', 'patient')) NOT VALID;
            END IF;
        END $$;
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'ck_users_status'
            ) THEN
                ALTER TABLE users
                ADD CONSTRAINT ck_users_status
                CHECK (status IS NULL OR status IN ('active', 'suspended')) NOT VALID;
            END IF;
        END $$;
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'ck_referral_status'
            ) THEN
                ALTER TABLE referral_requests
                ADD CONSTRAINT ck_referral_status
                CHECK (
                    status IS NULL OR status IN (
                        'pending', 'approved', 'rejected', 'more_info', 'superseded'
                    )
                ) NOT VALID;
            END IF;
        END $$;
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'ck_assignment_status'
            ) THEN
                ALTER TABLE patient_staff_assignments
                ADD CONSTRAINT ck_assignment_status
                CHECK (status IS NULL OR status IN ('active', 'removed')) NOT VALID;
            END IF;
        END $$;
        """
    )


def downgrade() -> None:
    for table_name, constraint_name in [
        ("patient_staff_assignments", "ck_assignment_status"),
        ("referral_requests", "ck_referral_status"),
        ("users", "ck_users_status"),
        ("users", "ck_users_role"),
    ]:
        if table_exists(table_name):
            op.execute(
                f"ALTER TABLE {table_name} DROP CONSTRAINT IF EXISTS {constraint_name}"
            )

    if index_exists("referral_requests", "uq_pending_referral_request"):
        op.drop_index("uq_pending_referral_request", table_name="referral_requests")

    if index_exists(
        "patient_staff_assignments",
        "uq_active_patient_staff_assignment",
    ):
        op.drop_index(
            "uq_active_patient_staff_assignment",
            table_name="patient_staff_assignments",
        )
