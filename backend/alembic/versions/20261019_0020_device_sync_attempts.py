"""Retain patient-scoped provider sync attempts and outcome counts.

Revision ID: 20261019_0020
Revises: 20261019_0019
"""

from alembic import op
import sqlalchemy as sa

revision = "20261019_0020"
down_revision = "20261019_0019"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "device_sync_attempts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("attempted_at", sa.DateTime(), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("state", sa.String(), nullable=False),
        sa.Column("accepted_complete", sa.Integer(), nullable=False),
        sa.Column("accepted_partial", sa.Integer(), nullable=False),
        sa.Column("rejected", sa.Integer(), nullable=False),
        sa.Column("error_code", sa.String(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
    )
    op.create_index("ix_device_sync_attempts_patient_id", "device_sync_attempts", ["patient_id"])


def downgrade():
    op.drop_index("ix_device_sync_attempts_patient_id", table_name="device_sync_attempts")
    op.drop_table("device_sync_attempts")
