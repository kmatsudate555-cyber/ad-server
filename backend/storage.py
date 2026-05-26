"""
メディアストレージ抽象化。
環境変数 R2_* が揃っている場合は Cloudflare R2 に保存し公開 URL を返す。
未設定の場合はローカルディスクに保存して相対パスを返す（開発用）。
"""
import os
from pathlib import Path
from typing import Optional

R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME")
R2_PUBLIC_URL = os.getenv("R2_PUBLIC_URL")  # 例: https://pub-xxxx.r2.dev

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))


def _r2_enabled() -> bool:
    return all([R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
                R2_BUCKET_NAME, R2_PUBLIC_URL])


def _get_r2_client():
    import boto3
    return boto3.client(
        "s3",
        endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        region_name="auto",
    )


def upload_bytes(content: bytes, key: str, content_type: str) -> Optional[str]:
    """
    バイト列をストレージに保存する。
    R2 設定済み → R2 に保存し公開 URL を返す。
    未設定     → ローカルに保存し相対パスを返す。
    """
    if _r2_enabled():
        try:
            client = _get_r2_client()
            client.put_object(
                Bucket=R2_BUCKET_NAME,
                Key=key,
                Body=content,
                ContentType=content_type,
            )
            return f"{R2_PUBLIC_URL.rstrip('/')}/{key}"
        except Exception:
            return None
    else:
        local_path = UPLOAD_DIR / key
        local_path.parent.mkdir(parents=True, exist_ok=True)
        local_path.write_bytes(content)
        return str(Path(key))


def delete_file(path_or_url: str):
    """R2 またはローカルからファイルを削除する。"""
    if _r2_enabled() and path_or_url.startswith("http"):
        try:
            prefix = R2_PUBLIC_URL.rstrip("/") + "/"
            key = path_or_url[len(prefix):]
            _get_r2_client().delete_object(Bucket=R2_BUCKET_NAME, Key=key)
        except Exception:
            pass
    else:
        full_path = UPLOAD_DIR / path_or_url
        if full_path.exists():
            full_path.unlink()
