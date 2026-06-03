"""Push notification subscription management API."""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity

from .. import db
from ..models.push_subscription import PushSubscription

push_bp = Blueprint("push", __name__)


@push_bp.post("/subscribe")
@jwt_required()
def subscribe():
    """Save (or update) a Web Push subscription for the current user."""
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    endpoint = data.get("endpoint")
    p256dh = data.get("p256dh")
    auth = data.get("auth")

    if not all([endpoint, p256dh, auth]):
        return (
            jsonify({"error": {"code": "INVALID_PAYLOAD", "message": "endpoint, p256dh, auth は必須です"}}),
            400,
        )

    # Upsert by endpoint
    sub = PushSubscription.query.filter_by(endpoint=endpoint).first()
    if sub:
        sub.user_id = user_id
        sub.p256dh = p256dh
        sub.auth = auth
    else:
        sub = PushSubscription(
            user_id=user_id,
            endpoint=endpoint,
            p256dh=p256dh,
            auth=auth,
        )
        db.session.add(sub)

    db.session.commit()
    return jsonify({"data": sub.to_dict(), "message": "購読を登録しました"}), 201


@push_bp.delete("/subscribe")
@jwt_required()
def unsubscribe():
    """Delete a Web Push subscription by endpoint."""
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    endpoint = data.get("endpoint")
    if not endpoint:
        return (
            jsonify({"error": {"code": "INVALID_PAYLOAD", "message": "endpoint は必須です"}}),
            400,
        )

    sub = PushSubscription.query.filter_by(user_id=user_id, endpoint=endpoint).first()
    if not sub:
        return jsonify({"error": {"code": "NOT_FOUND", "message": "購読が見つかりません"}}), 404

    db.session.delete(sub)
    db.session.commit()
    return jsonify({"data": None, "message": "購読を解除しました"})


@push_bp.post("/test")
@jwt_required()
def test_notification():
    """Send a test push notification to the current user (dev only)."""
    if not current_app.config.get("DEBUG"):
        return (
            jsonify({"error": {"code": "FORBIDDEN", "message": "開発環境専用です"}}),
            403,
        )

    user_id = int(get_jwt_identity())

    from ..tasks.push_notifications import send_push_to_user
    send_push_to_user.delay(
        user_id=user_id,
        title="Tascal テスト通知",
        body="プッシュ通知が正常に動作しています。",
        url="/",
    )

    return jsonify({"data": None, "message": "テスト通知をキューに追加しました"})
