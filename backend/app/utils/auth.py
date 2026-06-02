from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity
import datetime

PLAN_ORDER = {"free": 0, "pro": 1, "team": 2}
FREE_AI_DAILY_LIMIT = 3


def require_plan(min_plan: str):
    """Decorator that requires the authenticated user to have at least min_plan."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            from ..models.user import User
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            if not user or PLAN_ORDER.get(user.plan, 0) < PLAN_ORDER.get(min_plan, 0):
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
