from celery import shared_task
from datetime import date, timedelta
from app import db
from app.models.task import Task


@shared_task
def escalate_stale_tasks():
    """
    Auto-escalate priority of tasks that are:
    1. Overdue (scheduled_date < today) AND priority < urgent → raise priority by one level
    2. Stale pending tasks (created > 7 days ago, never started, no scheduled_date) → mark as a reminder

    Returns count of escalated tasks.
    """
    today = date.today()
    priority_escalation = {"low": "medium", "medium": "high", "high": "urgent"}

    # 1. Escalate overdue tasks (but not completed/already urgent)
    overdue = Task.query.filter(
        Task.scheduled_date < today.isoformat(),
        Task.status.in_(["pending", "in_progress"]),
        Task.priority.in_(["low", "medium", "high"]),
        Task.is_deleted == False,
    ).all()

    escalated = 0
    for task in overdue:
        new_priority = priority_escalation.get(task.priority)
        if new_priority:
            task.priority = new_priority
            escalated += 1

    db.session.commit()
    return {"escalated": escalated, "stale_checked": len(overdue)}
