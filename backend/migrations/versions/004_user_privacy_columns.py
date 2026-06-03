"""add user privacy columns

Revision ID: 004
Revises: 003_task_templates
Create Date: 2026-06-03
"""
from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003_task_templates"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("analytics_opt_out", sa.Boolean(), nullable=True, server_default="false"))
    op.add_column("users", sa.Column("digest_unsubscribed", sa.Boolean(), nullable=True, server_default="false"))


def downgrade():
    op.drop_column("users", "digest_unsubscribed")
    op.drop_column("users", "analytics_opt_out")
