"""Backfill unrepresented legacy staff before assignment-only access.

Existing assignment history, including removed rows, always wins over a
legacy patient pointer. This migration never reactivates a revoked assignment.
"""

from alembic import op

revision = "20261109_0021"
down_revision = "20261019_0020"
branch_labels = None
depends_on = None


def upgrade():
    for role, column in (("doctor", "primary_doctor_id"), ("nurse", "assigned_nurse_id")):
        op.execute(
            f"""
            INSERT INTO patient_staff_assignments
                (patient_id, staff_user_id, role, status, assigned_at, assigned_by_user_id)
            SELECT p.id, p.{column}, '{role}', 'active', CAST(CURRENT_TIMESTAMP AS TEXT), NULL
            FROM patients p
            JOIN users u ON u.id = p.{column}
            WHERE p.{column} IS NOT NULL
              AND u.role = '{role}'
              AND (u.status = 'active' OR u.status IS NULL)
              AND NOT EXISTS (
                  SELECT 1 FROM patient_staff_assignments a
                  WHERE a.patient_id = p.id AND a.role = '{role}'
              )
            """
        )


def downgrade():
    # Backfilled care-team history cannot safely be distinguished from later
    # administrator assignments. A downgrade must not delete access records.
    pass
