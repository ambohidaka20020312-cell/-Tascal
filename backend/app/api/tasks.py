from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.task import Task
from ..models.task_note import TaskNote
from ..models.user import User
from .. import db
from ..utils.validators import validate_task_fields, sanitize_string
from ..utils.cache import cached, invalidate_user_cache
from ..utils.plan_limits import check_task_limit
from sqlalchemy import func
import csv
import datetime
import io
import json

FREE_MONTHLY_TASK_LIMIT = 20

bp = Blueprint("tasks", __name__)


@bp.get("")
@jwt_required()
@cached("tasks", ttl=60)
def list_tasks():
    user_id = get_jwt_identity()
    date_str = request.args.get("date")

    query = Task.query.filter_by(user_id=user_id, is_deleted=False)
    if date_str:
        date = datetime.date.fromisoformat(date_str)
        query = query.filter_by(scheduled_date=date)

    q = request.args.get("q", "").strip()
    if q:
        query = query.filter(
            db.or_(
                Task.title.ilike(f"%{q}%"),
                Task.description.ilike(f"%{q}%"),
            )
        )

    category_id_str = request.args.get("category_id")
    if category_id_str is not None:
        try:
            category_id = int(category_id_str)
            query = query.filter_by(category_id=category_id)
        except ValueError:
            pass

    tasks = query.order_by(Task.sort_order.asc().nullslast(), Task.created_at.desc()).all()
    return jsonify({"data": [t.to_dict() for t in tasks]})


@bp.get("/overdue")
@jwt_required()
def overdue_tasks():
    user_id = get_jwt_identity()
    today = datetime.date.today()
    tasks = Task.query.filter(
        Task.user_id == user_id,
        Task.scheduled_date < today,
        Task.status.notin_(["completed", "done"]),
        Task.is_deleted == False,
    ).order_by(Task.scheduled_date.asc()).all()
    return jsonify({"data": [t.to_dict() for t in tasks], "count": len(tasks)})


@bp.patch("/reorder")
@jwt_required()
def reorder_tasks():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    order = data.get("order", [])

    if not isinstance(order, list):
        return jsonify({"error": {"code": "INVALID_INPUT", "message": "order must be a list of task IDs"}}), 400

    for position, task_id in enumerate(order):
        task = Task.query.filter_by(id=task_id, user_id=user_id, is_deleted=False).first()
        if task:
            task.sort_order = position

    db.session.commit()
    invalidate_user_cache(user_id)
    return jsonify({"message": "タスクの並び順を更新しました"})


@bp.post("")
@jwt_required()
def create_task():
    limit_error = check_task_limit()
    if limit_error is not None:
        return limit_error

    user_id = get_jwt_identity()
    data = request.get_json() or {}

    if not data.get("title"):
        return jsonify({"error": {"code": "MISSING_FIELDS", "message": "タイトルは必須です"}}), 400

    ok, msg = validate_task_fields(data)
    if not ok:
        return jsonify({"error": {"code": "VALIDATION_ERROR", "message": msg}}), 400

    title = sanitize_string(data.get("title", ""), max_length=200)
    description = sanitize_string(data.get("description", "") or "", max_length=2000)

    task = Task(
        user_id=user_id,
        title=title,
        description=description,
        priority=data.get("priority", "medium"),
        estimated_minutes=data.get("estimated_minutes"),
        scheduled_date=data.get("scheduled_date"),
        due_datetime=data.get("due_datetime"),
        recurrence=data.get("recurrence"),
        recurrence_end_date=data.get("recurrence_end_date"),
        category_id=data.get("category_id"),
        parent_task_id=data.get("parent_task_id"),
        is_fixed=data.get("is_fixed", False),
        fixed_start_time=data.get("fixed_start_time"),
        deadline_type=data.get("deadline_type", "today"),
    )
    db.session.add(task)
    db.session.commit()
    invalidate_user_cache(user_id)

    # Googleカレンダーへの自動同期
    user = User.query.get(user_id)
    if user and user.google_calendar_sync_enabled and user.google_calendar_token:
        try:
            from ..api.integrations import sync_task_to_google
            sync_task_to_google(user, task)
        except Exception:
            pass

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

    if "title" in data:
        data["title"] = sanitize_string(data["title"], max_length=200)
    if "description" in data:
        data["description"] = sanitize_string(data.get("description") or "", max_length=2000)

    for field in ["title", "description", "priority", "estimated_minutes", "scheduled_date", "due_datetime", "sort_order", "status", "recurrence", "recurrence_end_date", "category_id", "is_fixed", "fixed_start_time", "deadline_type"]:
        if field in data:
            setattr(task, field, data[field])

    db.session.commit()
    invalidate_user_cache(user_id)
    return jsonify({"data": task.to_dict()})


