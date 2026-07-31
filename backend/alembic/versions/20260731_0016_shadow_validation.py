"""Add shadow validation, structured alerts, and model governance evidence.

Revision ID: 20260731_0016
Revises: 20260731_0015
"""
from alembic import op
import sqlalchemy as sa

revision = "20260731_0016"
down_revision = "20260731_0015"
branch_labels = None
depends_on = None


def upgrade():
    additions = {
        "alert_type": sa.Column("alert_type", sa.String(), nullable=False, server_default="clinical_review"),
        "predicted_risk_level": sa.Column("predicted_risk_level", sa.String(), nullable=True),
        "probability": sa.Column("probability", sa.Float(), nullable=True),
        "confidence": sa.Column("confidence", sa.Float(), nullable=True),
        "prediction_window_hours": sa.Column("prediction_window_hours", sa.Integer(), nullable=True),
        "model_version": sa.Column("model_version", sa.String(), nullable=True),
        "evidence_json": sa.Column("evidence_json", sa.Text(), nullable=True),
        "shap_json": sa.Column("shap_json", sa.Text(), nullable=True),
        "data_quality_json": sa.Column("data_quality_json", sa.Text(), nullable=True),
        "missing_information_json": sa.Column("missing_information_json", sa.Text(), nullable=True),
        "recommended_checks_json": sa.Column("recommended_checks_json", sa.Text(), nullable=True),
        "escalation_conditions_json": sa.Column("escalation_conditions_json", sa.Text(), nullable=True),
        "contact_status": sa.Column("contact_status", sa.String(), nullable=False, server_default="not_contacted"),
        "intervention": sa.Column("intervention", sa.Text(), nullable=True),
        "duplicate_updates": sa.Column("duplicate_updates", sa.Integer(), nullable=False, server_default="0"),
    }
    for column in additions.values():
        op.add_column("review_cases", column)
    op.create_table(
        "model_prediction_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("patient_id", sa.Integer(), nullable=False),
        sa.Column("vital_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("window_end", sa.DateTime(), nullable=False),
        sa.Column("probability", sa.Float(), nullable=False),
        sa.Column("threshold", sa.Float(), nullable=False),
        sa.Column("predicted_positive", sa.Boolean(), nullable=False),
        sa.Column("consecutive_positive_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("mode", sa.String(), nullable=False),
        sa.Column("model_version", sa.String(), nullable=False),
        sa.Column("shap_json", sa.Text(), nullable=True),
        sa.Column("data_quality_json", sa.Text(), nullable=True),
        sa.Column("drift_score", sa.Float(), nullable=True),
        sa.Column("outcome_observed", sa.Boolean(), nullable=True),
        sa.Column("outcome_recorded_at", sa.DateTime(), nullable=True),
        sa.Column("classification", sa.String(), nullable=True),
        sa.Column("notified", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["vital_id"], ["vitals.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_model_prediction_patient", "model_prediction_records", ["patient_id"])
    op.create_index("ix_model_prediction_created", "model_prediction_records", ["created_at"])
    op.create_index("ix_model_prediction_window", "model_prediction_records", ["window_end"])
    op.create_table(
        "model_governance_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("model_version", sa.String(), nullable=True),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("settings_json", sa.Text(), nullable=True),
        sa.Column("actor_user_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="SET NULL"),
    )


def downgrade():
    op.drop_table("model_governance_events")
    op.drop_index("ix_model_prediction_window", table_name="model_prediction_records")
    op.drop_index("ix_model_prediction_created", table_name="model_prediction_records")
    op.drop_index("ix_model_prediction_patient", table_name="model_prediction_records")
    op.drop_table("model_prediction_records")
    for name in ("duplicate_updates", "intervention", "contact_status", "escalation_conditions_json", "recommended_checks_json", "missing_information_json", "data_quality_json", "shap_json", "evidence_json", "model_version", "prediction_window_hours", "confidence", "probability", "predicted_risk_level", "alert_type"):
        op.drop_column("review_cases", name)
