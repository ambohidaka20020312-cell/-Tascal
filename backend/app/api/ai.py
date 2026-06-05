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


@bp.get("/suggestions")
@jwt_required()
@cached("ai_suggestions", ttl=3600)
def get_suggestions():
    """Analyze user's completed tasks and suggest new ones."""
    import json
    from anthropic import Anthropic

    user_id = get_jwt_identity()

    thirty_days_ago = (datetime.date.today() - datetime.timedelta(days=30)).isoformat()
    completed = Task.query.filter(
        Task.user_id == user_id,
        Task.status == "completed",
        Task.created_at >= thirty_days_ago,
        Task.is_deleted == False,
    ).limit(50).all()

    if len(completed) < 3:
        return jsonify({"data": {"suggestions": [], "message": "もっとタスクを完了すると提案が増えます"}})

    task_list = "\n".join([
        f"- {t.title} (優先度: {t.priority}, カテゴリ: {t.category_id or 'なし'})"
        for t in completed[:20]
    ])

    client = Anthropic(api_key=current_app.config["ANTHROPIC_API_KEY"])
    msg = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=400,
        messages=[{
            "role": "user",
            "content": f"""以下は過去30日間に完了したタスクです:
{task_list}

このパターンから、ユーザーが次に取り組むべきタスクを5つ提案してください。
JSON配列形式で返してください（```jsonコードブロック不要、直接配列のみ）:
[
  {{"title": "タスク名", "priority": "medium", "estimated_minutes": 30, "reason": "提案理由（短く）"}},
  ...
]"""
        }]
    )

    try:
        suggestions = json.loads(msg.content[0].text)
        if not isinstance(suggestions, list):
            suggestions = []
    except (json.JSONDecodeError, IndexError):
        suggestions = []

    return jsonify({"data": {"suggestions": suggestions[:5]}})


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


@bp.get("/estimation-patterns")
@jwt_required()
def estimation_patterns():
    from ..services.estimation_engine import get_user_estimation_patterns
    user_id = get_jwt_identity()
    patterns = get_user_estimation_patterns(user_id)
    return jsonify({"data": patterns})


@bp.post("/estimate-duration")
@jwt_required()
def estimate_duration():
    """
    Given a task title (+ optional description/category), ask Claude to
    estimate how many minutes the task will likely take.
    Returns { minutes: int, confidence: "high"|"medium"|"low", reason: str }
    Free plan: counts against the daily AI limit.
    """
    limit_error = check_ai_limit()
    if limit_error is not None:
        return limit_error

    body = request.get_json(silent=True) or {}
    title = (body.get("title") or "").strip()
    description = (body.get("description") or "").strip()
    category_name = (body.get("category_name") or "").strip()

    if not title:
        return jsonify({"error": {"code": "MISSING_TITLE", "message": "title は必須です"}}), 400

    context_parts = [f"タスク名: {title}"]
    if description:
        context_parts.append(f"詳細: {description}")
    if category_name:
        context_parts.append(f"カテゴリ: {category_name}")
    context = "\n".join(context_parts)

    prompt = f"""\
あなたはタスク管理の専門家です。以下のタスクが完了するまでにかかる時間を見積もってください。

{context}

以下のJSON形式のみで回答してください（他の文言は一切不要）:
{{"minutes": <整数>, "confidence": "<high|medium|low>", "reason": "<日本語で一文>"}}

見積もりの目安:
- メール返信・確認: 5〜15分
- 簡単なタスク・レポート確認: 15〜30分
- 中程度の作業・会議: 30〜60分
- 複雑な作業・資料作成: 60〜120分
- 大きなプロジェクト作業: 120分以上"""

    try:
        client = get_llm_client()
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=100,
            messages=[{"role": "user", "content": prompt}],
        )
        import json, re
        raw = response.content[0].text.strip()
        # Extract JSON even if wrapped in markdown
        m = re.search(r'\{.*\}', raw, re.DOTALL)
        if not m:
            raise ValueError("no JSON in response")
        data = json.loads(m.group())
        minutes = max(5, min(480, int(data.get("minutes", 30))))
        confidence = data.get("confidence", "medium")
        reason = data.get("reason", "")
        return jsonify({"data": {"minutes": minutes, "confidence": confidence, "reason": reason}})
    except Exception as e:
        current_app.logger.warning("estimate-duration failed: %s", e)
        return jsonify({"data": {"minutes": 30, "confidence": "low", "reason": "見積もりを取得できませんでした"}})


@bp.post("/estimation-suggest")
@jwt_required()
def estimation_suggest():
    from ..services.estimation_engine import get_user_estimation_patterns, suggest_minutes
    user_id = get_jwt_identity()
    body = request.get_json(silent=True) or {}
    estimated = int(body.get("estimated_minutes", 0))
    category_id = body.get("category_id")
    priority = body.get("priority", "medium")

    patterns = get_user_estimation_patterns(user_id)
    suggestion = suggest_minutes(estimated, patterns, category_id, priority)
    return jsonify({"data": suggestion})
