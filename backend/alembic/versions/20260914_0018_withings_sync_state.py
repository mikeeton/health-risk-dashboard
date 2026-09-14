"""Add explicit Withings synchronization state.

Revision ID: 20260914_0018
Revises: 20260807_0017
"""

from alembic import op
import sqlalchemy as sa


revision = "20260914_0018"
down_revision = "20260807_0017"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "withings_connections",
        sa.Column("last_successful_sync", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "withings_connections",
        sa.Column("last_error_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "withings_connections",
        sa.Column("last_error_code", sa.String(), nullable=True),
    )
    op.add_column(
        "withings_connections",
        sa.Column("last_error_message", sa.Text(), nullable=True),
    )
    op.execute(
        "UPDATE withings_connections "
        "SET last_successful_sync = last_sync_at "
        "WHERE last_sync_at IS NOT NULL"
    )


def downgrade():
    op.drop_column("withings_connections", "last_error_message")
    op.drop_column("withings_connections", "last_error_code")
    op.drop_column("withings_connections", "last_error_at")
    op.drop_column("withings_connections", "last_successful_sync")
