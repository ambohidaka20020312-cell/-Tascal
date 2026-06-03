"""階層的タスク委譲: member_skills テーブル作成・tasks/organization_members カラム追加

Revision ID: 002
Revises: 001
Create Date: 2026-06-03 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade():
    # ------------------------------------------------------------------
    # 1. member_skills テーブル作成
    # ------------------------------------------------------------------
    op.create_table(
        "member_skills",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("skill_tag", sa.String(50), nullable=False),
        sa.Column("level", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "skill_tag", name="uq_member_skill"),
        sa.CheckConstraint("level >= 1 AND level <= 5", name="ck_member_skills_level"),
    )
    op.create_index("ix_member_skills_user_id", "member_skills", ["user_id"])

    # ------------------------------------------------------------------
    # 2. tasks テーブルにカラム追加
    # ------------------------------------------------------------------
    op.add_column("tasks", sa.Column("required_skills", sa.Text(), nullable=True))
    op.add_column("tasks", sa.Column("delegation_level", sa.Integer(), nullable=True))
    op.add_column(
        "tasks",
        sa.Column(
            "parent_task_id",
            sa.Integer(),
            sa.ForeignKey("tasks.id"),
            nullable=True,
        ),
    )

    # ------------------------------------------------------------------
    # 3. organization_members テーブルにカラム追加
    #    (department_id は 001 で追加済みの可能性があるためスキップ)
    # ------------------------------------------------------------------
    # Ensure department_id exists (idempotent guard via try/except at runtime)
    try:
        op.add_column(
            "organization_members",
            sa.Column(
                "department_id",
                sa.Integer(),
                sa.ForeignKey("departments.id"),
                nullable=True,
            ),
        )
    except Exception:
        # Column already exists — skip
        pass


def downgrade():
    # Remove columns from organization_members
    try:
        op.drop_column("organization_members", "department_id")
    except Exception:
        pass

    # Remove columns from tasks
    op.drop_column("tasks", "parent_task_id")
    op.drop_column("tasks", "delegation_level")
    op.drop_column("tasks", "required_skills")

    # Drop member_skills table
    op.drop_index("ix_member_skills_user_id", table_name="member_skills")
    op.drop_table("member_skills")
