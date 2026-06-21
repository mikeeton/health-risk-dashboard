"""add referrals and richer notifications

Revision ID: 20260621_0003
Revises: 20260621_0002
Create Date: 2026-06-21
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260621_0003"
down_revision: Union[str, None] = "20260621_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    return sa.inspect(bind).has_table(table_name)


def column_exists(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return inspector.has_table(table_name) and column_name in {
        column["name"] for column in inspector.get_columns(table_name)
    }


def add_column_if_missing(table_name: str, column: sa.Column) -> None:
    if not column_exists(table_name, column.name):
        op.add_column(table_name, column)


def upgrade() -> None:
    add_column_if_missing("notifications", sa.Column("target_role", sa.String()))
    add_column_if_missing("notifications", sa.Column("link", sa.String()))
    add_column_if_missing("notifications", sa.Column("related_entity", sa.String()))
    add_column_if_missing("notifications", sa.Column("related_entity_id", sa.String()))

    if not table_exists("referral_requests"):
        op.create_table(
            "referral_requests",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "patient_id",
                sa.Integer(),
                sa.ForeignKey("patients.id"),
                nullable=False,
            ),
            sa.Column(
                "referring_user_id",
                sa.Integer(),
                sa.ForeignKey("users.id"),
                nullable=False,
            ),
            sa.Column(
                "receiving_user_id",
                sa.Integer(),
                sa.ForeignKey("users.id"),
                nullable=True,
            ),
            sa.Column("receiving_department", sa.String(), nullable=True),
            sa.Column("reason", sa.String(), nullable=False),
            sa.Column("urgency", sa.String(), nullable=False),
            sa.Column("notes", sa.String(), nullable=True),
            sa.Column("status", sa.String(), nullable=True),
            sa.Column("admin_note", sa.String(), nullable=True),
            sa.Column("requested_at", sa.String(), nullable=False),
            sa.Column("reviewed_at", sa.String(), nullable=True),
            sa.Column(
                "reviewed_by_user_id",
                sa.Integer(),
                sa.ForeignKey("users.id"),
                nullable=True,
            ),
        )
        op.create_index("ix_referral_requests_id", "referral_requests", ["id"])
        op.create_index(
            "ix_referral_requests_patient_id",
            "referral_requests",
            ["patient_id"],
        )
        op.create_index(
            "ix_referral_requests_status",
            "referral_requests",
            ["status"],
        )


def downgrade() -> None:
    if table_exists("referral_requests"):
        op.drop_index("ix_referral_requests_status", table_name="referral_requests")
        op.drop_index("ix_referral_requests_patient_id", table_name="referral_requests")
        op.drop_index("ix_referral_requests_id", table_name="referral_requests")
        op.drop_table("referral_requests")

    for column_name in [
        "related_entity_id",
        "related_entity",
        "link",
        "target_role",
    ]:
        if column_exists("notifications", column_name):
            op.drop_column("notifications", column_name)
