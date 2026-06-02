"""初期スキーマ: users / tasks / ai_usage テーブル作成

Revision ID: 001
Revises:
Create Date: 2026-06-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------ #
    # users テーブル
    # ------------------------------------------------------------------ #
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False, server_default=""),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("plan", sa.String(length=20), nullable=False, server_default="free"),
        sa.Column("stripe_customer_id", sa.String(length=100), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=True,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
        sa.UniqueConstraint("stripe_customer_id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    # ------------------------------------------------------------------ #
    # tasks テーブル
    # ------------------------------------------------------------------ #
    op.create_table(
        "tasks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True, server_default=""),
        sa.Column("priority", sa.String(length=20), nullable=True, server_default="medium"),
        sa.Column("status", sa.String(length=20), nullable=True, server_default="pending"),
        sa.Column("estimated_minutes", sa.Integer(), nullable=True),
        sa.Column("actual_minutes", sa.Integer(), nullable=True),
        sa.Column("scheduled_date", sa.Date(), nullable=True),
        sa.Column("due_datetime", sa.DateTime(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("is_deleted", sa.Boolean(), nullable=True, server_default="0"),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=True,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=True,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_tasks_user_id"), "tasks", ["user_id"], unique=False)
    op.create_index(op.f("ix_tasks_scheduled_date"), "tasks", ["scheduled_date"], unique=False)

    # ------------------------------------------------------------------ #
    # ai_usage テーブル
    # ------------------------------------------------------------------ #
    op.create_table(
        "ai_usage",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("count", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "date", name="uq_ai_usage_user_date"),
    )
    op.create_index(op.f("ix_ai_usage_user_id"), "ai_usage", ["user_id"], unique=False)
    op.create_index(op.f("ix_ai_usage_date"), "ai_usage", ["date"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_ai_usage_date"), table_name="ai_usage")
    op.drop_index(op.f("ix_ai_usage_user_id"), table_name="ai_usage")
    op.drop_table("ai_usage")

    op.drop_index(op.f("ix_tasks_scheduled_date"), table_name="tasks")
    op.drop_index(op.f("ix_tasks_user_id"), table_name="tasks")
    op.drop_table("tasks")

    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
