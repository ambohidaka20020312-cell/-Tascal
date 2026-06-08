import datetime
from .. import db


class Channel(db.Model):
    __tablename__ = "channels"

    id = db.Column(db.Integer, primary_key=True)
    team_id = db.Column(db.Integer, db.ForeignKey("teams.id"), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey("team_departments.id"), nullable=True)
    name = db.Column(db.String(100), nullable=False)
    channel_type = db.Column(db.String(20), nullable=False, default="group")  # "group" / "dm"
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    team = db.relationship("Team", foreign_keys=[team_id])
    creator = db.relationship("User", foreign_keys=[created_by])
    channel_members = db.relationship("ChannelMember", backref="channel", lazy="dynamic")
    messages = db.relationship("Message", backref="channel", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "team_id": self.team_id,
            "department_id": self.department_id,
            "name": self.name,
            "channel_type": self.channel_type,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ChannelMember(db.Model):
    __tablename__ = "channel_members"

    id = db.Column(db.Integer, primary_key=True)
    channel_id = db.Column(db.Integer, db.ForeignKey("channels.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    joined_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    user = db.relationship("User", foreign_keys=[user_id])

    def to_dict(self):
        return {
            "id": self.id,
            "channel_id": self.channel_id,
            "user_id": self.user_id,
            "joined_at": self.joined_at.isoformat() if self.joined_at else None,
        }


class Message(db.Model):
    __tablename__ = "messages"

    id = db.Column(db.Integer, primary_key=True)
    channel_id = db.Column(db.Integer, db.ForeignKey("channels.id"), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    body = db.Column(db.Text, nullable=False)
    task_id = db.Column(db.Integer, db.ForeignKey("tasks.id"), nullable=True)
    # Mentions: JSON list of {"type": "user"|"channel", "id": int, "name": str}
    mentions = db.Column(db.Text, nullable=True)
    message_type = db.Column(db.String(20), nullable=False, default="text")  # text / task_created / task_assigned
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    sender = db.relationship("User", foreign_keys=[sender_id])
    task = db.relationship("Task", foreign_keys=[task_id])

    def to_dict(self):
        import json
        return {
            "id": self.id,
            "channel_id": self.channel_id,
            "sender_id": self.sender_id,
            "sender_name": self.sender.name if self.sender else None,
            "body": self.body,
            "task_id": self.task_id,
            "mentions": json.loads(self.mentions) if self.mentions else [],
            "message_type": self.message_type,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
