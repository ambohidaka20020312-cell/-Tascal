from celery import shared_task
from datetime import date, timedelta
from app import db
from app.models.task import Task
from app.models.user import User
from app.tasks.push_notifications import send_push_to_user


@shared_task
def send_due_reminders():
    """Send push notifications for tasks due tomorrow and today (overdue)."""
    today = date.today()
    tomorrow = today + timedelta(days=1)

    # Tasks due today (not completed)
    due_today = Task.query.filter(
        Task.scheduled_date == today.isoformat(),
        Task.status.in_(["pending", "in_progress"]),
        Task.is_deleted == False,
    ).all()

    # Tasks due tomorrow
    due_tomorrow = Task.query.filter(
        Task.scheduled_date == tomorrow.isoformat(),
        Task.status.in_(["pending", "in_progress"]),
        Task.is_deleted == False,
    ).all()

    # Group by user
    from collections import defaultdict
    by_user_today = defaultdict(list)
    by_user_tomorrow = defaultdict(list)

    for t in due_today:
        by_user_today[t.user_id].append(t.title)
    for t in due_tomorrow:
        by_user_tomorrow[t.user_id].append(t.title)

    # Send notifications
    for user_id, titles in by_user_today.items():
        count = len(titles)
        send_push_to_user(
            user_id=user_id,
            title=f"今日締切: {count}件のタスク",
            body=titles[0] if count == 1 else f"{titles[0]} 他{count-1}件",
            url="/",
        )

    for user_id, titles in by_user_tomorrow.items():
        count = len(titles)
        send_push_to_user(
            user_id=user_id,
            title=f"明日締切: {count}件のタスク",
            body=titles[0] if count == 1 else f"{titles[0]} 他{count-1}件",
            url="/",
        )

    return {"today": len(due_today), "tomorrow": len(due_tomorrow)}
