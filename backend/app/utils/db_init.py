"""DBテーブル初期化ユーティリティ

本番環境でFlask-Migrateが使えない場合のフォールバックとして、
db.create_all() を安全に実行するためのヘルパーを提供する。
"""
import logging

logger = logging.getLogger(__name__)


def create_tables_if_not_exist(app, db) -> None:
    """SQLAlchemyの db.create_all() を使ってテーブルを作成する。

    既存テーブルはスキップされるため、本番でも安全に実行できる。
    マイグレーションが適用済みの環境では何もしない。

    Args:
        app: Flaskアプリケーションインスタンス
        db:  Flask-SQLAlchemy の db オブジェクト
    """
    with app.app_context():
        try:
            # モデルを明示的にインポートしてメタデータに登録する
            from app.models.user import User       # noqa: F401
            from app.models.task import Task       # noqa: F401
            from app.models.ai_usage import AIUsage  # noqa: F401

            db.create_all()
            logger.info("DB tables verified / created via db.create_all()")
        except Exception as exc:
            logger.error("Failed to create DB tables: %s", exc)
            raise
