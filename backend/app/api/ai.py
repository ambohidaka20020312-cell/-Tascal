from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..services.ai_optimizer import AIOptimizer
from ..models.task import Task
import datetime

bp = Blueprint("ai", __name__)


@bp.get("/optimize")
@jwt_required()
def optimize():
    user_id = get_jwt_identity()
    date_str = request.args.get("date", datetime.date.today().isoformat())
    date = datetime.date.fromisoformat(date_str)

    tasks = Task.query.filter_by(user_id=user_id, scheduled_date=date, is_deleted=False).all()
    optimizer = AIOptimizer()
    result = optimizer.optimize_daily_tasks(tasks)
    return jsonify({"data": result})


@bp.post("/replan")
@jwt_required()
def replan():
    user_id = get_jwt_identity()
    data = request.get_json()

    overrun_task_id = data["overrun_task_id"]
    actual_minutes_so_far = data["actual_minutes_so_far"]

    overrun_task = Task.query.filter_by(id=overrun_task_id, user_id=user_id).first_or_404()
    remaining_tasks = Task.query.filter(
        Task.user_id == user_id,
        Task.scheduled_date == overrun_task.scheduled_date,
        Task.status == "pending",
        Task.id != overrun_task_id,
        Task.is_deleted == False,
    ).all()

    optimizer = AIOptimizer()
    result = optimizer.replan_after_overrun(overrun_task, actual_minutes_so_far, remaining_tasks)
    return jsonify({"data": result})


@bp.get("/insights")
@jwt_required()
def insights():
    user_id = get_jwt_identity()
    optimizer = AIOptimizer()
    result = optimizer.generate_weekly_insights(user_id)
    return jsonify({"data": result})
