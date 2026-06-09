import os
from dotenv import load_dotenv

load_dotenv()


class BaseConfig:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = ["http://localhost:5173"]

    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
    STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
    STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
    STRIPE_PRICE_ID_PRO = os.getenv("STRIPE_PRICE_ID_PRO")
    STRIPE_PRICE_ID_TEAM = os.getenv("STRIPE_PRICE_ID_TEAM")
    # PERSONAL_PRO / BUSINESS は PRO / TEAM と同じ Price ID にフォールバック
    STRIPE_PRICE_ID_PERSONAL_PRO = os.getenv("STRIPE_PRICE_ID_PERSONAL_PRO") or os.getenv("STRIPE_PRICE_ID_PRO")
    STRIPE_PRICE_ID_BUSINESS = os.getenv("STRIPE_PRICE_ID_BUSINESS") or os.getenv("STRIPE_PRICE_ID_TEAM")
    STRIPE_PRICE_ID_ENTERPRISE = os.getenv("STRIPE_PRICE_ID_ENTERPRISE")
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    REVENUECAT_WEBHOOK_SECRET = os.getenv("REVENUECAT_WEBHOOK_SECRET", "")

    SKIP_EMAIL_VERIFY = os.getenv("SKIP_EMAIL_VERIFY", "false")

    # Mail settings (Flask-Mail / Gmail SMTP)
    MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
    MAIL_USE_TLS = True
    MAIL_USE_SSL = False
    MAIL_USERNAME = os.getenv("MAIL_USERNAME", "tascal.support@gmail.com")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
    MAIL_DEFAULT_SENDER = ("Tascal", os.getenv("MAIL_DEFAULT_SENDER", "tascal.support@gmail.com"))
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


class DevelopmentConfig(BaseConfig):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///tascal_dev.db")


class ProductionConfig(BaseConfig):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    CORS_ORIGINS = [os.getenv("FRONTEND_URL", "https://tascal.app")]


class TestingConfig(BaseConfig):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"


config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}
