from werkzeug.security import generate_password_hash, check_password_hash
from .. import db
import datetime
import secrets


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
    password_reset_token = db.Column(db.String(100), unique=True, nullable=True, index=True)
    password_reset_expires = db.Column(db.DateTime, nullable=True)
    revenuecat_user_id = db.Column(db.String(200), unique=True, nullable=True, index=True)
    trial_started_at = db.Column(db.DateTime, nullable=True)
    trial_used = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    tasks = db.relationship("Task", foreign_keys="Task.user_id", backref="user", lazy="dynamic")

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def generate_reset_token(self) -> str:
        token = secrets.token_urlsafe(32)
        self.password_reset_token = token
        self.password_reset_expires = datetime.datetime.utcnow() + datetime.timedelta(hours=1)
        return token

    def clear_reset_token(self):
        self.password_reset_token = None
        self.password_reset_expires = None

    def reset_token_valid(self) -> bool:
        return (
            self.password_reset_token is not None
            and self.password_reset_expires is not None
            and self.password_reset_expires > datetime.datetime.utcnow()
        )

    @property
    def is_trial_active(self) -> bool:
        if not self.trial_started_at:
            return False
        return datetime.datetime.utcnow() < self.trial_started_at + datetime.timedelta(days=14)

    @property
    def effective_plan(self) -> str:
        if self.is_trial_active:
            return "personal_pro"
        return self.plan

    def to_dict(self):
        trial_days_left = 0
        if self.is_trial_active:
            delta = (self.trial_started_at + datetime.timedelta(days=14)) - datetime.datetime.utcnow()
            trial_days_left = max(0, delta.days)
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "plan": self.plan,
            "onboarding_completed": self.onboarding_completed,
            "trial_active": self.is_trial_active,
            "trial_days_left": trial_days_left,
            "effective_plan": self.effective_plan,
        }
