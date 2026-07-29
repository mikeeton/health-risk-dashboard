"""Add encrypted TOTP MFA secret.

Revision ID: 20260729_0012
Revises: 20260729_0011
"""

from alembic import op
import sqlalchemy as sa

revision = "20260729_0012"
down_revision = "20260729_0011"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("mfa_secret_encrypted", sa.String(), nullable=True))


def downgrade():
    op.drop_column("users", "mfa_secret_encrypted")
