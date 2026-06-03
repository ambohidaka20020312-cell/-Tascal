from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.task import Task
from ..models.user import User
from .. import db
from ..utils.validators import validate_task_fields
import datetime

FREE_MONTHLY_TASK_LIMIT = 20

bp = Blueprint("tasks", __name__)


@bp.get("")
@jwt_required()
def list_tasks():
    user_id = get_jwt_identity()
    date_str = request.args.get("date")

    query = Task.query.filter_by(user_id=user_id, is_deleted=False)
    if date_str:
        date = datetime.date.fromisoformat(date_str)
        query = query.filter_by(scheduled_date=date)

    tasks = query.order_by(Task.sort_order).all()
    return jsonify({"data": [t.to_dict() for t in tasks]})


@bp.post("")
@jwt_required()
def create_task():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if user and user.plan == "free":
        now = datetime.datetime.utcnow()
        month_count = Task.query.filter(
            Task.user_id == user_id,
            Task.is_deleted == False,
            Task.created_at >= datetime.datetime(now.year, now.month, 1),
        ).count()
        if month_count >= FREE_MONTHLY_TASK_LIMIT:
            return jsonify({
                "error": {
                    "code": "TASK_LIMIT_EXCEEDED",
                    "message": f"Freeプランでは1か月に{FREE_MONTHLY_TASK_LIMIT}件までタスクを作成できます",
                }
            }), 403

    data = request.get_json() or {}

    if not data.get("title"):
        return jsonify({"error": {"code": "MISSING_FIELDS", "message": "タイトルは必須です"}}), 400

    ok, msg = validate_task_fields(data)
    if not ok:
        return jsonify({"error": {"code": "VALIDATION_ERROR", "message": msg}}), 400

    task = Task(
        user_id=user_id,
        title=data["title"],
        description=data.get("description", ""),
        priority=data.get("priority", "medium"),
        estimated_minutes=data.get("estimated_minutes"),
        scheduled_date=data.get("scheduled_date"),
        due_datetime=data.get("due_datetime"),
        recurrence=data.get("recurrence"),
        recurrence_end_date=data.get("recurrence_end_date"),
    )
    db.session.add(task)
    db.session.commit()
    return jsonify({"data": task.to_dict(), "message": "タスクを作成しました"}), 201


@bp.patch("/<int:task_id>")
@jwt_required()
def update_task(task_id):
    user_id = get_jwt_identity()
    task = Task.query.filter_by(id=task_id, user_id=user_id, is_deleted=False).first_or_404()

    data = request.get_json() or {}

    ok, msg = validate_task_fields(data)
    if not ok:
        return jsonify({"error": {"code": "VALIDATION_ERROR", "message": msg}}), 400

    for field in ["title", "description", "priority", "estimated_minutes", "scheduled_date", "due_datetime", "sort_order", "status", "recurrence", "recurrence_end_date"]:
        if field in data:
            setattr(task, field, data[field])

    db.session.commit()
    return jsonify({"data": task.to_dict()})


@bp.delete("/<int:task_id>")
@jwt_required()
def delete_task(task_id):
    user_id = get_jwt_identity()
    task = Task.query.filter_by(id=task_id, user_id=user_id, is_deleted=False).first_or_404()
    task.is_deleted = True
    db.session.commit()
    return jsonify({"message": "タスクを削除しました"})


@bp.post("/<int:task_id>/complete")
@jwt_required()
def complete_task(task_id):
    user_id = get_jwt_identity()
    task = Task.query.filter_by(id=task_id, user_id=user_id, is_deleted=False).first_or_404()

    data = request.get_json()
    task.status = "completed"
    task.actual_minutes = data.get("actual_minutes")
    task.completed_at = datetime.datetime.utcnow()

    next_task = None
    if task.recurrence and task.recurrence != "none":
        base_date = task.scheduled_date or datetime.date.today()
        next_date = _next_recurrence_date(task.recurrence, base_date)

        # Skip if past recurrence_end_date
        if task.recurrence_end_date is None or next_date <= task.recurrence_end_date:
            next_task = Task(
                user_id=task.user_id,
                title=task.title,
                description=task.description,
                priority=task.priority,
                estimated_minutes=task.estimated_minutes,
                scheduled_date=next_date,
                due_datetime=task.due_datetime,
                recurrence=task.recurrence,
                recurrence_end_date=task.recurrence_end_date,
                sort_order=task.sort_order,
            )
            db.session.add(next_task)

    db.session.commit()
    response_data = {"data": task.to_dict(), "message": "タスクを完了しました"}
    if next_task:
        response_data["next_task"] = next_task.to_dict()
    return jsonify(response_data)


def _next_recurrence_date(recurrence: str, base_date: datetime.date) -> datetime.date:
    if recurrence == "daily":
        return base_date + datetime.timedelta(days=1)
    elif recurrence == "weekly":
        return base_date + datetime.timedelta(weeks=1)
    elif recurrence == "monthly":
        month = base_date.month + 1
        year = base_date.year + (month - 1) // 12
        month = ((month - 1) % 12) + 1
        import calendar
        day = min(base_date.day, calendar.monthrange(year, month)[1])
        return datetime.date(year, month, day)
    elif recurrence == "weekdays":
        next_d = base_date + datetime.timedelta(days=1)
        while next_d.weekday() >= 5:  # Saturday=5, Sunday=6
            next_d += datetime.timedelta(days=1)
        return next_d
    return base_date + datetime.timedelta(days=1)
