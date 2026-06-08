import datetime
from .. import db


class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    action = db.Column(db.String(100), nullable=False)  # "login", "task.create", "file.upload", "member.invite" etc
    resource_type = db.Column(db.String(50), nullable=True)  # "task", "channel", "team"
    resource_id = db.Column(db.Integer, nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.String(500), nullable=True)
    extra = db.Column(db.JSON, nullable=True)  # 追加情報
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "action": self.action,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "extra": self.extra,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
