from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity, get_jwt
from ..models.user import User
from .. import db
from ..utils.rate_limit import is_locked, lockout_remaining, record_failure, record_success
from ..utils.validators import validate_password

bp = Blueprint("auth", __name__)

# Simple in-memory token blacklist (use Redis in production)
_token_blacklist: set = set()


@bp.post("/logout")
@jwt_required()
def logout():
    jti = get_jwt()["jti"]
    _token_blacklist.add(jti)
    return jsonify({"message": "ログアウトしました"}), 200


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


@bp.get("/profile")
@jwt_required()
def get_profile():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": {"code": "NOT_FOUND", "message": "ユーザーが見つかりません"}}), 404
    return jsonify({"data": {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "plan": user.plan,
        "digest_unsubscribed": user.digest_unsubscribed,
        "analytics_opt_out": user.analytics_opt_out,
        "onboarding_completed": user.onboarding_completed,
    }})


@bp.patch("/profile")
@jwt_required()
def update_profile():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": {"code": "NOT_FOUND", "message": "ユーザーが見つかりません"}}), 404

    data = request.get_json() or {}
    if "name" in data:
        name = str(data["name"]).strip()
        if len(name) > 100:
            return jsonify({"error": {"code": "INVALID_NAME", "message": "名前は100文字以内で入力してください"}}), 400
        user.name = name
    if "onboarding_completed" in data:
        user.onboarding_completed = bool(data["onboarding_completed"])

    db.session.commit()
    return jsonify({"data": {"user": user.to_dict()}, "message": "プロフィールを更新しました"})


@bp.post("/forgot-password")
def forgot_password():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    if not email:
        return jsonify({"error": {"code": "MISSING_FIELDS", "message": "メールアドレスを入力してください"}}), 400

    user = User.query.filter_by(email=email).first()
    # Always return 200 to avoid email enumeration
    if not user:
        return jsonify({"message": "メールを送信しました（登録済みの場合）"}), 200

    token = user.generate_reset_token()
    db.session.commit()

    frontend_url = current_app.config.get("FRONTEND_URL", "http://localhost:5173")
    reset_link = f"{frontend_url}/reset-password?token={token}"

    try:
        from flask_mail import Message
        from .. import mail
        msg = Message(
            subject="【Tascal】パスワードリセット",
            recipients=[user.email],
            body=(
                f"パスワードリセットのリクエストを受け付けました。\n\n"
                f"以下のリンクをクリックして新しいパスワードを設定してください（有効期限：1時間）:\n\n"
                f"{reset_link}\n\n"
                f"このメールに心当たりがない場合は無視してください。\n\n"
                f"Tascal サポートチーム\ntascal.support@gmail.com"
            ),
        )
        mail.send(msg)
    except Exception as e:
        current_app.logger.error("Password reset email failed: %s", e)
        # Still commit the token — user can retry or admin can look up token in dev

    return jsonify({"message": "メールを送信しました（登録済みの場合）"}), 200


@bp.post("/reset-password")
def reset_password():
    data = request.get_json() or {}
    token = (data.get("token") or "").strip()
    new_password = data.get("password") or ""

    if not token or not new_password:
        return jsonify({"error": {"code": "MISSING_FIELDS", "message": "トークンと新しいパスワードを入力してください"}}), 400

    from ..utils.validators import validate_password
    ok, msg = validate_password(new_password)
    if not ok:
        return jsonify({"error": {"code": "WEAK_PASSWORD", "message": msg}}), 400

    user = User.query.filter_by(password_reset_token=token).first()
    if not user or not user.reset_token_valid():
        return jsonify({"error": {"code": "INVALID_TOKEN", "message": "リンクが無効または期限切れです。再度パスワードリセットをお試しください"}}), 400

    user.set_password(new_password)
    user.clear_reset_token()
    db.session.commit()

    return jsonify({"message": "パスワードを更新しました"}), 200
