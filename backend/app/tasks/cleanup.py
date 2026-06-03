import datetime

from .. import db
from ..models.task import Task


def cleanup_deleted_tasks():
    """30日以上前に削除されたタスクを物理削除"""
    threshold = datetime.datetime.utcnow() - datetime.timedelta(days=30)
    deleted = Task.query.filter(
        Task.is_deleted == True,  # noqa: E712
        Task.updated_at < threshold,
    ).all()
    count = len(deleted)
    for task in deleted:
        db.session.delete(task)
    db.session.commit()
    return f"Cleaned up {count} deleted tasks"
