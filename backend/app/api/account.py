from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, decode_token

from .. import db
from ..models.user import User

account_bp = Blueprint("account", __name__)


@account_bp.route("/unsubscribe-digest", methods=["POST"])
@jwt_required()
def unsubscribe_digest():
    """認証済みユーザーの週次ダイジェスト配信を停止する。"""
    user_id = get_jwt_identity()
    user = User.query.get_or_404(user_id)
    user.digest_unsubscribed = True
    db.session.commit()
    return jsonify({"data": None, "message": "週次ダイジェストの配信を停止しました。"})


@account_bp.route("/resubscribe-digest", methods=["POST"])
@jwt_required()
def resubscribe_digest():
    """認証済みユーザーの週次ダイジェスト配信を再開する。"""
    user_id = get_jwt_identity()
    user = User.query.get_or_404(user_id)
    user.digest_unsubscribed = False
    db.session.commit()
    return jsonify({"data": None, "message": "週次ダイジェストの配信を再開しました。"})


@account_bp.route("/unsubscribe", methods=["GET"])
def unsubscribe_via_token():
    """
    メールリンクからのワンクリック配信停止（認証不要）。
    URLパラメータ: ?token=<JWT access token>
    JWTのsubからユーザーIDを取得する。
    """
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
