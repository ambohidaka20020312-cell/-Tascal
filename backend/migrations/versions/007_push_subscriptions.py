"""create push_subscriptions table

Revision ID: 007_push_subscriptions
Revises: 006_task_sort_order
Create Date: 2026-06-03 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "007_push_subscriptions"
down_revision = "006_task_sort_order"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "push_subscriptions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("endpoint", sa.Text(), nullable=False, unique=True),
        sa.Column("p256dh", sa.Text(), nullable=False),
        sa.Column("auth", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_push_subscriptions_user_id", "push_subscriptions", ["user_id"])


def downgrade():
    op.drop_index("ix_push_subscriptions_user_id", table_name="push_subscriptions")
    op.drop_table("push_subscriptions")
