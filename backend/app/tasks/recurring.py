"""Generate next occurrence of recurring tasks."""
from celery import shared_task
from datetime import date, timedelta
from ..models.task import Task
from .. import db

WEEKDAY_MAP = {"MON": 0, "TUE": 1, "WED": 2, "THU": 3, "FRI": 4, "SAT": 5, "SUN": 6}


def _next_date(rule: str, from_date: date) -> date | None:
    """Compute the next scheduled date for a recurrence rule."""
    if rule == "daily":
        return from_date + timedelta(days=1)
    if rule == "weekdays":
        d = from_date + timedelta(days=1)
        while d.weekday() >= 5:
            d += timedelta(days=1)
        return d
    if rule.startswith("weekly:"):
        days = [WEEKDAY_MAP[x] for x in rule[7:].split(",") if x in WEEKDAY_MAP]
        if not days:
            return None
        d = from_date + timedelta(days=1)
        for _ in range(7):
            if d.weekday() in days:
                return d
            d += timedelta(days=1)
        return None
    if rule == "monthly":
        # Same day next month
        next_month = from_date.month % 12 + 1
        year = from_date.year + (1 if from_date.month == 12 else 0)
        try:
            return from_date.replace(year=year, month=next_month)
        except ValueError:
            return from_date.replace(year=year, month=next_month, day=28)
    return None


@shared_task
def generate_recurring_tasks():
    """Run daily at 00:05. For each completed recurring task, create next occurrence if none exists."""
    from flask import current_app
    with current_app.app_context():
        recurring = Task.query.filter(
            Task.recurrence.isnot(None),
            Task.status == "completed",
            Task.is_deleted == False,
        ).all()

        created = 0
        for task in recurring:
            base_date = task.scheduled_date or task.completed_at.date() if task.completed_at else None
            if not base_date:
                continue
            next_date = _next_date(task.recurrence, base_date)
            if not next_date:
                continue
            # Check if a pending/in_progress task with same title exists for that date
            exists = Task.query.filter_by(
                user_id=task.user_id,
                title=task.title,
                scheduled_date=next_date,
                is_deleted=False,
            ).filter(Task.status.in_(["pending", "in_progress"])).first()
            if not exists:
                new_task = Task(
                    user_id=task.user_id,
                    title=task.title,
                    description=task.description,
                    priority=task.priority,
                    estimated_minutes=task.estimated_minutes,
                    scheduled_date=next_date,
                    recurrence=task.recurrence,
                )
                db.session.add(new_task)
                created += 1

        db.session.commit()
        return f"Created {created} recurring tasks"
