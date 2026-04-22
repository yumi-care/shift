"""
データベース接続設定

全フェーズで共有
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

# データベース接続URL（SQLite で簡単に）
import tempfile
import os
db_path = os.path.join(tempfile.gettempdir(), "shift.db")
DATABASE_URL = f"sqlite:///{db_path}"

# エンジン作成
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=True  # SQL ログを表示（開発時のみ）
)

# セッション作成
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


def get_db():
    """API に依存注入するセッション"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
