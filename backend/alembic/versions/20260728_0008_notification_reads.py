"""Add per-user notification read receipts."""

from alembic import op
import sqlalchemy as sa

revision = "20260728_0008"
down_revision = "20260728_0007"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "notification_reads",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "notification_id",
            sa.Integer(),
            sa.ForeignKey("notifications.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("user_email", sa.String(), nullable=False),
        sa.Column("read_at", sa.String(), nullable=False),
        sa.UniqueConstraint(
            "notification_id",
            "user_email",
            name="uq_notification_reads_notification_user",
        ),
    )
    op.create_index(
        "ix_notification_reads_notification_id",
        "notification_reads",
        ["notification_id"],
    )
    op.create_index(
        "ix_notification_reads_user_email",
        "notification_reads",
        ["user_email"],
    )


def downgrade():
    op.drop_table("notification_reads")
