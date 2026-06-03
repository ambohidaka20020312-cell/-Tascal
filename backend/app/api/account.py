import json
import logging
from flask import Blueprint, jsonify, request, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.user import User
from ..models.task import Task
from ..models.ai_usage import AIUsage
from ..models.task_template import TaskTemplate
from .. import db

bp = Blueprint("account", __name__)

logger = logging.getLogger(__name__)


@bp.get("/data-export")
@jwt_required()
def data_export():
    """GDPR data portability — export all user data as a JSON file."""
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)

    tasks = Task.query.filter_by(user_id=user_id).all()
    ai_usage = AIUsage.query.filter_by(user_id=user_id).all()
    templates = TaskTemplate.query.filter_by(user_id=user_id).all()

    payload = {
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "plan": user.plan,
            "analytics_opt_out": user.analytics_opt_out,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        },
        "tasks": [t.to_dict() for t in tasks],
        "ai_usage": [
            {"id": u.id, "date": u.date.isoformat(), "count": u.count}
            for u in ai_usage
        ],
        "templates": [t.to_dict() for t in templates],
    }

    response = Response(
        json.dumps(payload, ensure_ascii=False, indent=2),
        mimetype="application/json",
    )
    response.headers["Content-Disposition"] = (
        'attachment; filename="tascal-data-export.json"'
    )
    return response


@bp.delete("")
@jwt_required()
def delete_account():
    """GDPR right to erasure — permanently delete user and all associated data."""
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)

    if user.stripe_customer_id:
        logger.info(
            "Account deletion requested for user %s with Stripe customer %s. "
            "Stripe subscription cancellation should be handled separately.",
            user_id,
            user.stripe_customer_id,
        )

    # Cascade delete associated data
    AIUsage.query.filter_by(user_id=user_id).delete()
    TaskTemplate.query.filter_by(user_id=user_id).delete()
    Task.query.filter(
        (Task.user_id == user_id) | (Task.assigned_to == user_id)
    ).delete(synchronize_session=False)
    db.session.delete(user)
    db.session.commit()

    return jsonify({"data": None, "message": "アカウントが削除されました"}), 200


@bp.post("/opt-out-analytics")
@jwt_required()
def opt_out_analytics():
    """CCPA opt-out — stop collecting analytics data for this user."""
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)

    user.analytics_opt_out = True
    db.session.commit()

    return jsonify({"data": {"analytics_opt_out": True}, "message": "アナリティクスをオプトアウトしました"}), 200


@account_bp.route("/unsubscribe-digest", methods=["POST"])
@jwt_required()
def unsubscribe_digest():
    from flask_jwt_extended import get_jwt_identity
    user_id = get_jwt_identity()
    user = User.query.get_or_404(user_id)
    user.digest_unsubscribed = True
    db.session.commit()
    return jsonify({"data": None, "message": "週次ダイジェストの配信を停止しました。"})


@account_bp.route("/resubscribe-digest", methods=["POST"])
@jwt_required()
def resubscribe_digest():
    from flask_jwt_extended import get_jwt_identity
    user_id = get_jwt_identity()
    user = User.query.get_or_404(user_id)
    user.digest_unsubscribed = False
    db.session.commit()
    return jsonify({"data": None, "message": "週次ダイジェストの配信を再開しました。"})


@account_bp.route("/unsubscribe", methods=["GET"])
def unsubscribe_via_token():
    from flask_jwt_extended import decode_token
    token = request.args.get("token")
    if not token:
        return jsonify({"error": {"code": "missing_token", "message": "tokenが必要です。"}}), 400
    try:
        decoded = decode_token(token)
        user_id = decoded["sub"]
    except Exception:
        return jsonify({"error": {"code": "invalid_token", "message": "無効または期限切れのトークンです。"}}), 400
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": {"code": "not_found", "message": "ユーザーが見つかりません。"}}), 404
    user.digest_unsubscribed = True
    db.session.commit()
    return jsonify({"data": None, "message": "週次ダイジェストの配信を停止しました。"})
