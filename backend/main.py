"""
アプリケーション起動ファイル

実行方法：
  python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.core.database import engine
from src.core.models import Base
from src.phase1 import routes as phase1_routes

# テーブル作成
Base.metadata.create_all(bind=engine)

# FastAPI アプリ作成
app = FastAPI(
    title="シフト管理システム",
    description="介護・障害福祉向けシフト自動化ツール",
    version="0.1.0"
)

# CORS 設定（フロントエンドからアクセス可能に）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Phase 1 ルータを登録
app.include_router(phase1_routes.router)


@app.get("/")
def read_root():
    """ルートエンドポイント"""
    return {
        "message": "シフト管理システム API",
        "version": "0.1.0",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    """ヘルスチェック"""
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
