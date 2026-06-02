from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.task import Task
from .. import db
import datetime

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
    data = request.get_json()

    task = Task(
        user_id=user_id,
        title=data["title"],
        description=data.get("description", ""),
        priority=data.get("priority", "medium"),
        estimated_minutes=data.get("estimated_minutes"),
        scheduled_date=data.get("scheduled_date"),
        due_datetime=data.get("due_datetime"),
    )
    db.session.add(task)
    db.session.commit()
    return jsonify({"data": task.to_dict(), "message": "タスクを作成しました"}), 201


@bp.patch("/<int:task_id>")
@jwt_required()
def update_task(task_id):
    user_id = get_jwt_identity()
    task = Task.query.filter_by(id=task_id, user_id=user_id, is_deleted=False).first_or_404()

    data = request.get_json()
    for field in ["title", "description", "priority", "estimated_minutes", "scheduled_date", "due_datetime", "sort_order", "status"]:
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
    db.session.commit()
    return jsonify({"data": task.to_dict(), "message": "タスクを完了しました"})
