"""Add apple_id to users table for Apple Sign-In

Revision ID: 016
Revises: 015
"""
from alembic import op

revision = "016"
down_revision = "015"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS apple_id VARCHAR(200)")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_apple_id ON users (apple_id)")


def downgrade():
    op.execute("DROP INDEX IF EXISTS ix_users_apple_id")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS apple_id")
