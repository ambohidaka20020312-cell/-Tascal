from flask import current_app
from typing import List
import datetime

from .llm_client import get_llm_client


PRIORITY_WEIGHT = {"urgent": 4, "high": 3, "medium": 2, "low": 1}


class AIOptimizer:
    def __init__(self):
        self._llm = None

    @property
    def llm(self):
        if self._llm is None:
            self._llm = get_llm_client()
        return self._llm

    def optimize_daily_tasks(self, tasks: List) -> dict:
        if not tasks:
            return {"schedule": [], "message": "今日のタスクはありません。"}

        scored = sorted(tasks, key=lambda t: (
            -PRIORITY_WEIGHT.get(t.priority, 2),
            t.due_datetime or datetime.datetime.max,
            t.sort_order,
        ))

        schedule = [{"task": t.to_dict(), "suggested_order": i + 1} for i, t in enumerate(scored)]

        total_minutes = sum(t.estimated_minutes or 30 for t in tasks)
        task_list = "\n".join(
            f"- {t.title}（優先度: {t.priority}, 目標時間: {t.estimated_minutes or '未設定'}分）"
            for t in scored
        )

        message = self._call_llm(
            f"以下のタスクリストを最適な順番に並べました。合計予定時間は{total_minutes}分です。\n{task_list}\n\n"
            "ユーザーへの励ましと今日の取り組み方のアドバイスを2〜3文で日本語で提供してください。"
        )

        return {"schedule": schedule, "total_estimated_minutes": total_minutes, "message": message}

    def replan_after_overrun(self, overrun_task, actual_minutes: int, remaining_tasks: List) -> dict:
        overrun_by = actual_minutes - (overrun_task.estimated_minutes or 30)

        if not remaining_tasks:
            return {"schedule": [], "message": "残りのタスクはありません。お疲れ様でした！"}

        scored = sorted(remaining_tasks, key=lambda t: -PRIORITY_WEIGHT.get(t.priority, 2))
        schedule = [{"task": t.to_dict(), "suggested_order": i + 1} for i, t in enumerate(scored)]

        remaining_total = sum(t.estimated_minutes or 30 for t in remaining_tasks)
        task_list = "\n".join(f"- {t.title}（目標: {t.estimated_minutes or 30}分）" for t in scored)

        message = self._call_llm(
            f"「{overrun_task.title}」が予定より{overrun_by}分オーバーしました。"
            f"残りタスク（合計{remaining_total}分）の再計画が必要です：\n{task_list}\n\n"
            "優先度を考慮した残りタスクへの切り替えアドバイスを2〜3文で日本語で提供してください。"
        )

        return {"schedule": schedule, "overrun_minutes": overrun_by, "message": message}

    def generate_weekly_insights(self, user_id: str) -> dict:
        message = self._call_llm(
            "ユーザーの週次タスク管理に対する一般的なアドバイスを3つ、箇条書きで日本語で提供してください。"
        )
        return {"message": message}

    def _call_llm(self, prompt: str) -> str:
        return self.llm.chat(prompt)
