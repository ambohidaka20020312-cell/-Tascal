"""add revenuecat_user_id, trial fields, is_admin to users

Revision ID: 015
Revises: 014b
Create Date: 2026-06-10
"""
from alembic import op
import sqlalchemy as sa

revision = "015"
down_revision = "014b"
branch_labels = None
depends_on = None


def upgrade():
    # Use IF NOT EXISTS so this is safe to run even if columns were added manually
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS revenuecat_user_id VARCHAR(200)")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP WITHOUT TIME ZONE")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_used BOOLEAN NOT NULL DEFAULT FALSE")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_revenuecat_user_id ON users (revenuecat_user_id)")


def downgrade():
    op.execute("DROP INDEX IF EXISTS ix_users_revenuecat_user_id")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS revenuecat_user_id")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS trial_started_at")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS trial_used")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS is_admin")
