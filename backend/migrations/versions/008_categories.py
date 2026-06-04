"""create categories table and add category_id to tasks

Revision ID: 008_categories
Revises: 007_push_subscriptions
Create Date: 2026-06-04 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "008_categories"
down_revision = "007_push_subscriptions"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("color", sa.String(7), nullable=False, server_default="#888888"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "name", name="uq_categories_user_name"),
    )
    op.create_index("ix_categories_user_id", "categories", ["user_id"])

    op.add_column(
        "tasks",
        sa.Column(
            "category_id",
            sa.Integer(),
            sa.ForeignKey("categories.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )


def downgrade():
    op.drop_column("tasks", "category_id")
    op.drop_index("ix_categories_user_id", table_name="categories")
    op.drop_table("categories")
