from functools import wraps
import datetime

from flask import jsonify
from flask_jwt_extended import get_jwt_identity

from ..models.user import User
from ..models.task import Task
from ..models.ai_usage import AIUsage
from .. import db

FREE_TASK_LIMIT = 20  # per month
FREE_AI_CALLS_PER_DAY = 3

PLAN_ORDER = {"free": 0, "pro": 1, "personal_pro": 1, "team": 2, "business": 2, "enterprise": 3}


def require_plan(min_plan: str):
    """Decorator: require min_plan ('pro' or 'team')."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = User.query.get(get_jwt_identity())
            if PLAN_ORDER.get(user.plan, 0) < PLAN_ORDER.get(min_plan, 0):
                return jsonify({
                    "error": {
                        "code": "UPGRADE_REQUIRED",
                        "message": "この機能はProプラン以上が必要です。",
                    }
                }), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def check_task_limit():
    """Check if free user has hit 20 tasks/month.

    Returns (allowed: bool, error_response_tuple | None).
    Call as::

        result = check_task_limit()
        if result is not None:
            return result
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or user.plan != "free":
        return None  # no limit for paid plans

    now = datetime.datetime.utcnow()
    month_start = datetime.datetime(now.year, now.month, 1)
    count = Task.query.filter(
        Task.user_id == user_id,
        Task.is_deleted == False,
        Task.created_at >= month_start,
    ).count()

    if count >= FREE_TASK_LIMIT:
        return jsonify({
            "error": {
                "code": "TASK_LIMIT_EXCEEDED",
                "message": f"Freeプランでは1か月に{FREE_TASK_LIMIT}件までタスクを作成できます",
            }
        }), 403
    return None


def check_ai_limit():
    """Check if free user has hit 3 AI calls/day (uses AIUsage model).

    Returns an error response tuple if limit is reached, otherwise None.
    On success increments the usage counter.
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or user.plan != "free":
        return None  # no limit for paid plans

    today = datetime.date.today()
    usage = AIUsage.query.filter_by(user_id=user_id, date=today).first()

    if usage and usage.count >= FREE_AI_CALLS_PER_DAY:
        return jsonify({
            "error": {
                "code": "AI_LIMIT_EXCEEDED",
                "message": f"Freeプランでは1日に{FREE_AI_CALLS_PER_DAY}回までAI機能を利用できます",
            }
        }), 403

    # Increment usage
    if usage is None:
        usage = AIUsage(user_id=user_id, date=today, count=1)
        db.session.add(usage)
    else:
        usage.count += 1
    db.session.commit()
    return None
