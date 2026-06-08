from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity, get_jwt
from ..models.user import User
from .. import db, limiter
from ..utils.rate_limit import is_locked, lockout_remaining, record_failure, record_success
from ..utils.validators import validate_password
from ..utils.audit import log_action

bp = Blueprint("auth", __name__)

# Simple in-memory token blacklist (use Redis in production)
_token_blacklist: set = set()


@bp.get("/me")
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": {"code": "NOT_FOUND", "message": "ユーザーが見つかりません"}}), 404
    return jsonify({"data": {"user": user.to_dict()}})


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
@limiter.limit("10 per minute")
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
    verify_token = user.generate_verify_token()
    db.session.add(user)
    db.session.flush()
    log_action(user.id, "auth.register", extra={"email": user.email})
    db.session.commit()

    _send_verify_email(user.email, verify_token)

    return jsonify({
        "message": "登録が完了しました。確認メールをお送りしましたので、メールのリンクをクリックしてアカウントを有効化してください。"
    }), 201


@bp.post("/login")
@limiter.limit("10 per minute")
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
        log_action(None, "auth.login_failed", extra={"email": data.get("email"), "ip": ip})
        db.session.commit()
        return jsonify({"error": {"code": "INVALID_CREDENTIALS", "message": "メールアドレスまたはパスワードが正しくありません"}}), 401

    # Skip email verification check if SKIP_EMAIL_VERIFY=true (dev/staging)
    skip_verify = current_app.config.get("SKIP_EMAIL_VERIFY", "false").lower() == "true"
    if not skip_verify and not user.email_verified:
        return jsonify({"error": {"code": "EMAIL_NOT_VERIFIED", "message": "メールアドレスが確認されていません。届いた確認メールのリンクをクリックしてください。"}}), 403

    record_success(ip)
    log_action(user.id, "auth.login", extra={"ip": ip})
    db.session.commit()
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


@bp.get("/me")
@jwt_required()
def get_me():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": {"code": "NOT_FOUND", "message": "ユーザーが見つかりません"}}), 404
    return jsonify({"data": user.to_dict()})


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


