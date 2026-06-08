"""add email verification fields to users

Revision ID: 012
Revises: 011
Create Date: 2026-06-07
"""
from alembic import op
import sqlalchemy as sa

revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("email_verified", sa.Boolean(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("email_verify_token", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("email_verify_expires", sa.DateTime(), nullable=True))
    with op.batch_alter_table("users") as batch_op:
        batch_op.create_index("ix_users_email_verify_token", ["email_verify_token"], unique=True)


def downgrade():
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_index("ix_users_email_verify_token")
    op.drop_column("users", "email_verify_expires")
    op.drop_column("users", "email_verify_token")
    op.drop_column("users", "email_verified")
