from .. import db
import datetime
from sqlalchemy import CheckConstraint


class MemberSkill(db.Model):
    __tablename__ = "member_skills"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    skill_tag = db.Column(db.String(50), nullable=False)
    level = db.Column(db.Integer, nullable=False, default=1)  # 1-5
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow
    )

    __table_args__ = (
        CheckConstraint("level >= 1 AND level <= 5", name="ck_member_skills_level"),
        db.UniqueConstraint("user_id", "skill_tag", name="uq_member_skill"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "skill_tag": self.skill_tag,
            "level": self.level,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
