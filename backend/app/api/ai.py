from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..services.ai_optimizer import AIOptimizer
from ..models.task import Task
from ..utils.cache import cached
from ..utils.plan_limits import check_ai_limit, require_plan
import anthropic
import datetime

bp = Blueprint("ai", __name__)


def get_llm_client():
    return anthropic.Anthropic(api_key=current_app.config["ANTHROPIC_API_KEY"])


@bp.get("/optimize")
@jwt_required()
@cached("ai_optimize", ttl=300)
def optimize():
    limit_error = check_ai_limit()
    if limit_error is not None:
        return limit_error

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
    limit_error = check_ai_limit()
    if limit_error is not None:
        return limit_error

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
@require_plan("pro")
@cached("insights", ttl=3600)
def insights():
    user_id = get_jwt_identity()
    optimizer = AIOptimizer()
    result = optimizer.generate_weekly_insights(user_id)
    return jsonify({"data": result})


@bp.get("/daily-briefing")
@jwt_required()
def daily_briefing():
    user_id = get_jwt_identity()
    today = datetime.date.today()

    tasks = Task.query.filter(
        Task.user_id == user_id,
        Task.scheduled_date == today,
        Task.is_deleted == False,
        Task.status != "completed",
    ).all()

    task_count = len(tasks)
    total_estimated_minutes = sum(
        (t.estimated_minutes or 0) for t in tasks
    )

    top_task = None
    for t in tasks:
        if t.priority in ("urgent", "high"):
            top_task = {"id": t.id, "title": t.title, "priority": t.priority}
            break

    if task_count == 0:
        message = "今日のタスクはまだありません。新しいタスクを追加して一日を計画しましょう。"
    else:
        hours = total_estimated_minutes // 60
        minutes = total_estimated_minutes % 60
        time_str = f"{hours}時間{minutes}分" if hours > 0 else f"{minutes}分"
        top_hint = f"優先度が高い「{top_task['title']}」から始めましょう。" if top_task else "計画的に取り組みましょう。"

        try:
            client = get_llm_client()
            task_titles = "、".join(t.title for t in tasks[:5])
            prompt = (
                f"今日のタスク一覧: {task_titles}。"
                f"タスク数: {task_count}件、推定合計時間: {time_str}。"
                f"ユーザーへの一言応援メッセージを日本語で1文で生成してください。"
            )
            resp = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=100,
                messages=[{"role": "user", "content": prompt}],
            )
            ai_hint = resp.content[0].text.strip()
            message = f"今日は{task_count}件のタスク、推定{time_str}です。{ai_hint}"
        except Exception:
            message = f"今日は{task_count}件のタスク、推定{time_str}です。{top_hint}"

    return jsonify({
        "data": {
            "task_count": task_count,
            "total_estimated_minutes": total_estimated_minutes,
            "message": message,
            "top_task": top_task,
        }
    })
