from werkzeug.security import generate_password_hash, check_password_hash
from .. import db
import datetime


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False, default="")
    password_hash = db.Column(db.String(255), nullable=False)
    plan = db.Column(db.String(20), nullable=False, default="free")
    stripe_customer_id = db.Column(db.String(100), unique=True, nullable=True)
    stripe_subscription_id = db.Column(db.String(100), unique=True, nullable=True)
    analytics_opt_out = db.Column(db.Boolean, nullable=False, default=False)
    digest_unsubscribed = db.Column(db.Boolean, nullable=False, default=False)
    onboarding_completed = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    tasks = db.relationship("Task", backref="user", lazy="dynamic")

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "plan": self.plan,
            "onboarding_completed": self.onboarding_completed,
        }
