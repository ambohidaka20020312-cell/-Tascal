from .. import db
import datetime


class AIUsage(db.Model):
    __tablename__ = "ai_usage"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False, index=True)
    count = db.Column(db.Integer, default=0, nullable=False)

    __table_args__ = (db.UniqueConstraint("user_id", "date", name="uq_ai_usage_user_date"),)
