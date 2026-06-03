import datetime
import logging
import os

import anthropic

from .. import db
from ..models.task import Task
from ..models.user import User

logger = logging.getLogger(__name__)


def send_weekly_digest():
    """
    全ユーザーに週次ダイジェストメールを送信。
    現状はログ出力のみ（SMTPは設定次第）。
    """
    week_ago = datetime.date.today() - datetime.timedelta(days=7)
    users = User.query.all()

    for user in users:
        # digest配信停止ユーザーはスキップ
        if user.digest_unsubscribed:
            continue

        # 先週のタスク統計
        tasks = Task.query.filter(
            Task.user_id == user.id,
            Task.scheduled_date >= week_ago,
            Task.is_deleted == False,  # noqa: E712
        ).all()

        if not tasks:
            continue

        completed = [t for t in tasks if t.status == "completed"]
        completion_rate = len(completed) / len(tasks) if tasks else 0

        # AI生成サマリー（失敗してもスキップ）
        try:
            api_key = os.getenv("ANTHROPIC_API_KEY")
            client = anthropic.Anthropic(api_key=api_key)
            message = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=100,
                messages=[
                    {
                        "role": "user",
                        "content": (
                            f"ユーザーの先週のタスク完了率は{completion_rate:.0%}でした。"
                            f"完了:{len(completed)}件、合計:{len(tasks)}件。"
                            f"50文字以内で励ましのメッセージを生成してください。"
                        ),
                    }
                ],
            )
            summary = message.content[0].text
        except Exception:
            summary = f"先週は{len(completed)}件のタスクを完了しました。今週も頑張りましょう！"

        # TODO: 実際のメール送信（Flask-Mail or SendGrid）
        # 現状はアプリログに出力
        logger.info(
            "Weekly digest for %s: %d/%d completed (%.0f%%) — %s",
            user.email,
            len(completed),
            len(tasks),
            completion_rate * 100,
            summary,
        )

    return f"Sent digest to {len(users)} users"