@bp.delete("/<int:task_id>")
@jwt_required()
def delete_task(task_id):
    user_id = get_jwt_identity()
    task = Task.query.filter_by(id=task_id, user_id=user_id, is_deleted=False).first_or_404()
    task.is_deleted = True
    db.session.commit()
    invalidate_user_cache(user_id)
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
    invalidate_user_cache(user_id)
    response_data = {"data": task.to_dict(), "message": "タスクを完了しました"}
    if next_task:
        response_data["next_task"] = next_task.to_dict()
    return jsonify(response_data)


@bp.post("/bulk-complete")
@jwt_required()
def bulk_complete():
    data = request.get_json()
    ids = data.get("ids", [])
    user_id = get_jwt_identity()
    tasks = Task.query.filter(Task.id.in_(ids), Task.user_id == user_id).all()
    for task in tasks:
        task.status = "completed"
        task.actual_minutes = 0
        task.completed_at = datetime.datetime.utcnow()
    db.session.commit()
    invalidate_user_cache(user_id)
    return jsonify({"data": {"count": len(tasks)}, "message": f"{len(tasks)}件を完了にしました"})


@bp.delete("/bulk")
@jwt_required()
def bulk_delete():
    data = request.get_json()
    ids = data.get("ids", [])
    user_id = get_jwt_identity()
    count = Task.query.filter(Task.id.in_(ids), Task.user_id == user_id).update({"is_deleted": True}, synchronize_session=False)
    db.session.commit()
    invalidate_user_cache(user_id)
    return jsonify({"data": {"count": count}, "message": f"{count}件を削除しました"})


@bp.get("/stats")
@jwt_required()
def task_stats():
    user_id = get_jwt_identity()
    today = datetime.date.today()
    week_ago = today - datetime.timedelta(days=7)
    month_ago = today - datetime.timedelta(days=30)

    def completion_rate(since: datetime.date) -> float:
        total = Task.query.filter(
            Task.user_id == user_id,
            Task.is_deleted == False,
            Task.scheduled_date >= since,
            Task.scheduled_date <= today,
        ).count()
        if total == 0:
            return 0.0
        completed = Task.query.filter(
            Task.user_id == user_id,
            Task.is_deleted == False,
            Task.scheduled_date >= since,
            Task.scheduled_date <= today,
            Task.status == "completed",
        ).count()
        return round(completed / total, 4)

    weekly_completion_rate = completion_rate(week_ago)
    monthly_completion_rate = completion_rate(month_ago)

    total_completed = Task.query.filter(
        Task.user_id == user_id,
        Task.is_deleted == False,
        Task.status == "completed",
    ).count()

    streak = 0
    check_date = today
    while True:
        count = Task.query.filter(
            Task.user_id == user_id,
            Task.is_deleted == False,
            Task.status == "completed",
            Task.scheduled_date == check_date,
        ).count()
        if count == 0:
            break
        streak += 1
        check_date -= datetime.timedelta(days=1)

    accuracy_tasks = Task.query.filter(
        Task.user_id == user_id,
        Task.is_deleted == False,
        Task.status == "completed",
        Task.actual_minutes.isnot(None),
        Task.estimated_minutes.isnot(None),
        Task.estimated_minutes > 0,
    ).all()

    if accuracy_tasks:
        ratios = [t.actual_minutes / t.estimated_minutes for t in accuracy_tasks]
        raw_accuracy = sum(ratios) / len(ratios)
        time_accuracy = round(max(0.0, 1.0 - abs(1.0 - raw_accuracy)), 4)
    else:
        time_accuracy = 0.0

    total = Task.query.filter_by(user_id=user_id, is_deleted=False).count()
    completed_today = Task.query.filter(
        Task.user_id == user_id,
        Task.status == "completed",
        Task.updated_at >= today.isoformat(),
        Task.is_deleted == False,
    ).count()
    overdue = Task.query.filter(
        Task.user_id == user_id,
        Task.scheduled_date < today.isoformat(),
        Task.status.in_(["pending", "in_progress"]),
        Task.is_deleted == False,
    ).count()
    pending = Task.query.filter_by(user_id=user_id, status="pending", is_deleted=False).count()

    return jsonify({
        "data": {
            "weekly_completion_rate": weekly_completion_rate,
            "monthly_completion_rate": monthly_completion_rate,
            "current_streak": streak,
            "time_accuracy": time_accuracy,
            "total_completed": total_completed,
            "total": total,
            "completed_today": completed_today,
            "overdue": overdue,
            "pending": pending,
        }
    })


