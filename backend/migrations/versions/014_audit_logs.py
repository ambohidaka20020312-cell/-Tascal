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
    op.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id SERIAL NOT NULL,
            user_id INTEGER,
            action VARCHAR(100) NOT NULL,
            resource_type VARCHAR(50),
            resource_id INTEGER,
            ip_address VARCHAR(45),
            user_agent VARCHAR(500),
            extra JSON,
            created_at TIMESTAMP WITHOUT TIME ZONE,
            PRIMARY KEY (id),
            FOREIGN KEY(user_id) REFERENCES users (id)
        )
    """)
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_audit_logs_created_at ON audit_logs (created_at)"
    )


def downgrade():
    op.drop_index("ix_audit_logs_created_at", table_name="audit_logs")
    op.drop_table("audit_logs")
