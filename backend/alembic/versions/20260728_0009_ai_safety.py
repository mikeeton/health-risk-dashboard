"""Add encrypted AI memory and feedback metadata."""

from alembic import op
import sqlalchemy as sa

revision = "20260728_0009"
down_revision = "20260728_0008"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "ai_conversation_memories",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "patient_id",
            sa.Integer(),
            sa.ForeignKey("patients.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("encrypted_history", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.String(), nullable=False),
        sa.UniqueConstraint(
            "user_id",
            "patient_id",
            name="uq_ai_memory_user_patient",
        ),
    )
    op.create_index(
        "ix_ai_conversation_memories_id",
        "ai_conversation_memories",
        ["id"],
    )
    op.create_table(
        "ai_feedback",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "patient_id",
            sa.Integer(),
            sa.ForeignKey("patients.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("response_id", sa.String(), nullable=False),
        sa.Column("rating", sa.String(), nullable=False),
        sa.Column("comment", sa.String(), nullable=True),
        sa.Column("created_at", sa.String(), nullable=False),
    )
    op.create_index("ix_ai_feedback_id", "ai_feedback", ["id"])
    op.create_index(
        "ix_ai_feedback_response_id",
        "ai_feedback",
        ["response_id"],
    )


def downgrade():
    op.drop_table("ai_feedback")
    op.drop_table("ai_conversation_memories")
