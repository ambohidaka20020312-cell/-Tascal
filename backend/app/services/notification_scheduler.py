"""
締め切りリマインダーを定期実行するスケジューラー。
Celery または APScheduler で呼び出す想定。
今は Flask CLI コマンドとして実装（手動実行可能）。
"""
import datetime
from ..models.task import Task
from .apns import send_deadline_reminder, send_task_reminder
from .. import db


def check_deadline_reminders():
    """30分以内に締め切りのタスクに通知を送る（1時間に1回呼ぶ）"""
    now = datetime.datetime.utcnow()
    remind_before = now + datetime.timedelta(minutes=30)

    tasks = Task.query.filter(
        Task.due_datetime.isnot(None),
        Task.due_datetime > now,
        Task.due_datetime <= remind_before,
        Task.status != "done",
        Task.is_deleted == False,
    ).all()

    for task in tasks:
        minutes_left = int((task.due_datetime - now).total_seconds() / 60)
        send_deadline_reminder(task.user_id, task.title, minutes_left)


def check_unstarted_reminders():
    """今日中タスクで15時時点で未着手のものに通知（1日1回）"""
    now = datetime.datetime.utcnow()
    jst_now = now + datetime.timedelta(hours=9)

    if jst_now.hour != 15:  # JST 15:00 のみ実行
        return

    tasks = Task.query.filter(
        Task.deadline_type == "today",
        Task.status == "todo",
        Task.is_deleted == False,
    ).all()

    for task in tasks:
        send_task_reminder(task.user_id, task.title)
