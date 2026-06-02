import os
from app import create_app, db

app = create_app(os.getenv("FLASK_ENV", "development"))

# アプリ起動時にDBテーブルを自動作成（Flask-Migrateが未適用の場合のフォールバック）
with app.app_context():
    from app.models.user import User      # noqa: F401
    from app.models.task import Task      # noqa: F401
    from app.models.ai_usage import AIUsage  # noqa: F401
    db.create_all()

if __name__ == "__main__":
    app.run()
