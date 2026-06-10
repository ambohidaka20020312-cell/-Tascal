"""org_invites table

Revision ID: 014
Revises: 013
Create Date: 2026-06-10
"""
from alembic import op
import sqlalchemy as sa

revision = "014b"
down_revision = "014"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE IF NOT EXISTS org_invites (
            id SERIAL NOT NULL,
            org_id INTEGER NOT NULL,
            email VARCHAR(255) NOT NULL,
            token VARCHAR(100) NOT NULL UNIQUE,
            invited_by INTEGER,
            expires_at TIMESTAMP WITHOUT TIME ZONE,
            accepted_at TIMESTAMP WITHOUT TIME ZONE,
            created_at TIMESTAMP WITHOUT TIME ZONE,
            PRIMARY KEY (id),
            FOREIGN KEY(org_id) REFERENCES organizations (id),
            FOREIGN KEY(invited_by) REFERENCES users (id)
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_org_invites_token ON org_invites (token)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_org_invites_email ON org_invites (email)")


def downgrade():
    op.drop_table("org_invites")
