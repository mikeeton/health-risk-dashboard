"""Add rotating authentication sessions."""

from alembic import op
import sqlalchemy as sa

revision = "20260728_0005"
down_revision = "20260623_0004"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("refresh_jti_hash", sa.String(), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_auth_sessions_user_id", "auth_sessions", ["user_id"])
    op.create_index(
        "ix_auth_sessions_refresh_jti_hash",
        "auth_sessions",
        ["refresh_jti_hash"],
        unique=True,
    )


def downgrade():
    op.drop_table("auth_sessions")
