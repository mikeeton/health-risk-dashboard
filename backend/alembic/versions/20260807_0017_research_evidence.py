"""Add restricted research evidence records.

Revision ID: 20260807_0017
Revises: 20260731_0016
"""
from alembic import op
import sqlalchemy as sa

revision = "20260807_0017"
down_revision = "20260731_0016"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("usability_study_sessions", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("participant_code", sa.String(), nullable=False), sa.Column("participant_role", sa.String(), nullable=False), sa.Column("protocol_version", sa.String(), nullable=False), sa.Column("consent_confirmed", sa.Boolean(), nullable=False), sa.Column("ethics_reference", sa.String(), nullable=False), sa.Column("task_results_json", sa.Text(), nullable=False), sa.Column("sus_responses_json", sa.Text(), nullable=False), sa.Column("sus_score", sa.Float(), nullable=False), sa.Column("notes", sa.Text()), sa.Column("recorded_by_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL")), sa.Column("created_at", sa.DateTime(), nullable=False))
    op.create_index("ix_usability_participant_code", "usability_study_sessions", ["participant_code"])
    op.create_table("prospective_validation_outcomes", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("prediction_id", sa.Integer(), sa.ForeignKey("model_prediction_records.id", ondelete="CASCADE"), nullable=False), sa.Column("outcome_observed", sa.Boolean(), nullable=False), sa.Column("outcome_type", sa.String(), nullable=False), sa.Column("observed_at", sa.DateTime(), nullable=False), sa.Column("adjudication_status", sa.String(), nullable=False), sa.Column("adjudicator_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL")), sa.Column("notes", sa.Text()), sa.Column("created_at", sa.DateTime(), nullable=False), sa.UniqueConstraint("prediction_id", name="uq_prospective_prediction"))
    op.create_table("effectiveness_study_records", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("study_code", sa.String(), nullable=False), sa.Column("participant_code", sa.String(), nullable=False), sa.Column("study_arm", sa.String(), nullable=False), sa.Column("outcome_name", sa.String(), nullable=False), sa.Column("outcome_value", sa.Float(), nullable=False), sa.Column("unit", sa.String()), sa.Column("intervention_occurred", sa.Boolean(), nullable=False), sa.Column("protocol_deviation", sa.Boolean(), nullable=False), sa.Column("notes", sa.Text()), sa.Column("recorded_by_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL")), sa.Column("created_at", sa.DateTime(), nullable=False))
    op.create_index("ix_effectiveness_study_code", "effectiveness_study_records", ["study_code"])


def downgrade():
    op.drop_table("effectiveness_study_records")
    op.drop_table("prospective_validation_outcomes")
    op.drop_table("usability_study_sessions")
