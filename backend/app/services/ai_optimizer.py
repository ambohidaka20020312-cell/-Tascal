import anthropic
from flask import current_app
from typing import List
import datetime


PRIORITY_WEIGHT = {"urgent": 4, "high": 3, "medium": 2, "low": 1}
DEADLINE_WEIGHT = {"today": 0, "flexible": 1, "someday": 2}  # lower = more urgent


def _minutes_until(dt: datetime.datetime) -> float:
    """Minutes from now until the given datetime. Negative means already past."""
    return (dt - datetime.datetime.now()).total_seconds() / 60


def _deadline_score(task) -> tuple:
    """
    Sort key for a task's urgency.
    Tasks with hard due_datetime come first, sorted by time remaining.
    Then deadline_type, then priority.
    """
    due: datetime.datetime | None = task.due_datetime
    if due:
        # Hard deadline: minutes remaining (smaller = more urgent)
        mins_left = _minutes_until(due)
        est = task.estimated_minutes or 30
        slack = mins_left - est  # negative slack = already at risk
        return (0, slack, -PRIORITY_WEIGHT.get(task.priority, 2))
    # No hard deadline — use deadline_type + priority
    dtype_score = DEADLINE_WEIGHT.get(getattr(task, "deadline_type", "today"), 0)
    return (1, dtype_score, -PRIORITY_WEIGHT.get(task.priority, 2))


