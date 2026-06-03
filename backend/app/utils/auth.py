from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity
import datetime

PLAN_HIERARCHY = {
    "free": 0,
    "personal_pro": 1,
    "business": 2,
    "enterprise": 3,
}

# Legacy aliases kept for backwards compatibility
PLAN_ORDER = PLAN_HIERARCHY

FREE_AI_DAILY_LIMIT = 3


def is_org_plan(user) -> bool:
    """Return True if the user is on a business or enterprise plan."""
    return user.plan in ("business", "enterprise")


def require_plan(min_plan: str):
    """Decorator that requires the authenticated user to have at least min_plan."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            from ..models.user import User
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            if not user or PLAN_HIERARCHY.get(user.plan, 0) < PLAN_HIERARCHY.get(min_plan, 0):
                return jsonify({
                    "error": {
                        "code": "PLAN_REQUIRED",
                        "message": f"この機能には {min_plan} プラン以上が必要です",
                    }
                }), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def check_ai_limit(user) -> tuple[bool, int]:
    """Check whether the user is within the daily AI usage limit.

    Returns (allowed: bool, current_count: int).
    Non-free users are always allowed.
    """
    if user.plan != "free":
        return True, 0

    from ..models.ai_usage import AIUsage
    from .. import db

    today = datetime.date.today()
    usage = AIUsage.query.filter_by(user_id=user.id, date=today).first()
    current = usage.count if usage else 0
    return current < FREE_AI_DAILY_LIMIT, current


def increment_ai_usage(user):
    """Increment the AI usage counter for today."""
    from ..models.ai_usage import AIUsage
    from .. import db

    today = datetime.date.today()
    usage = AIUsage.query.filter_by(user_id=user.id, date=today).first()
    if usage:
        usage.count += 1
    else:
        usage = AIUsage(user_id=user.id, date=today, count=1)
        db.session.add(usage)
    db.session.commit()