def _send_verify_email(email: str, token: str):
    frontend_url = current_app.config.get("FRONTEND_URL", "http://localhost:5173")
    verify_link = f"{frontend_url}/verify-email?token={token}"
    try:
        from flask_mail import Message
        from .. import mail
        html_body = f"""<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <tr>
          <td style="background:#0f172a;padding:32px 40px;">
            <p style="margin:0;font-size:13px;letter-spacing:0.3em;text-transform:uppercase;color:#94a3b8;">TASCAL</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 32px;">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:300;letter-spacing:0.05em;color:#0f172a;">メールアドレスの確認</h1>
            <p style="margin:0 0 24px;font-size:13px;color:#64748b;line-height:1.7;">
              Tascalへのご登録ありがとうございます。<br>
              下のボタンをクリックしてメールアドレスを確認してください。
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
              <tr>
                <td style="border-radius:8px;background:#0f172a;">
                  <a href="{verify_link}"
                     style="display:inline-block;padding:14px 32px;font-size:13px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#ffffff;text-decoration:none;">
                    メールアドレスを確認する
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 24px;font-size:12px;color:#94a3b8;line-height:1.7;">
              ⏱ このリンクの有効期限は <strong>24時間</strong> です。
            </p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;">
            <p style="margin:0 0 8px;font-size:11px;color:#94a3b8;">ボタンが表示されない場合は以下のURLをブラウザに貼り付けてください：</p>
            <p style="margin:0;font-size:11px;color:#64748b;word-break:break-all;">{verify_link}</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.7;">
              このメールに心当たりがない場合は無視してください。<br>
              ご不明な点は <a href="mailto:tascal.support@gmail.com" style="color:#64748b;">tascal.support@gmail.com</a> までご連絡ください。
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
        text_body = (
            f"Tascalへのご登録ありがとうございます。\n\n"
            f"以下のリンクからメールアドレスを確認してください（有効期限：24時間）:\n\n"
            f"{verify_link}\n\n"
            f"このメールに心当たりがない場合は無視してください。\n\n"
            f"Tascal\ntascal.support@gmail.com"
        )
        msg = Message(
            subject="【Tascal】メールアドレスの確認",
            recipients=[email],
            body=text_body,
            html=html_body,
        )
        mail.send(msg)
    except Exception as e:
        current_app.logger.error("Verify email send failed: %s", e)


@bp.get("/verify-email")
def verify_email():
    token = request.args.get("token", "").strip()
    if not token:
        return jsonify({"error": {"code": "MISSING_TOKEN", "message": "トークンが必要です"}}), 400

    user = User.query.filter_by(email_verify_token=token).first()
    if not user or not user.verify_email_token_valid():
        return jsonify({"error": {"code": "INVALID_TOKEN", "message": "リンクが無効または期限切れです。再度登録をお試しください"}}), 400

    user.email_verified = True
    user.email_verify_token = None
    user.email_verify_expires = None
    db.session.commit()

    return jsonify({"message": "メールアドレスを確認しました。ログインできます。"})


@bp.post("/resend-verify")
@limiter.limit("3 per hour")
def resend_verify():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    if not email:
        return jsonify({"error": {"code": "MISSING_FIELDS", "message": "メールアドレスを入力してください"}}), 400

    user = User.query.filter_by(email=email).first()
    if not user or user.email_verified:
        return jsonify({"message": "未確認の場合は確認メールを再送しました"}), 200

    token = user.generate_verify_token()
    db.session.commit()
    _send_verify_email(user.email, token)
    return jsonify({"message": "確認メールを再送しました"}), 200


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
        html_body = f"""<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:#0f172a;padding:32px 40px;">
            <p style="margin:0;font-size:13px;letter-spacing:0.3em;text-transform:uppercase;color:#94a3b8;">TASCAL</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:300;letter-spacing:0.05em;color:#0f172a;">パスワードリセット</h1>
            <p style="margin:0 0 24px;font-size:13px;color:#64748b;line-height:1.7;">
              パスワードリセットのリクエストを受け付けました。<br>
              下のボタンから新しいパスワードを設定してください。
            </p>
            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
              <tr>
                <td style="border-radius:8px;background:#0f172a;">
                  <a href="{reset_link}"
                     style="display:inline-block;padding:14px 32px;font-size:13px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#ffffff;text-decoration:none;">
                    パスワードを再設定する
                  </a>
                </td>
              </tr>
            </table>
            <!-- Expiry notice -->
            <p style="margin:0 0 24px;font-size:12px;color:#94a3b8;line-height:1.7;">
              ⏱ このリンクの有効期限は <strong>1時間</strong> です。
            </p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;">
            <!-- Fallback URL -->
            <p style="margin:0 0 8px;font-size:11px;color:#94a3b8;">ボタンが表示されない場合は以下のURLをブラウザに貼り付けてください：</p>
            <p style="margin:0;font-size:11px;color:#64748b;word-break:break-all;">{reset_link}</p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.7;">
              このメールに心当たりがない場合は無視してください。パスワードは変更されません。<br>
              ご不明な点は <a href="mailto:tascal.support@gmail.com" style="color:#64748b;">tascal.support@gmail.com</a> までご連絡ください。
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
        text_body = (
            f"パスワードリセットのリクエストを受け付けました。\n\n"
            f"以下のリンクから新しいパスワードを設定してください（有効期限：1時間）:\n\n"
            f"{reset_link}\n\n"
            f"このメールに心当たりがない場合は無視してください。\n\n"
            f"Tascal\ntascal.support@gmail.com"
        )
        msg = Message(
            subject="【Tascal】パスワードリセット",
            recipients=[user.email],
            body=text_body,
            html=html_body,
        )
        mail.send(msg)
    except Exception as e:
        current_app.logger.error("Password reset email failed: %s", e)
        # Token is committed — dev can retrieve it from DB if needed

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
