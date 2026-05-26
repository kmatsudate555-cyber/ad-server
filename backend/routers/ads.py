from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
import httpx
import os
import uuid

from database import get_db
import models
import schemas
from auth import get_current_user
import storage

router = APIRouter(prefix="/api/ads", tags=["ads"])

MAX_SIZE = int(os.getenv("MAX_UPLOAD_SIZE_MB", "50")) * 1024 * 1024


async def download_and_save(url: str, subdir: str, ad_id: str) -> Optional[str]:
    """URLからメディアをダウンロードしてストレージ（R2 or ローカル）に保存する"""
    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            response = await client.get(url)
            if response.status_code != 200:
                return None

            content = response.content
            if len(content) > MAX_SIZE:
                return None

            content_type = response.headers.get("content-type", "")
            if "video" in content_type:
                ext = ".mp4"
            elif "gif" in content_type:
                ext = ".gif"
            elif "png" in content_type:
                ext = ".png"
            else:
                ext = ".jpg"

            key = f"{subdir}/{ad_id}{ext}"
            return storage.upload_bytes(content, key, content_type or "application/octet-stream")
    except Exception:
        return None


@router.post("/save", response_model=schemas.SavedAdOut)
async def save_ad(
    body: schemas.SaveAdRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    ad_record_id = str(uuid.uuid4())

    ad = models.SavedAd(
        id=ad_record_id,
        user_id=current_user.id,
        ad_id=body.ad_id,
        advertiser_name=body.advertiser_name,
        account_url=body.account_url,
        ad_text=body.ad_text,
        start_date=body.start_date,
        page_url=body.page_url,
        post_url=body.post_url,
        detail_url=body.detail_url,
        image_url=body.image_url,
        video_url=body.video_url,
        tags=body.tags or [],
        memo=body.memo,
    )
    db.add(ad)
    db.commit()
    db.refresh(ad)

    # バックグラウンドでメディアをダウンロード保存
    if body.image_url:
        background_tasks.add_task(_save_image_background, db, ad_record_id, body.image_url)
    if body.video_url:
        background_tasks.add_task(_save_video_background, db, ad_record_id, body.video_url)

    return ad


async def _save_image_background(db: Session, ad_id: str, url: str):
    path = await download_and_save(url, "images", ad_id)
    if path:
        ad = db.query(models.SavedAd).filter(models.SavedAd.id == ad_id).first()
        if ad:
            ad.saved_image_path = path
            db.commit()


async def _save_video_background(db: Session, ad_id: str, url: str):
    path = await download_and_save(url, "videos", ad_id)
    if path:
        ad = db.query(models.SavedAd).filter(models.SavedAd.id == ad_id).first()
        if ad:
            ad.saved_video_path = path
            db.commit()


@router.get("/", response_model=schemas.AdsListResponse)
def list_ads(
    q: Optional[str] = Query(None, description="広告主名・テキストで検索"),
    tag: Optional[str] = Query(None, description="タグで絞り込み"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.SavedAd).filter(models.SavedAd.user_id == current_user.id)

    if q:
        query = query.filter(
            or_(
                models.SavedAd.advertiser_name.ilike(f"%{q}%"),
                models.SavedAd.ad_text.ilike(f"%{q}%"),
            )
        )

    if tag:
        # JSON配列にタグが含まれるか確認（SQLite/PostgreSQL共通）
        query = query.filter(models.SavedAd.tags.contains([tag]))

    total = query.count()
    items = (
        query.order_by(models.SavedAd.saved_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return schemas.AdsListResponse(total=total, items=items)


@router.get("/{ad_id}", response_model=schemas.SavedAdOut)
def get_ad(
    ad_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    ad = db.query(models.SavedAd).filter(
        models.SavedAd.id == ad_id,
        models.SavedAd.user_id == current_user.id,
    ).first()
    if not ad:
        raise HTTPException(status_code=404, detail="広告が見つかりません")
    return ad


@router.patch("/{ad_id}", response_model=schemas.SavedAdOut)
def update_ad(
    ad_id: str,
    body: schemas.UpdateAdRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    ad = db.query(models.SavedAd).filter(
        models.SavedAd.id == ad_id,
        models.SavedAd.user_id == current_user.id,
    ).first()
    if not ad:
        raise HTTPException(status_code=404, detail="広告が見つかりません")

    if body.tags is not None:
        ad.tags = body.tags
    if body.memo is not None:
        ad.memo = body.memo

    db.commit()
    db.refresh(ad)
    return ad


@router.delete("/{ad_id}")
def delete_ad(
    ad_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    ad = db.query(models.SavedAd).filter(
        models.SavedAd.id == ad_id,
        models.SavedAd.user_id == current_user.id,
    ).first()
    if not ad:
        raise HTTPException(status_code=404, detail="広告が見つかりません")

    # ストレージからも削除（R2 またはローカル）
    for path_attr in ["saved_image_path", "saved_video_path"]:
        path_or_url = getattr(ad, path_attr)
        if path_or_url:
            storage.delete_file(path_or_url)

    db.delete(ad)
    db.commit()
    return {"message": "削除しました"}
