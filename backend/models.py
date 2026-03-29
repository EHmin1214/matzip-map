"""
models.py
DB 테이블 정의 (SQLAlchemy ORM).

[기존 테이블 - 유지]
  accounts          : 블로거 계정 (크롤링용)
  posts             : 크롤링 게시물
  restaurants       : 크롤링 맛집
  post_restaurants  : 게시물 ↔ 맛집 M:N
  ad_check_cache    : 광고 분석 캐시

[신규 테이블]
  users             : 앱 유저 (닉네임 + PIN)
  follows           : 팔로우 관계
  folders           : 맛집 폴더
  personal_places   : 유저가 저장한 맛집 (기존 대비 컬럼 대폭 추가)
  place_likes       : 맛집 좋아요
  place_comments    : 맛집 댓글
  notifications     : 알림
"""

from datetime import datetime
from sqlalchemy import (
    String, Text, Float, Integer, Boolean,
    DateTime, ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


# ──────────────────────────────────────────────────────────────
# 기존 테이블 (크롤링 관련 — 변경 없음)
# ──────────────────────────────────────────────────────────────

class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    source: Mapped[str] = mapped_column(String(20), nullable=False)
    author_id: Mapped[str] = mapped_column(String(100), nullable=False)
    author_name: Mapped[str] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_crawled_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    posts: Mapped[list["Post"]] = relationship("Post", back_populates="account")

    __table_args__ = (
        UniqueConstraint("source", "author_id", name="uq_account_source_author"),
    )


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("accounts.id"), nullable=True)
    post_id: Mapped[str] = mapped_column(String(200), nullable=False)
    post_url: Mapped[str] = mapped_column(String(500), nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=True)
    published_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    crawled_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    account: Mapped["Account"] = relationship("Account", back_populates="posts")
    post_restaurants: Mapped[list["PostRestaurant"]] = relationship(
        "PostRestaurant", back_populates="post"
    )

    __table_args__ = (
        UniqueConstraint("account_id", "post_id", name="uq_post_account_postid"),
    )


class Restaurant(Base):
    __tablename__ = "restaurants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    naver_place_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(200), nullable=True)
    address: Mapped[str] = mapped_column(String(300), nullable=True)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    naver_place_url: Mapped[str] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    post_restaurants: Mapped[list["PostRestaurant"]] = relationship(
        "PostRestaurant", back_populates="restaurant"
    )


class PostRestaurant(Base):
    __tablename__ = "post_restaurants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    post_id: Mapped[int] = mapped_column(Integer, ForeignKey("posts.id"), nullable=False)
    restaurant_id: Mapped[int] = mapped_column(Integer, ForeignKey("restaurants.id"), nullable=False)
    raw_mention: Mapped[str] = mapped_column(String(200), nullable=True)
    address_hint: Mapped[str] = mapped_column(String(200), nullable=True)

    post: Mapped["Post"] = relationship("Post", back_populates="post_restaurants")
    restaurant: Mapped["Restaurant"] = relationship("Restaurant", back_populates="post_restaurants")

    __table_args__ = (
        UniqueConstraint("post_id", "restaurant_id", name="uq_post_restaurant"),
    )


class AdCheckCache(Base):
    __tablename__ = "ad_check_cache"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    restaurant_name: Mapped[str] = mapped_column(String(200), nullable=False)
    address_hint: Mapped[str] = mapped_column(String(200), nullable=True)
    total_posts: Mapped[int] = mapped_column(Integer, default=0)
    ad_count: Mapped[int] = mapped_column(Integer, default=0)
    suspicious_count: Mapped[int] = mapped_column(Integer, default=0)
    genuine_count: Mapped[int] = mapped_column(Integer, default=0)
    ad_ratio: Mapped[float] = mapped_column(Float, default=0.0)
    verdict: Mapped[str] = mapped_column(String(20), nullable=False)
    posts_json: Mapped[str] = mapped_column(Text, nullable=True)
    checked_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("restaurant_name", name="uq_ad_cache_name"),
    )


# ──────────────────────────────────────────────────────────────
# 신규 테이블
# ──────────────────────────────────────────────────────────────

