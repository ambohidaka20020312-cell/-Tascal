from flask import Flask


def register_blueprints(app: Flask):
    from .auth import bp as auth_bp
    from .tasks import bp as tasks_bp
    from .ai import bp as ai_bp
    from .calendar import bp as calendar_bp
    from .billing import bp as billing_bp
    from .health import bp as health_bp

    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    app.register_blueprint(tasks_bp, url_prefix="/api/v1/tasks")
    app.register_blueprint(ai_bp, url_prefix="/api/v1/ai")
    app.register_blueprint(calendar_bp, url_prefix="/api/v1/calendar")
    app.register_blueprint(billing_bp, url_prefix="/api/v1/billing")
    app.register_blueprint(health_bp)
