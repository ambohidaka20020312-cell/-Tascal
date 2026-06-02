from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.task import Task
from .. import db
import datetime

bp = Blueprint("calendar", __name__)


@bp.get("/tasks")
@jwt_required()
def get_calendar_tasks():
    user_id = get_jwt_identity()
    start = request.args.get("start")
    end = request.args.get("end")

    query = Task.query.filter_by(user_id=user_id, is_deleted=False)
    if start:
        query = query.filter(Task.scheduled_date >= datetime.date.fromisoformat(start))
    if end:
        query = query.filter(Task.scheduled_date <= datetime.date.fromisoformat(end))

    tasks = query.all()
    return jsonify({"data": [t.to_dict() for t in tasks]})


@bp.post("/tasks/bulk")
@jwt_required()
def bulk_create():
    user_id = get_jwt_identity()
    items = request.get_json()

    created = []
    for item in items:
        task = Task(user_id=user_id, **item)
        db.session.add(task)
        created.append(task)

    db.session.commit()
    return jsonify({"data": [t.to_dict() for t in created], "message": f"{len(created)}件のタスクを登録しました"}), 201
