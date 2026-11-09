"""Store sparse device observations without manufacturing missing vital fields.

Revision ID: 20261019_0019
Revises: 20260914_0018
"""

from alembic import op
import sqlalchemy as sa

revision = "20261019_0019"
down_revision = "20260914_0018"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "device_observations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("external_id", sa.String(), nullable=False),
        sa.Column("measured_at", sa.String(), nullable=False),
        sa.Column("received_at", sa.DateTime(), nullable=False),
        sa.Column("measurements", sa.JSON(), nullable=False),
        sa.Column("missing_fields", sa.JSON(), nullable=False),
        sa.Column("assessment_state", sa.String(), nullable=False),
    )
    op.create_index("ix_device_observations_patient_id", "device_observations", ["patient_id"])
    op.create_index("ix_device_observations_external_id", "device_observations", ["external_id"], unique=True)
    op.create_table(
        "vital_assessments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("vital_id", sa.Integer(), sa.ForeignKey("vitals.id", ondelete="CASCADE"), nullable=False),
        sa.Column("state", sa.String(), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("last_error", sa.String(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_vital_assessments_vital_id", "vital_assessments", ["vital_id"], unique=True)
    op.execute(
        "INSERT INTO vital_assessments (vital_id, state, attempts, updated_at) "
        "SELECT id, 'legacy_unknown', 0, CURRENT_TIMESTAMP FROM vitals"
    )


def downgrade():
    op.drop_index("ix_vital_assessments_vital_id", table_name="vital_assessments")
    op.drop_table("vital_assessments")
    op.drop_index("ix_device_observations_external_id", table_name="device_observations")
    op.drop_index("ix_device_observations_patient_id", table_name="device_observations")
    op.drop_table("device_observations")
