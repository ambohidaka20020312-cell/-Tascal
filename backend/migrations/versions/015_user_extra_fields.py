"""add revenuecat_user_id, trial fields, is_admin to users

Revision ID: 015
Revises: 014
Create Date: 2026-06-10
"""
from alembic import op
import sqlalchemy as sa

revision = "015"
down_revision = "014b"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("revenuecat_user_id", sa.String(200), unique=True, nullable=True))
        batch_op.add_column(sa.Column("trial_started_at", sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column("trial_used", sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.add_column(sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.false()))
    try:
        op.create_index("ix_users_revenuecat_user_id", "users", ["revenuecat_user_id"], unique=True)
    except Exception:
        pass


def downgrade():
    try:
        op.drop_index("ix_users_revenuecat_user_id", table_name="users")
    except Exception:
        pass
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("is_admin")
        batch_op.drop_column("trial_used")
        batch_op.drop_column("trial_started_at")
        batch_op.drop_column("revenuecat_user_id")
