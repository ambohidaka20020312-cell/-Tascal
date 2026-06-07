from flask import Flask


def register_blueprints(app: Flask):
    from .auth import bp as auth_bp
    from .tasks import bp as tasks_bp
    from .ai import bp as ai_bp
    from .calendar import bp as calendar_bp
    from .billing import bp as billing_bp
    from .health import bp as health_bp
    from .organizations import bp as org_bp
    from .org_tasks import bp as org_tasks_bp
    from .skills import bp as skills_bp
    from .templates import bp as templates_bp
    from .account import bp as account_bp
    from .push import push_bp
    from .categories import bp as categories_bp
    from .teams import bp as teams_bp
    from .channels import bp as channels_bp
    from .notifications import notifications_bp
    from .admin import bp as admin_bp
    from .push_apns import bp as push_apns_bp

    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    app.register_blueprint(tasks_bp, url_prefix="/api/v1/tasks")
    app.register_blueprint(ai_bp, url_prefix="/api/v1/ai")
    app.register_blueprint(calendar_bp, url_prefix="/api/v1/calendar")
    app.register_blueprint(billing_bp, url_prefix="/api/v1/billing")
    app.register_blueprint(health_bp)
    app.register_blueprint(org_bp, url_prefix="/api/v1/org")
    app.register_blueprint(org_tasks_bp, url_prefix="/api/v1/org")
    app.register_blueprint(skills_bp, url_prefix="/api/v1")
    app.register_blueprint(templates_bp, url_prefix="/api/v1/templates")
    app.register_blueprint(account_bp, url_prefix="/api/v1/account")
    app.register_blueprint(push_bp, url_prefix="/api/v1/push")
    app.register_blueprint(categories_bp, url_prefix="/api/v1/categories")
    app.register_blueprint(teams_bp, url_prefix="/api/v1/teams")
    app.register_blueprint(channels_bp, url_prefix="/api/v1/channels")
    app.register_blueprint(notifications_bp, url_prefix="/api/v1/notifications")
    app.register_blueprint(admin_bp, url_prefix="/api/v1/admin")
    app.register_blueprint(push_apns_bp, url_prefix="/api/v1/push-apns")
