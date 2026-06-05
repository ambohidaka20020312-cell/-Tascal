from celery import Celery
from celery.schedules import crontab
import os


def make_celery(app):
    celery = Celery(
        app.import_name,
        backend=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
        broker=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
    )
    celery.conf.update(app.config)
    celery.conf.beat_schedule = {
        "weekly-digest": {
            "task": "app.tasks.digest.send_weekly_digest",
            "schedule": crontab(hour=8, minute=0, day_of_week=1),  # 毎週月曜8時
        },
        "cleanup-deleted-tasks": {
            "task": "app.tasks.cleanup.cleanup_deleted_tasks",
            "schedule": crontab(hour=3, minute=0),  # 毎日3時
        },
        "generate-recurring-tasks": {
            "task": "app.tasks.recurring.generate_recurring_tasks",
            "schedule": crontab(hour=0, minute=5),
        },
        "send-due-reminders": {
            "task": "app.tasks.reminders.send_due_reminders",
            "schedule": crontab(hour=8, minute=0),  # 8am daily
        },
        "escalate-stale-tasks": {
            "task": "app.tasks.escalation.escalate_stale_tasks",
            "schedule": crontab(hour=6, minute=0),  # 6am daily
        },
    }

    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery.Task = ContextTask
    return celery
