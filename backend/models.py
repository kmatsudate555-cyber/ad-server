from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy import JSON
from datetime import datetime, timezone
import uuid

from database import Base


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    display_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    ads = relationship("SavedAd", back_populates="user", cascade="all, delete-orphan")


class SavedAd(Base):
    __tablename__ = "saved_ads"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Meta広告ライブラリのデータ
    ad_id = Column(String, nullable=True, index=True)
    advertiser_name = Column(String, nullable=True)
    ad_text = Column(Text, nullable=True)
    start_date = Column(String, nullable=True)
    page_url = Column(Text, nullable=True)

    # アカウントURL・投稿URL・詳細URL
    account_url = Column(Text, nullable=True)  # 広告主のFacebookページURL
    post_url = Column(Text, nullable=True)     # https://www.facebook.com/[id]/posts/[id]/
    detail_url = Column(Text, nullable=True)   # 広告ライブラリ詳細ページ
    cta_url = Column(Text, nullable=True)      # 広告CTAボタンの遷移先URL

    # メディア（元URL）
    image_url = Column(Text, nullable=True)
    video_url = Column(Text, nullable=True)

    # サーバー保存パス
    saved_image_path = Column(String, nullable=True)
    saved_video_path = Column(String, nullable=True)

    # ユーザーが付けるメタデータ
    tags = Column(JSON, default=list)  # ["競合", "バナー"] など
    memo = Column(Text, nullable=True)

    saved_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="ads")
