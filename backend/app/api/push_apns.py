from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.device_token import DeviceToken
from .. import db

bp = Blueprint("push_apns", __name__)


@bp.post("/register")
@jwt_required()
def register_token():
    """iOSアプリからデバイストークンを登録"""
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    token = (data.get("token") or "").strip()
    platform = data.get("platform", "ios")  # "ios" or "mac"

    if not token:
        return jsonify({"error": {"code": "MISSING_TOKEN", "message": "トークンは必須です"}}), 400

    # 既存トークンがあれば更新、なければ作成
    existing = DeviceToken.query.filter_by(token=token).first()
    if existing:
        existing.user_id = user_id
        existing.is_active = True
        existing.platform = platform
    else:
        # ユーザーの古いトークンを無効化（同一ユーザーの古いデバイス）
        DeviceToken.query.filter_by(
            user_id=user_id, platform=platform
        ).update({"is_active": False})

        dt = DeviceToken(user_id=user_id, token=token, platform=platform)
        db.session.add(dt)

    db.session.commit()
    return jsonify({"message": "デバイストークンを登録しました"}), 200


@bp.delete("/unregister")
@jwt_required()
def unregister_token():
    """ログアウト時にトークンを無効化"""
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    token = (data.get("token") or "").strip()

    DeviceToken.query.filter_by(user_id=user_id, token=token).update({"is_active": False})
    db.session.commit()
    return jsonify({"message": "トークンを無効化しました"}), 200
