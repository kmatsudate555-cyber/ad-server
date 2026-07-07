from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ---- Auth ----

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    display_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    display_name: Optional[str] = None


class UserOut(BaseModel):
    id: str
    email: str
    display_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ---- Ads ----

class SaveAdRequest(BaseModel):
    ad_id: Optional[str] = None
    advertiser_name: Optional[str] = None
    ad_text: Optional[str] = None
    start_date: Optional[str] = None
    page_url: Optional[str] = None
    account_url: Optional[str] = None
    post_url: Optional[str] = None
    detail_url: Optional[str] = None
    cta_url: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    tags: Optional[List[str]] = []
    memo: Optional[str] = None


class UpdateAdRequest(BaseModel):
    tags: Optional[List[str]] = None
    memo: Optional[str] = None


class SavedAdOut(BaseModel):
    id: str
    ad_id: Optional[str] = None
    advertiser_name: Optional[str] = None
    ad_text: Optional[str] = None
    start_date: Optional[str] = None
    page_url: Optional[str] = None
    account_url: Optional[str] = None
    post_url: Optional[str] = None
    detail_url: Optional[str] = None
    cta_url: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    saved_image_path: Optional[str] = None
    saved_video_path: Optional[str] = None
    tags: List[str] = []
    memo: Optional[str] = None
    saved_at: datetime

    class Config:
        from_attributes = True


class AdsListResponse(BaseModel):
    total: int
    items: List[SavedAdOut]
