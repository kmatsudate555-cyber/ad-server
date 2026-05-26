from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import os
from dotenv import load_dotenv

load_dotenv()

from database import engine, Base
import models  # noqa: F401 - モデル登録のためimport
from routers import auth, ads

# DBテーブル自動作成
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Ad Saver API", version="1.0.0")

# CORS（Chrome拡張からのリクエストを許可）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番では拡張機能のoriginに絞る
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーター
app.include_router(auth.router)
app.include_router(ads.router)

# アップロードファイルの静的配信（R2 未設定の開発環境のみ）
_r2_configured = all([
    os.getenv("R2_ACCOUNT_ID"), os.getenv("R2_ACCESS_KEY_ID"),
    os.getenv("R2_SECRET_ACCESS_KEY"), os.getenv("R2_BUCKET_NAME"),
])
if not _r2_configured:
    upload_dir = Path(os.getenv("UPLOAD_DIR", "./uploads"))
    upload_dir.mkdir(exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")


@app.get("/")
def root():
    return {"message": "Ad Saver API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}
