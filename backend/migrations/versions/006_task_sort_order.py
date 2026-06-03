"""add sort_order to tasks for drag-and-drop reordering

Revision ID: 006_task_sort_order
Revises: 005_user_onboarding
Create Date: 2026-06-03 00:00:00.000000

Note: sort_order column was included in the initial schema (001).
This migration adds an index on (user_id, sort_order) to optimize
the ORDER BY sort_order query used by the reorder feature.
"""
from alembic import op

revision = "006_task_sort_order"
down_revision = "005_user_onboarding"
branch_labels = None
depends_on = None


def upgrade():
    op.create_index(
        "ix_tasks_user_sort_order",
        "tasks",
        ["user_id", "sort_order"],
        unique=False,
    )


def downgrade():
    op.drop_index("ix_tasks_user_sort_order", table_name="tasks")
