from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from ..models.user import User
from .. import db
from ..utils.rate_limit import is_locked, lockout_remaining, record_failure, record_success
from ..utils.validators import validate_password

bp = Blueprint("auth", __name__)


def _get_client_ip() -> str:
    """Extract real client IP, respecting X-Forwarded-For from trusted proxies."""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.remote_addr or "unknown"


@bp.post("/register")
def register():
    data = request.get_json() or {}
    if not data.get("email") or not data.get("password"):
        return jsonify({"error": {"code": "MISSING_FIELDS", "message": "email と password は必須です"}}), 400

    # Age confirmation (GDPR / COPPA)
    if not data.get("age_confirmed"):
        return jsonify({
            "error": {
                "code": "AGE_REQUIREMENT",
                "message": "13歳以上（EU/EEAは16歳以上）である必要があります",
            }
        }), 400

    # Password strength validation
    ok, msg = validate_password(data["password"])
    if not ok:
        return jsonify({"error": {"code": "WEAK_PASSWORD", "message": msg}}), 400

    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": {"code": "EMAIL_EXISTS", "message": "このメールアドレスは既に使用されています"}}), 409

    user = User(email=data["email"], name=data.get("name", ""))
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()

    return jsonify({
        "data": {"user": user.to_dict()},
        "message": "登録が完了しました"
    }), 201


@bp.post("/login")
def login():
    ip = _get_client_ip()

    # Rate limit check
    if is_locked(ip):
        remaining = lockout_remaining(ip)
        return jsonify({
            "error": {
                "code": "TOO_MANY_ATTEMPTS",
                "message": f"ログイン試行回数が多すぎます。{remaining // 60}分後に再試行してください",
            }
        }), 429

    data = request.get_json() or {}
    if not data.get("email") or not data.get("password"):
        return jsonify({"error": {"code": "MISSING_FIELDS", "message": "email と password は必須です"}}), 400

    user = User.query.filter_by(email=data["email"]).first()

    if not user or not user.check_password(data["password"]):
        record_failure(ip)
        return jsonify({"error": {"code": "INVALID_CREDENTIALS", "message": "メールアドレスまたはパスワードが正しくありません"}}), 401

    record_success(ip)
    return jsonify({
        "data": {
            "access_token": create_access_token(identity=str(user.id)),
            "refresh_token": create_refresh_token(identity=str(user.id)),
            "user": user.to_dict(),
        }
    })


@bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()
    return jsonify({"data": {"access_token": create_access_token(identity=user_id)}})
