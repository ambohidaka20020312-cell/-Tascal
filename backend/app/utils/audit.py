from flask import request, current_app
from ..models.audit_log import AuditLog
from .. import db


def log_action(user_id, action: str, resource_type=None, resource_id=None, extra=None):
    """Record an audit log entry. Commit is left to the caller (include in the same transaction)."""
    try:
        entry = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get("User-Agent", "")[:500],
            extra=extra,
        )
        db.session.add(entry)
    except Exception as e:
        current_app.logger.warning("audit log failed: %s", e)
