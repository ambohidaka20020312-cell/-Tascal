"""add onboarding_completed to users

Revision ID: 005_user_onboarding
Revises: 003_task_templates
Create Date: 2026-06-03 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "005_user_onboarding"
down_revision = "003_task_templates"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "users",
        sa.Column("onboarding_completed", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade():
    op.drop_column("users", "onboarding_completed")
