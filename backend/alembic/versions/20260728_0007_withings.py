"""Add Withings connections and external measurement identity."""

from alembic import op
import sqlalchemy as sa

revision = "20260728_0007"
down_revision = "20260728_0006"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "vitals",
        sa.Column("source", sa.String(), nullable=False, server_default="manual"),
    )
    op.add_column("vitals", sa.Column("external_id", sa.String(), nullable=True))
    op.create_index(
        "ix_vitals_external_id", "vitals", ["external_id"], unique=True
    )
    op.create_table(
        "withings_connections",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "patient_id",
            sa.Integer(),
            sa.ForeignKey("patients.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column(
            "connected_by_user_id",
            sa.Integer(),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("withings_userid", sa.String(), nullable=False, unique=True),
        sa.Column("access_token_encrypted", sa.String(), nullable=False),
        sa.Column("refresh_token_encrypted", sa.String(), nullable=False),
        sa.Column("token_expires_at", sa.DateTime(), nullable=False),
        sa.Column("scopes", sa.String(), nullable=True),
        sa.Column("last_sync_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index(
        "ix_withings_connections_patient_id",
        "withings_connections",
        ["patient_id"],
    )
    op.create_index(
        "ix_withings_connections_withings_userid",
        "withings_connections",
        ["withings_userid"],
    )


def downgrade():
    op.drop_table("withings_connections")
    op.drop_index("ix_vitals_external_id", table_name="vitals")
    op.drop_column("vitals", "external_id")
    op.drop_column("vitals", "source")
