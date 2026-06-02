"""Alembic環境設定"""
import logging
import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# Flaskアプリとモデルをインポート
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app import create_app, db

# Alembic Config オブジェクト
config = context.config

# ロギング設定
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

logger = logging.getLogger("alembic.env")

# Flaskアプリを作成してDBメタデータを取得
flask_app = create_app(os.getenv("FLASK_ENV", "production"))

# DATABASE_URLを環境変数から取得して上書き
db_url = os.getenv("DATABASE_URL", flask_app.config.get("SQLALCHEMY_DATABASE_URI"))

# PostgreSQL の古い接続文字列形式 (postgres://) を修正
if db_url and db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

config.set_main_option("sqlalchemy.url", db_url)

# モデルのメタデータ（auto-generate用）
target_metadata = db.metadata


def run_migrations_offline() -> None:
    """オフラインモードでマイグレーションを実行する。

    DBへの実接続なしにSQLを生成する。
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """オンラインモードでマイグレーションを実行する。

    実際のDB接続を使ってマイグレーションを適用する。
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