@bp.get("/export")
@jwt_required()
def export_tasks():
    user_id = get_jwt_identity()
    fmt = request.args.get("format", "json").lower()
    start_str = request.args.get("start")
    end_str = request.args.get("end")

    query = Task.query.filter_by(user_id=user_id, is_deleted=False)
    if start_str:
        try:
            start_date = datetime.date.fromisoformat(start_str)
            query = query.filter(Task.scheduled_date >= start_date)
        except ValueError:
            return jsonify({"error": {"code": "INVALID_DATE", "message": "start の日付形式が無効です"}}), 400
    if end_str:
        try:
            end_date = datetime.date.fromisoformat(end_str)
            query = query.filter(Task.scheduled_date <= end_date)
        except ValueError:
            return jsonify({"error": {"code": "INVALID_DATE", "message": "end の日付形式が無効です"}}), 400

    tasks = query.order_by(Task.scheduled_date.asc().nullslast(), Task.created_at.asc()).all()
    today_str = datetime.date.today().isoformat()

    if fmt == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "id", "title", "description", "priority", "status",
            "estimated_minutes", "actual_minutes", "scheduled_date",
            "category_id", "recurrence", "created_at",
        ])
        for t in tasks:
            writer.writerow([
                t.id, t.title, t.description, t.priority, t.status,
                t.estimated_minutes, t.actual_minutes, t.scheduled_date,
                t.category_id, t.recurrence, t.created_at,
            ])
        csv_data = output.getvalue()
        return Response(
            csv_data,
            mimetype="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="tascal_tasks_{today_str}.csv"',
            },
        )
    else:
        task_list = [t.to_dict() for t in tasks]
        json_data = json.dumps(task_list, ensure_ascii=False, default=str)
        return Response(
            json_data,
            mimetype="application/json",
            headers={
                "Content-Disposition": f'attachment; filename="tascal_tasks_{today_str}.json"',
            },
        )


@bp.get("/<int:task_id>/subtasks")
@jwt_required()
def list_subtasks(task_id):
    user_id = get_jwt_identity()
    Task.query.filter_by(id=task_id, user_id=user_id, is_deleted=False).first_or_404()
    subtasks = Task.query.filter_by(parent_task_id=task_id, user_id=user_id, is_deleted=False).order_by(Task.created_at.asc()).all()
    return jsonify({"data": [t.to_dict() for t in subtasks]})


@bp.get("/<int:task_id>/notes")
@jwt_required()
def list_notes(task_id):
    user_id = get_jwt_identity()
    task = Task.query.filter_by(id=task_id, user_id=user_id, is_deleted=False).first_or_404()
    notes = TaskNote.query.filter_by(task_id=task.id).order_by(TaskNote.created_at.asc()).all()
    return jsonify({"data": [n.to_dict() for n in notes]})


@bp.post("/<int:task_id>/notes")
@jwt_required()
def create_note(task_id):
    user_id = get_jwt_identity()
    task = Task.query.filter_by(id=task_id, user_id=user_id, is_deleted=False).first_or_404()
    data = request.get_json() or {}
    content = data.get("content", "").strip()
    if not content:
        return jsonify({"error": {"code": "MISSING_FIELDS", "message": "メモの内容は必須です"}}), 400
    note = TaskNote(task_id=task.id, user_id=user_id, content=content)
    db.session.add(note)
    db.session.commit()
    return jsonify({"data": note.to_dict(), "message": "メモを追加しました"}), 201


@bp.delete("/<int:task_id>/notes/<int:note_id>")
@jwt_required()
def delete_note(task_id, note_id):
    user_id = get_jwt_identity()
    task = Task.query.filter_by(id=task_id, user_id=user_id, is_deleted=False).first_or_404()
    note = TaskNote.query.filter_by(id=note_id, task_id=task.id, user_id=user_id).first_or_404()
    db.session.delete(note)
    db.session.commit()
    return jsonify({"message": "メモを削除しました"})


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