class AIOptimizer:
    def __init__(self):
        self._client = None

    @property
    def client(self):
        if self._client is None:
            self._client = anthropic.Anthropic(api_key=current_app.config["ANTHROPIC_API_KEY"])
        return self._client

    def optimize_daily_tasks(self, tasks: List) -> dict:
        if not tasks:
            return {"schedule": [], "message": "今日のタスクはありません。"}

        fixed_tasks = [t for t in tasks if getattr(t, "is_fixed", False)]
        flex_tasks = [t for t in tasks if not getattr(t, "is_fixed", False)]

        # Fixed tasks: sort by start time, keep their slot locked
        fixed_sorted = sorted(
            fixed_tasks,
            key=lambda t: t.fixed_start_time or "00:00",
        )

        # Flexible tasks: hard deadlines first (by slack), then deadline_type + priority
        flex_sorted = sorted(flex_tasks, key=_deadline_score)

        schedule = []
        order = 1
        for t in fixed_sorted:
            schedule.append({"task": t.to_dict(), "suggested_order": order, "fixed": True})
            order += 1
        for t in flex_sorted:
            schedule.append({"task": t.to_dict(), "suggested_order": order, "fixed": False})
            order += 1

        total_minutes = sum(t.estimated_minutes or 30 for t in tasks)

        # Detect tasks at risk of missing their deadline
        at_risk = []
        cumulative = 0
        now = datetime.datetime.now()
        for entry in schedule:
            td = entry["task"]
            est = td.get("estimated_minutes") or 30
            cumulative += est
            due_str = td.get("due_datetime")
            if due_str:
                try:
                    due_dt = datetime.datetime.fromisoformat(due_str)
                    finish_at = now + datetime.timedelta(minutes=cumulative)
                    if finish_at > due_dt:
                        over_min = int((finish_at - due_dt).total_seconds() / 60)
                        at_risk.append(f"「{td['title']}」（締め切り {due_dt.strftime('%m/%d %H:%M')} を約{over_min}分オーバーの見込み）")
                except ValueError:
                    pass

        fixed_lines = "\n".join(
            f"- 【固定】{t.title}（{t.fixed_start_time or '時刻未定'}〜, {t.estimated_minutes or '?'}分）"
            for t in fixed_sorted
        )
        flex_lines = "\n".join(
            "- {title}（{deadline}優先度: {priority}, 目標: {est}分）".format(
                title=t.title,
                deadline=f"締切 {t.due_datetime.strftime('%m/%d %H:%M')} / " if t.due_datetime else "",
                priority=t.priority,
                est=t.estimated_minutes or "未設定",
            )
            for t in flex_sorted
        )
        task_list = "\n".join(filter(None, [fixed_lines, flex_lines]))
        risk_section = (
            "\n\n⚠️ 以下のタスクは現在のペースでは締め切りに間に合わない可能性があります：\n"
            + "\n".join(f"  - {r}" for r in at_risk)
            if at_risk else ""
        )

        message = self._call_claude(
            f"以下のタスクリストを最適な順番に並べました。合計予定時間は{total_minutes}分です。\n"
            f"【固定】タスクは時間が決まっているため移動できません。{risk_section}\n{task_list}\n\n"
            "ユーザーへの励ましと今日の取り組み方のアドバイスを2〜3文で日本語で提供してください。"
            + ("締め切りリスクについても一言触れてください。" if at_risk else "")
        )

        return {
            "schedule": schedule,
            "total_estimated_minutes": total_minutes,
            "message": message,
            "at_risk_deadlines": at_risk,
        }

    def replan_after_overrun(self, overrun_task, actual_minutes: int, remaining_tasks: List) -> dict:
        overrun_by = actual_minutes - (overrun_task.estimated_minutes or 30)

        if not remaining_tasks:
            return {"schedule": [], "message": "残りのタスクはありません。お疲れ様でした！"}

        fixed_remaining = [t for t in remaining_tasks if getattr(t, "is_fixed", False)]
        flex_remaining = [t for t in remaining_tasks if not getattr(t, "is_fixed", False)]

        flex_scored = sorted(flex_remaining, key=_deadline_score)
        fixed_scored = sorted(fixed_remaining, key=lambda t: t.fixed_start_time or "00:00")

        schedule = []
        order = 1
        for t in fixed_scored:
            schedule.append({"task": t.to_dict(), "suggested_order": order, "fixed": True})
            order += 1
        for t in flex_scored:
            schedule.append({"task": t.to_dict(), "suggested_order": order, "fixed": False})
            order += 1

        remaining_total = sum(t.estimated_minutes or 30 for t in remaining_tasks)
        fixed_warning = (
            f"なお、{len(fixed_remaining)}件の固定タスク（会議等）は時間変更できません。"
            if fixed_remaining else ""
        )
        task_list = "\n".join(f"- {t.title}（目標: {t.estimated_minutes or 30}分）" for t in flex_scored)

        message = self._call_claude(
            f"「{overrun_task.title}」が予定より{overrun_by}分オーバーしました。"
            f"残りタスク（合計{remaining_total}分）の再計画が必要です。{fixed_warning}\n{task_list}\n\n"
            "優先度を考慮した残りタスクへの切り替えアドバイスを2〜3文で日本語で提供してください。"
        )

        return {"schedule": schedule, "overrun_minutes": overrun_by, "message": message}

    def generate_weekly_insights(self, user_id: str) -> dict:
        from ..models.task import Task

        today = datetime.date.today()
        week_ago = today - datetime.timedelta(days=6)

        # Fetch last 7 days of tasks for this user
        tasks = Task.query.filter(
            Task.user_id == user_id,
            Task.scheduled_date >= week_ago,
            Task.scheduled_date <= today,
            Task.is_deleted == False,
        ).all()

        # Week-level stats
        total_tasks = len(tasks)
        completed_tasks_list = [t for t in tasks if t.status == "completed"]
        completed_count = len(completed_tasks_list)
        completion_rate = round(completed_count / total_tasks * 100) if total_tasks else 0

        actual_times = [t.actual_minutes for t in completed_tasks_list if t.actual_minutes is not None]
        estimated_times = [t.estimated_minutes for t in completed_tasks_list if t.estimated_minutes is not None]
        avg_actual = round(sum(actual_times) / len(actual_times)) if actual_times else 0
        avg_estimated = round(sum(estimated_times) / len(estimated_times)) if estimated_times else 0
        overrun_count = sum(
            1 for t in completed_tasks_list
            if t.actual_minutes and t.estimated_minutes and t.actual_minutes > t.estimated_minutes
        )

        week_stats = {
            "completion_rate": completion_rate,
            "total_tasks": total_tasks,
            "completed_tasks": completed_count,
            "avg_actual_minutes": avg_actual,
            "avg_estimated_minutes": avg_estimated,
            "overrun_count": overrun_count,
        }

        # Daily completion for last 7 days
        daily_completion = []
        for i in range(6, -1, -1):
            d = today - datetime.timedelta(days=i)
            day_tasks = [t for t in tasks if t.scheduled_date == d]
            day_completed = sum(1 for t in day_tasks if t.status == "completed")
            daily_completion.append({
                "date": d.isoformat(),
                "completed": day_completed,
                "total": len(day_tasks),
            })

        # Priority breakdown across all tasks
        priority_breakdown = {"urgent": 0, "high": 0, "medium": 0, "low": 0}
        for t in tasks:
            p = t.priority if t.priority in priority_breakdown else "low"
            priority_breakdown[p] += 1

        # Accuracy trend: actual/estimated ratio per day
        accuracy_trend = []
        for i in range(6, -1, -1):
            d = today - datetime.timedelta(days=i)
            day_tasks = [
                t for t in tasks
                if t.scheduled_date == d
                and t.status == "completed"
                and t.actual_minutes
                and t.estimated_minutes
            ]
            if day_tasks:
                ratio = round(
                    sum(t.actual_minutes for t in day_tasks) /
                    sum(t.estimated_minutes for t in day_tasks),
                    2,
                )
            else:
                ratio = None
            accuracy_trend.append({"date": d.isoformat(), "ratio": ratio})

        # AI message
        message = self._call_claude(
            "ユーザーの週次タスク管理に対する一般的なアドバイスを3つ、箇条書きで日本語で提供してください。"
        )

        return {
            "message": message,
            "week_stats": week_stats,
            "daily_completion": daily_completion,
            "priority_breakdown": priority_breakdown,
            "accuracy_trend": accuracy_trend,
        }

    def _call_claude(self, prompt: str) -> str:
        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=512,
                messages=[{"role": "user", "content": prompt}],
            )
            return response.content[0].text
        except Exception as e:
            current_app.logger.error(f"Claude API error: {e}")
            return "AIアドバイスを取得できませんでした。"
