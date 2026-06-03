from .. import db
import datetime


class TaskTemplate(db.Model):
    __tablename__ = "task_templates"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, default="")
    priority = db.Column(db.String(20), default="medium")
    estimated_minutes = db.Column(db.Integer, nullable=True)
    category = db.Column(db.String(50), nullable=True)
    tags = db.Column(db.Text, nullable=True)
    use_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "title": self.title,
            "description": self.description,
            "priority": self.priority,
            "estimated_minutes": self.estimated_minutes,
            "category": self.category,
            "tags": self.tags,
            "use_count": self.use_count,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
