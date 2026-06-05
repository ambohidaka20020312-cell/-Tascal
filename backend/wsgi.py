import os
from app import create_app, db

app = create_app(os.getenv("FLASK_ENV", "development"))

# 起動時にテーブルを自動作成（マイグレーション不要）
with app.app_context():
    from app.models import user, task, task_note, ai_usage  # noqa: F401
    from app.models import organization, category, task_template  # noqa: F401
    from app.models import member_skill, push_subscription  # noqa: F401
    db.create_all()

if __name__ == "__main__":
    app.run()
