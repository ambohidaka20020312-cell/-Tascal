from .. import db
import datetime


class Task(db.Model):
    __tablename__ = "tasks"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)

    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, default="")
    priority = db.Column(db.String(20), default="medium")  # low / medium / high / urgent
    status = db.Column(db.String(20), default="pending")   # pending / in_progress / completed / overrun

    estimated_minutes = db.Column(db.Integer, nullable=True)
    actual_minutes = db.Column(db.Integer, nullable=True)
    scheduled_date = db.Column(db.Date, nullable=True, index=True)
    due_datetime = db.Column(db.DateTime, nullable=True)

    sort_order = db.Column(db.Integer, default=0)
    is_deleted = db.Column(db.Boolean, default=False)
    completed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "priority": self.priority,
            "status": self.status,
            "estimated_minutes": self.estimated_minutes,
            "actual_minutes": self.actual_minutes,
            "scheduled_date": self.scheduled_date.isoformat() if self.scheduled_date else None,
            "due_datetime": self.due_datetime.isoformat() if self.due_datetime else None,
            "sort_order": self.sort_order,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "created_at": self.created_at.isoformat(),
        }
