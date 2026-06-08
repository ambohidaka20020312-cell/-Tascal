import os
import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from flask import Flask, jsonify, request, send_file, render_template
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_mail import Mail
from flask_socketio import SocketIO
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
mail = Mail()
socketio = SocketIO()
limiter = Limiter(get_remote_address, default_limits=["200 per day", "50 per hour"])

# Content-Security-Policy that allows AdSense and Stripe resources
_CSP = (
    "default-src 'self'; "
    "script-src 'self' https://js.stripe.com https://pagead2.googlesyndication.com "
    "https://www.googletagservices.com https://partner.googleadservices.com; "
    "frame-src https://js.stripe.com https://hooks.stripe.com "
    "https://googleads.g.doubleclick.net; "
    "img-src 'self' data: https:; "
    "style-src 'self' 'unsafe-inline'; "
    "connect-src 'self' https://api.stripe.com; "
    "font-src 'self' data:; "
    "object-src 'none'; "
    "base-uri 'self'; "
    "report-uri /api/v1/csp-report;"
)


def create_app(config_name: str = "development"):
    sentry_dsn = os.getenv("SENTRY_DSN")
    if sentry_dsn:
        sentry_sdk.init(
            dsn=sentry_dsn,
            integrations=[
                FlaskIntegration(),
                SqlalchemyIntegration(),
            ],
            traces_sample_rate=0.1,
        )

    app = Flask(__name__)

    from .config import config
    app.config.from_object(config[config_name])

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    mail.init_app(app)
    socketio.init_app(
        app,
        cors_allowed_origins="*",
        async_mode="threading",
        message_queue=os.getenv("REDIS_URL"),
    )
    limiter.init_app(app)

    allowed_origins = os.getenv("ALLOWED_ORIGINS", ",".join(app.config["CORS_ORIGINS"])).split(",")
    CORS(app, resources={r"/api/*": {"origins": allowed_origins}}, supports_credentials=True)

    app.config["MAX_CONTENT_LENGTH"] = 52 * 1024 * 1024  # 52MB — allows up to 50MB file uploads

    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        from app.api.auth import _token_blacklist
        return jwt_payload["jti"] in _token_blacklist

    from .api import register_blueprints
    register_blueprints(app)

    # ------------------------------------------------------------------ #
    # SocketIO events                                                       #
    # ------------------------------------------------------------------ #
    from flask_socketio import join_room, leave_room
    from flask_jwt_extended import decode_token

    @socketio.on("join_channel")
    def on_join_channel(data):
        token = data.get("token")
        channel_id = data.get("channel_id")
        if not token or not channel_id:
            return
        try:
            decoded = decode_token(token)
            user_id = decoded["sub"]
        except Exception:
            return
        room = f"channel_{channel_id}"
        join_room(room)

    @socketio.on("leave_channel")
    def on_leave_channel(data):
        channel_id = data.get("channel_id")
        if channel_id:
            leave_room(f"channel_{channel_id}")

    @socketio.on("send_message")
    def on_send_message(data):
        token = data.get("token")
        channel_id = data.get("channel_id")
        body = (data.get("body") or "").strip()
        if not token or not channel_id or not body:
            return
        try:
            decoded = decode_token(token)
            user_id = decoded["sub"]
        except Exception:
            return
        with app.app_context():
            from .models.channel import Channel, ChannelMember, Message as Msg
            from .utils.team_auth import require_team_seat
            from .models.user import User
            channel = Channel.query.get(channel_id)
            if not channel:
                return
            cm = ChannelMember.query.filter_by(channel_id=channel_id, user_id=user_id).first()
            if not cm:
                return
            tm_check = require_team_seat(User.query.get(user_id), channel.team_id)
            if tm_check is not None:
                return
            msg = Msg(channel_id=channel_id, sender_id=user_id, body=body)
            db.session.add(msg)
            db.session.commit()
            socketio.emit("new_message", msg.to_dict(), room=f"channel_{channel_id}")

    # ------------------------------------------------------------------ #
    # Local-development static file serving for uploaded attachments      #
    # (When S3_ENDPOINT_URL is set this route is never used in practice.) #
    # ------------------------------------------------------------------ #
    from flask import send_from_directory as _send_from_directory

    @app.route("/uploads/<path:filename>")
    def serve_upload(filename):
        upload_root = os.path.join(os.path.dirname(__file__), "..", "uploads")
        upload_root = os.path.abspath(upload_root)
        return _send_from_directory(upload_root, filename)

    @app.route("/api/v1/docs/openapi.yaml")
    def openapi_spec():
        spec_path = os.path.join(os.path.dirname(__file__), "openapi.yaml")
        return send_file(spec_path, mimetype="application/yaml")

    @app.route("/api/v1/docs")
    def api_docs():
        return render_template("swagger.html")

    # ------------------------------------------------------------------ #
    # Security headers — added to every response                          #
    # ------------------------------------------------------------------ #
    @app.after_request
    def set_security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = _CSP
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(self), geolocation=(), "
            "payment=(self), usb=(), bluetooth=()"
        )
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
        response.headers["Cross-Origin-Resource-Policy"] = "same-origin"
        # Prevent caching of sensitive API responses
        if response.content_type and "json" in response.content_type:
            response.headers["Cache-Control"] = "no-store"
        # Rate limit headers
        if hasattr(request, 'rate_limit_remaining'):
            response.headers['X-RateLimit-Remaining'] = str(request.rate_limit_remaining)
            response.headers['X-RateLimit-Limit'] = str(request.rate_limit_limit)
        return response

    # ------------------------------------------------------------------ #
    # Production error handlers — no stack traces in responses            #
    # ------------------------------------------------------------------ #
    if not app.config.get("DEBUG") and not app.config.get("TESTING"):
        @app.errorhandler(400)
        def bad_request(e):
            return jsonify({"error": {"code": "BAD_REQUEST", "message": "リクエストが不正です"}}), 400

        @app.errorhandler(401)
        def unauthorized(e):
            return jsonify({"error": {"code": "UNAUTHORIZED", "message": "認証が必要です"}}), 401

        @app.errorhandler(403)
        def forbidden(e):
            return jsonify({"error": {"code": "FORBIDDEN", "message": "アクセスが禁止されています"}}), 403

        @app.errorhandler(404)
        def not_found(e):
            return jsonify({"error": {"code": "NOT_FOUND", "message": "リソースが見つかりません"}}), 404

        @app.errorhandler(405)
        def method_not_allowed(e):
            return jsonify({"error": {"code": "METHOD_NOT_ALLOWED", "message": "このメソッドは許可されていません"}}), 405

        @app.errorhandler(429)
        def too_many_requests(e):
            return jsonify({"error": {"code": "TOO_MANY_REQUESTS", "message": "リクエスト数が多すぎます"}}), 429

        @app.errorhandler(500)
        def internal_error(e):
            app.logger.error("Internal Server Error: %s", str(e))
            return jsonify({"error": {"code": "INTERNAL_ERROR", "message": "サーバーエラーが発生しました"}}), 500

        @app.errorhandler(Exception)
        def unhandled_exception(e):
            app.logger.exception("Unhandled exception: %s", str(e))
            return jsonify({"error": {"code": "INTERNAL_ERROR", "message": "サーバーエラーが発生しました"}}), 500

    @app.cli.command("check-notifications")
    def check_notifications_command():
        """手動で通知チェックを実行: flask check-notifications"""
        from .services.notification_scheduler import check_deadline_reminders, check_unstarted_reminders
        check_deadline_reminders()
        check_unstarted_reminders()
        print("通知チェック完了")

    return app
