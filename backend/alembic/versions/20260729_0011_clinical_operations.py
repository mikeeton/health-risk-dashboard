"""Add clinical operations and granular administration.

Revision ID: 20260729_0011
Revises: 20260729_0010
"""

from alembic import op
import sqlalchemy as sa

revision = "20260729_0011"
down_revision = "20260729_0010"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "investigation_orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("ordered_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("investigation_type", sa.String(), nullable=False),
        sa.Column("code", sa.String(), nullable=True),
        sa.Column("code_system", sa.String(), nullable=True),
        sa.Column("priority", sa.String(), nullable=False, server_default="routine"),
        sa.Column("status", sa.String(), nullable=False, server_default="ordered"),
        sa.Column("instructions", sa.Text(), nullable=True),
        sa.Column("result", sa.Text(), nullable=True),
        sa.Column("reference_range", sa.String(), nullable=True),
        sa.Column("abnormal_flag", sa.String(), nullable=True),
        sa.Column("ordered_at", sa.DateTime(), nullable=False),
        sa.Column("resulted_at", sa.DateTime(), nullable=True),
    )
    op.create_table(
        "nursing_assessments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("nurse_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("assessment_type", sa.String(), nullable=False),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column("findings_json", sa.Text(), nullable=False),
        sa.Column("escalation_required", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "observation_schedules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("assigned_to_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("metric", sa.String(), nullable=False),
        sa.Column("frequency_minutes", sa.Integer(), nullable=False),
        sa.Column("next_due_at", sa.DateTime(), nullable=False),
        sa.Column("escalation_minutes", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
    )
    op.create_table(
        "organisation_units",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("unit_type", sa.String(), nullable=False),
        sa.Column("parent_id", sa.Integer(), sa.ForeignKey("organisation_units.id"), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "role_permissions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("permission", sa.String(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.UniqueConstraint("role", "permission", name="uq_role_permission"),
    )
    op.create_table(
        "notification_rules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("severity", sa.String(), nullable=False),
        sa.Column("escalation_minutes", sa.Integer(), nullable=False),
        sa.Column("target_role", sa.String(), nullable=False),
        sa.Column("template", sa.Text(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )


def downgrade():
    for table in (
        "notification_rules",
        "role_permissions",
        "organisation_units",
        "observation_schedules",
        "nursing_assessments",
        "investigation_orders",
    ):
        op.drop_table(table)
