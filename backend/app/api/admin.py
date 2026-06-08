import datetime

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_

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


@bp.get("/stats")
@jwt_required()
def get_stats():
    """GET /admin/stats — platform-wide statistics."""
    _, err = _require_admin()
    if err:
        return err

    now = datetime.datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    total = User.query.count()
    free_count = User.query.filter_by(plan="free").count()
    personal_pro_count = User.query.filter_by(plan="personal_pro").count()
    business_count = User.query.filter_by(plan="business").count()
    enterprise_count = User.query.filter_by(plan="enterprise").count()

    individual_total = User.query.filter(User.plan.in_(["free", "personal_pro"])).count()
    team_total = User.query.filter(User.plan.in_(["business", "enterprise"])).count()

    new_today = User.query.filter(User.created_at >= today_start).count()
    new_this_month = User.query.filter(User.created_at >= month_start).count()

    mrr_estimate = personal_pro_count * 980 + business_count * 1480

    return jsonify({
        "data": {
            "users": {
                "total": total,
                "free": free_count,
                "personal_pro": personal_pro_count,
                "business": business_count,
                "enterprise": enterprise_count,
                "individual_total": individual_total,
                "team_total": team_total,
                "new_today": new_today,
                "new_this_month": new_this_month,
            },
            "revenue": {
                "mrr_estimate": mrr_estimate,
                "personal_pro_count": personal_pro_count,
                "business_count": business_count,
            },
        }
    })


@bp.get("/users")
@jwt_required()
def list_users():
    """GET /admin/users — paginated user list with optional filters."""
    _, err = _require_admin()
    if err:
        return err

    page = max(int(request.args.get("page", 1)), 1)
    per_page = 20

    query = User.query

    plan_filter = request.args.get("plan")
    if plan_filter:
        query = query.filter_by(plan=plan_filter)

    search = request.args.get("search")
    if search:
        like = f"%{search}%"
        query = query.filter(or_(User.email.ilike(like), User.name.ilike(like)))

    from_str = request.args.get("from")
    if from_str:
        try:
            from_dt = datetime.datetime.fromisoformat(from_str)
            query = query.filter(User.created_at >= from_dt)
        except ValueError:
            return jsonify({"error": {"code": "INVALID_PARAM", "message": "from must be ISO 8601 date"}}), 400

    to_str = request.args.get("to")
    if to_str:
        try:
            to_dt = datetime.datetime.fromisoformat(to_str) + datetime.timedelta(days=1)
            query = query.filter(User.created_at < to_dt)
        except ValueError:
            return jsonify({"error": {"code": "INVALID_PARAM", "message": "to must be ISO 8601 date"}}), 400

    total = query.count()
    users = (
        query.order_by(User.created_at.desc())
        .limit(per_page)
        .offset((page - 1) * per_page)
        .all()
    )

    def _user_row(u):
        return {
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "plan": u.plan,
            "stripe_customer_id": u.stripe_customer_id,
            "stripe_subscription_id": u.stripe_subscription_id,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }

    return jsonify({
        "data": [_user_row(u) for u in users],
        "meta": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "pages": (total + per_page - 1) // per_page,
        },
    })


@bp.get("/users/<int:user_id>")
@jwt_required()
def get_user(user_id: int):
    """GET /admin/users/:id — full user detail."""
    _, err = _require_admin()
    if err:
        return err

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": {"code": "NOT_FOUND", "message": "ユーザーが見つかりません"}}), 404

    return jsonify({
        "data": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "plan": user.plan,
            "is_admin": user.is_admin,
            "stripe_customer_id": user.stripe_customer_id,
            "stripe_subscription_id": user.stripe_subscription_id,
            "revenuecat_user_id": user.revenuecat_user_id,
            "onboarding_completed": user.onboarding_completed,
            "analytics_opt_out": user.analytics_opt_out,
            "digest_unsubscribed": user.digest_unsubscribed,
            "trial_used": user.trial_used,
            "trial_started_at": user.trial_started_at.isoformat() if user.trial_started_at else None,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        }
    })


@bp.patch("/users/<int:user_id>")
@jwt_required()
def update_user(user_id: int):
    """PATCH /admin/users/:id — update plan or is_admin."""
    _, err = _require_admin()
    if err:
        return err

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": {"code": "NOT_FOUND", "message": "ユーザーが見つかりません"}}), 404

    body = request.get_json(silent=True) or {}
    allowed_plans = {"free", "personal_pro", "business", "enterprise"}

    if "plan" in body:
        if body["plan"] not in allowed_plans:
            return jsonify({"error": {"code": "INVALID_PARAM", "message": "無効なプランです"}}), 400
        user.plan = body["plan"]

    if "is_admin" in body:
        user.is_admin = bool(body["is_admin"])

    if body.get("email_verified") is True:
        user.email_verified = True
        user.email_verify_token = None

    db.session.commit()

    return jsonify({
        "data": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "plan": user.plan,
            "is_admin": user.is_admin,
            "stripe_customer_id": user.stripe_customer_id,
            "stripe_subscription_id": user.stripe_subscription_id,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        },
        "message": "ユーザー情報を更新しました",
    })
