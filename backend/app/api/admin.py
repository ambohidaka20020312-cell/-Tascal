import datetime

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..models.user import User
from ..models.audit_log import AuditLog
from .. import db

bp = Blueprint("admin", __name__)


def _require_admin():
    """Return (user, None) if the caller is an admin, or (None, error_response) otherwise."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return None, (jsonify({"error": {"code": "NOT_FOUND", "message": "ユーザーが見つかりません"}}), 404)
    if not user.is_admin:
        return None, (jsonify({"error": {"code": "FORBIDDEN", "message": "管理者権限が必要です"}}), 403)
    return user, None


@bp.get("/audit-logs")
@jwt_required()
def list_audit_logs():
    """
    GET /admin/audit-logs
    Query params:
      page      int   (default 1)
      action    str   filter by action prefix
      user_id   int   filter by user
      from      date  ISO 8601 (e.g. 2024-01-01)
      to        date  ISO 8601 (e.g. 2024-12-31)
    Returns 100 entries per page, descending by created_at.
    """
    _, err = _require_admin()
    if err:
        return err

    page = max(int(request.args.get("page", 1)), 1)
    per_page = 100

    query = AuditLog.query

    action_filter = request.args.get("action")
    if action_filter:
        query = query.filter(AuditLog.action.like(f"{action_filter}%"))

    user_id_filter = request.args.get("user_id")
    if user_id_filter:
        try:
            query = query.filter(AuditLog.user_id == int(user_id_filter))
        except ValueError:
            return jsonify({"error": {"code": "INVALID_PARAM", "message": "user_id must be an integer"}}), 400

    from_str = request.args.get("from")
    if from_str:
        try:
            from_dt = datetime.datetime.fromisoformat(from_str)
            query = query.filter(AuditLog.created_at >= from_dt)
        except ValueError:
            return jsonify({"error": {"code": "INVALID_PARAM", "message": "from must be ISO 8601 date"}}), 400

    to_str = request.args.get("to")
    if to_str:
        try:
            to_dt = datetime.datetime.fromisoformat(to_str) + datetime.timedelta(days=1)
            query = query.filter(AuditLog.created_at < to_dt)
        except ValueError:
            return jsonify({"error": {"code": "INVALID_PARAM", "message": "to must be ISO 8601 date"}}), 400

    total = query.count()
    logs = (
        query.order_by(AuditLog.created_at.desc())
        .limit(per_page)
        .offset((page - 1) * per_page)
        .all()
    )

    return jsonify({
        "data": [log.to_dict() for log in logs],
        "meta": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "pages": (total + per_page - 1) // per_page,
        },
    })
