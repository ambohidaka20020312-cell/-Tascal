"""task_templates table

Revision ID: 003_task_templates
Revises: 002_hierarchical_tasks
Create Date: 2026-06-03 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "003_task_templates"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "task_templates",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("priority", sa.String(20), nullable=True),
        sa.Column("estimated_minutes", sa.Integer(), nullable=True),
        sa.Column("category", sa.String(50), nullable=True),
        sa.Column("tags", sa.Text(), nullable=True),
        sa.Column("use_count", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_task_templates_user_id", "task_templates", ["user_id"])


def downgrade():
    op.drop_index("ix_task_templates_user_id", table_name="task_templates")
    op.drop_table("task_templates")