class User(Base):
    """앱 유저. 닉네임 + PIN으로 식별."""
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nickname: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    pin_hash: Mapped[str] = mapped_column(String(200), nullable=False)       # bcrypt 해시
    instagram_url: Mapped[str | None] = mapped_column(String(200), nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)          # 내 지도 공개 여부
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # relationships
    folders: Mapped[list["Folder"]] = relationship("Folder", back_populates="user", cascade="all, delete-orphan")
    places: Mapped[list["PersonalPlace"]] = relationship("PersonalPlace", back_populates="user", cascade="all, delete-orphan")
    following: Mapped[list["Follow"]] = relationship("Follow", foreign_keys="Follow.follower_id", back_populates="follower", cascade="all, delete-orphan")
    followers: Mapped[list["Follow"]] = relationship("Follow", foreign_keys="Follow.following_id", back_populates="following_user", cascade="all, delete-orphan")
    notifications: Mapped[list["Notification"]] = relationship("Notification", foreign_keys="Notification.user_id", back_populates="user", cascade="all, delete-orphan")


class Follow(Base):
    """팔로우 관계. 단방향."""
    __tablename__ = "follows"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    follower_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)   # 팔로우 하는 사람
    following_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)  # 팔로우 받는 사람
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    follower: Mapped["User"] = relationship("User", foreign_keys=[follower_id], back_populates="following")
    following_user: Mapped["User"] = relationship("User", foreign_keys=[following_id], back_populates="followers")

    __table_args__ = (
        UniqueConstraint("follower_id", "following_id", name="uq_follow"),
    )


class Folder(Base):
    """유저가 만든 맛집 폴더."""
    __tablename__ = "folders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    color: Mapped[str] = mapped_column(String(7), default="#E8593C")         # HEX 색상
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)           # 폴더 공개 여부
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="folders")
    places: Mapped[list["PersonalPlace"]] = relationship("PersonalPlace", back_populates="folder")


class PersonalPlace(Base):
    """
    유저가 직접 저장한 맛집.

    status 값:
      want_to_go      : 가고 싶어요 (기본값)
      visited         : 가봤어요
      want_revisit    : 또 가고 싶어요
      not_recommended : 별로였어요
    """
    __tablename__ = "personal_places"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    # ── 소유자 / 분류 ──────────────────────────
    user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    folder_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("folders.id"), nullable=True)

    # ── 장소 정보 ──────────────────────────────
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    address: Mapped[str | None] = mapped_column(String(300), nullable=True)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    category: Mapped[str | None] = mapped_column(String(200), nullable=True)
    naver_place_id: Mapped[str | None] = mapped_column(String(100), nullable=True)  # 중복 감지용
    naver_place_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # ── 유저 입력 ──────────────────────────────
    status: Mapped[str] = mapped_column(String(20), default="want_to_go")    # 방문 상태
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)       # 별점 1~5
    memo: Mapped[str | None] = mapped_column(String(300), nullable=True)     # 한줄 메모
    instagram_post_url: Mapped[str | None] = mapped_column(String(200), nullable=True)  # 원본 인스타 포스트
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)           # 공개 여부

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # relationships
    user: Mapped["User | None"] = relationship("User", back_populates="places")
    folder: Mapped["Folder | None"] = relationship("Folder", back_populates="places")
    likes: Mapped[list["PlaceLike"]] = relationship("PlaceLike", back_populates="place", cascade="all, delete-orphan")
    comments: Mapped[list["PlaceComment"]] = relationship("PlaceComment", back_populates="place", cascade="all, delete-orphan")


class PlaceLike(Base):
    """맛집 좋아요."""
    __tablename__ = "place_likes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    place_id: Mapped[int] = mapped_column(Integer, ForeignKey("personal_places.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    place: Mapped["PersonalPlace"] = relationship("PersonalPlace", back_populates="likes")

    __table_args__ = (
        UniqueConstraint("place_id", "user_id", name="uq_place_like"),
    )


class PlaceComment(Base):
    """맛집 댓글. 팔로워만 작성 가능 (API 레벨에서 검증)."""
    __tablename__ = "place_comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    place_id: Mapped[int] = mapped_column(Integer, ForeignKey("personal_places.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    place: Mapped["PersonalPlace"] = relationship("PersonalPlace", back_populates="comments")


class Notification(Base):
    """
    알림.

    type 값:
      follow  : 누군가 나를 팔로우함
      like    : 내 맛집에 좋아요
      comment : 내 맛집에 댓글
    """
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)    # 알림 받는 유저
    actor_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)   # 행동한 유저
    type: Mapped[str] = mapped_column(String(20), nullable=False)                            # follow / like / comment
    target_place_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("personal_places.id"), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id], back_populates="notifications")
