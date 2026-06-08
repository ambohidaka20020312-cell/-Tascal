"""add mentions and message_type to messages

Revision ID: 013
Revises: 012
Create Date: 2026-06-08
"""
from alembic import op
import sqlalchemy as sa

revision = "013"
down_revision = "012"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("messages") as batch_op:
        batch_op.add_column(sa.Column("mentions", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("message_type", sa.String(20), nullable=False, server_default="text"))


def downgrade():
    with op.batch_alter_table("messages") as batch_op:
        batch_op.drop_column("message_type")
        batch_op.drop_column("mentions")
