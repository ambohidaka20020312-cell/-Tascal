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

    recurrence = db.Column(db.String(20), nullable=True)  # none/daily/weekly/monthly/weekdays
    recurrence_end_date = db.Column(db.Date, nullable=True)

    org_id = db.Column(db.Integer, db.ForeignKey("organizations.id"), nullable=True)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"), nullable=True)
    assigned_to = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    required_skills = db.Column(db.Text, nullable=True)  # JSON list of skill tags
    delegation_level = db.Column(db.Integer, nullable=True)  # 0=社長→部署, 1=部署→個人
    parent_task_id = db.Column(db.Integer, db.ForeignKey("tasks.id"), nullable=True)  # 委譲元タスクのID

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
            "recurrence": self.recurrence,
            "recurrence_end_date": self.recurrence_end_date.isoformat() if self.recurrence_end_date else None,
            "sort_order": self.sort_order,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "created_at": self.created_at.isoformat(),
            "org_id": self.org_id,
            "department_id": self.department_id,
            "assigned_to": self.assigned_to,
            "required_skills": self.required_skills,
            "delegation_level": self.delegation_level,
            "parent_task_id": self.parent_task_id,
        }
