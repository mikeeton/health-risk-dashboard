"""Add persisted administrator-controlled system settings.

Revision ID: 20260731_0015
Revises: 20260729_0014
"""
from alembic import op
import sqlalchemy as sa

revision = "20260731_0015"
down_revision = "20260729_0014"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "system_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(), nullable=False),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("updated_by_user_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("key", name="uq_system_settings_key"),
    )
    op.create_index("ix_system_settings_key", "system_settings", ["key"], unique=True)


def downgrade():
    op.drop_index("ix_system_settings_key", table_name="system_settings")
    op.drop_table("system_settings")
