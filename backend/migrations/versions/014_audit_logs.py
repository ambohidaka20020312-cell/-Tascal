"""create audit_logs table

Revision ID: 014
Revises: 013
Create Date: 2026-06-09
"""
from alembic import op
import sqlalchemy as sa

revision = "014"
down_revision = "013"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "audit_logs" not in inspector.get_table_names():
        op.create_table(
            "audit_logs",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("action", sa.String(100), nullable=False),
            sa.Column("resource_type", sa.String(50), nullable=True),
            sa.Column("resource_id", sa.Integer(), nullable=True),
            sa.Column("ip_address", sa.String(45), nullable=True),
            sa.Column("user_agent", sa.String(500), nullable=True),
            sa.Column("extra", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
    indexes = [idx["name"] for idx in inspector.get_indexes("audit_logs")]
    if "ix_audit_logs_created_at" not in indexes:
        op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])


def downgrade():
    op.drop_index("ix_audit_logs_created_at", table_name="audit_logs")
    op.drop_table("audit_logs")
