"""Cascade authentication sessions when a user is deleted."""

from alembic import op

revision = "20260728_0006"
down_revision = "20260728_0005"
branch_labels = None
depends_on = None


def upgrade():
    op.drop_constraint(
        "auth_sessions_user_id_fkey", "auth_sessions", type_="foreignkey"
    )
    op.create_foreign_key(
        "auth_sessions_user_id_fkey",
        "auth_sessions",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade():
    op.drop_constraint(
        "auth_sessions_user_id_fkey", "auth_sessions", type_="foreignkey"
    )
    op.create_foreign_key(
        "auth_sessions_user_id_fkey",
        "auth_sessions",
        "users",
        ["user_id"],
        ["id"],
    )
