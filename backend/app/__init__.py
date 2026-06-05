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

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
mail = Mail()

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

    allowed_origins = os.getenv("ALLOWED_ORIGINS", ",".join(app.config["CORS_ORIGINS"])).split(",")
    CORS(app, resources={r"/api/*": {"origins": allowed_origins}}, supports_credentials=True)

    app.config["MAX_CONTENT_LENGTH"] = 1 * 1024 * 1024  # 1MB max request size

    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        from app.api.auth import _token_blacklist
        return jwt_payload["jti"] in _token_blacklist

    from .api import register_blueprints
    register_blueprints(app)

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

    return app
