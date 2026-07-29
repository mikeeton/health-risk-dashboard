"""Make password reset requester deletion safe.

Revision ID: 20260729_0014
Revises: 20260729_0013
"""

from alembic import op

revision = "20260729_0014"
down_revision = "20260729_0013"
branch_labels = None
depends_on = None


def upgrade():
    op.drop_constraint(
        "password_reset_tokens_requested_by_user_id_fkey",
        "password_reset_tokens",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "password_reset_tokens_requested_by_user_id_fkey",
        "password_reset_tokens",
        "users",
        ["requested_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade():
    op.drop_constraint(
        "password_reset_tokens_requested_by_user_id_fkey",
        "password_reset_tokens",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "password_reset_tokens_requested_by_user_id_fkey",
        "password_reset_tokens",
        "users",
        ["requested_by_user_id"],
        ["id"],
    )
