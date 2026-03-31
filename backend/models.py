"""
models.py
DB 테이블 정의 (SQLAlchemy ORM).
"""

from datetime import datetime
from sqlalchemy import (
    String, Text, Float, Integer, Boolean,
    DateTime, ForeignKey, UniqueConstraint, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


# ── 기존 테이블 (크롤링) ───────────────────────────────────────

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
    __table_args__ = (UniqueConstraint("source", "author_id", name="uq_account_source_author"),)


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
    post_restaurants: Mapped[list["PostRestaurant"]] = relationship("PostRestaurant", back_populates="post")
    __table_args__ = (UniqueConstraint("account_id", "post_id", name="uq_post_account_postid"),)


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
    post_restaurants: Mapped[list["PostRestaurant"]] = relationship("PostRestaurant", back_populates="restaurant")


class PostRestaurant(Base):
    __tablename__ = "post_restaurants"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    post_id: Mapped[int] = mapped_column(Integer, ForeignKey("posts.id"), nullable=False)
    restaurant_id: Mapped[int] = mapped_column(Integer, ForeignKey("restaurants.id"), nullable=False)
    raw_mention: Mapped[str] = mapped_column(String(200), nullable=True)
    address_hint: Mapped[str] = mapped_column(String(200), nullable=True)
    post: Mapped["Post"] = relationship("Post", back_populates="post_restaurants")
    restaurant: Mapped["Restaurant"] = relationship("Restaurant", back_populates="post_restaurants")
    __table_args__ = (UniqueConstraint("post_id", "restaurant_id", name="uq_post_restaurant"),)


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
    __table_args__ = (UniqueConstraint("restaurant_name", name="uq_ad_cache_name"),)


# ── 신규 테이블 ────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nickname: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    pin_hash: Mapped[str] = mapped_column(String(200), nullable=False)
    kakao_id: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True)
    instagram_url: Mapped[str | None] = mapped_column(String(200), nullable=True)
    blog_url: Mapped[str | None] = mapped_column(String(200), nullable=True)
    profile_photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    folders: Mapped[list["Folder"]] = relationship("Folder", back_populates="user", cascade="all, delete-orphan")
    places: Mapped[list["PersonalPlace"]] = relationship("PersonalPlace", back_populates="user", cascade="all, delete-orphan")
    following: Mapped[list["Follow"]] = relationship("Follow", foreign_keys="Follow.follower_id", back_populates="follower", cascade="all, delete-orphan")
    followers: Mapped[list["Follow"]] = relationship("Follow", foreign_keys="Follow.following_id", back_populates="following_user", cascade="all, delete-orphan")
    notifications: Mapped[list["Notification"]] = relationship("Notification", foreign_keys="Notification.user_id", back_populates="user", cascade="all, delete-orphan")


class Follow(Base):
    """
    팔로우 관계.
    status:
      pending  : 비공개 계정에 팔로우 요청 보낸 상태
      accepted : 팔로우 완료 (공개 계정은 바로 accepted)
    """
    __tablename__ = "follows"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    follower_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    following_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="accepted")  # pending | accepted
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    follower: Mapped["User"] = relationship("User", foreign_keys=[follower_id], back_populates="following")
    following_user: Mapped["User"] = relationship("User", foreign_keys=[following_id], back_populates="followers")

    __table_args__ = (
        UniqueConstraint("follower_id", "following_id", name="uq_follow"),
        Index("idx_follow_follower", "follower_id"),
        Index("idx_follow_following", "following_id"),
    )


class Folder(Base):
    __tablename__ = "folders"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    color: Mapped[str] = mapped_column(String(7), default="#E8593C")
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    user: Mapped["User"] = relationship("User", back_populates="folders")
    places: Mapped[list["PersonalPlace"]] = relationship("PersonalPlace", back_populates="folder")


class PersonalPlace(Base):
    """status: want_to_go | visited | want_revisit"""
    __tablename__ = "personal_places"
    __table_args__ = (Index("idx_pp_user", "user_id"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    folder_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("folders.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    address: Mapped[str | None] = mapped_column(String(300), nullable=True)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    category: Mapped[str | None] = mapped_column(String(200), nullable=True)
    naver_place_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    naver_place_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="want_to_go")
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    memo: Mapped[str | None] = mapped_column(String(300), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    photo_urls: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON array of URLs
    instagram_post_url: Mapped[str | None] = mapped_column(String(200), nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User | None"] = relationship("User", back_populates="places")
    folder: Mapped["Folder | None"] = relationship("Folder", back_populates="places")
    likes: Mapped[list["PlaceLike"]] = relationship("PlaceLike", back_populates="place", cascade="all, delete-orphan")
    comments: Mapped[list["PlaceComment"]] = relationship("PlaceComment", back_populates="place", cascade="all, delete-orphan")


class PlaceLike(Base):
    __tablename__ = "place_likes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    place_id: Mapped[int] = mapped_column(Integer, ForeignKey("personal_places.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    place: Mapped["PersonalPlace"] = relationship("PersonalPlace", back_populates="likes")
    __table_args__ = (
        UniqueConstraint("place_id", "user_id", name="uq_place_like"),
        Index("idx_like_place", "place_id"),
    )


class PlaceComment(Base):
    __tablename__ = "place_comments"
    __table_args__ = (Index("idx_comment_place", "place_id"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    place_id: Mapped[int] = mapped_column(Integer, ForeignKey("personal_places.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    parent_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("place_comments.id"), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    place: Mapped["PersonalPlace"] = relationship("PersonalPlace", back_populates="comments")
    replies: Mapped[list["PlaceComment"]] = relationship("PlaceComment", back_populates="parent", cascade="all, delete-orphan")
    parent: Mapped["PlaceComment | None"] = relationship("PlaceComment", back_populates="replies", remote_side=[id])


class Notification(Base):
    """
    type:
      follow          : 팔로우 완료 (공개 계정)
      follow_request  : 팔로우 요청 (비공개 계정)
      follow_accepted : 팔로우 요청 수락됨
      like            : 좋아요
      comment         : 댓글
    """
    __tablename__ = "notifications"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    actor_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    type: Mapped[str] = mapped_column(String(30), nullable=False)
    target_place_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("personal_places.id"), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id], back_populates="notifications")


class Feedback(Base):
    """사용자 이슈/아이디어 보고."""
    __tablename__ = "feedbacks"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nickname: Mapped[str | None] = mapped_column(String(50), nullable=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CuratedList(Base):
    """큐레이션 리스트 — 테마별 장소 모음."""
    __tablename__ = "curated_lists"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    items: Mapped[list["CuratedListItem"]] = relationship("CuratedListItem", back_populates="curated_list", cascade="all, delete-orphan")
    user: Mapped["User"] = relationship("User")


class CuratedListItem(Base):
    __tablename__ = "curated_list_items"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    list_id: Mapped[int] = mapped_column(Integer, ForeignKey("curated_lists.id", ondelete="CASCADE"), nullable=False)
    place_id: Mapped[int] = mapped_column(Integer, ForeignKey("personal_places.id", ondelete="CASCADE"), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    order: Mapped[int] = mapped_column(Integer, default=0)
    curated_list: Mapped["CuratedList"] = relationship("CuratedList", back_populates="items")
    place: Mapped["PersonalPlace"] = relationship("PersonalPlace")
    __table_args__ = (UniqueConstraint("list_id", "place_id", name="uq_list_place"),)


class BestPick(Base):
    """우리의 공간 — 카테고리당 5개 베스트 슬롯."""
    __tablename__ = "best_picks"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    category: Mapped[str] = mapped_column(String(30), nullable=False)  # restaurant, cafe, bar, general_store
    slot_number: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    address: Mapped[str | None] = mapped_column(String(300), nullable=True)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    naver_place_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    naver_place_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    personal_place_id: Mapped[int | None] = mapped_column(Integer, nullable=True)  # soft ref, no FK
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    __table_args__ = (
        UniqueConstraint("user_id", "category", "slot_number", name="uq_best_pick_slot"),
        Index("idx_best_pick_user", "user_id"),
        Index("idx_best_pick_category", "category"),
    )


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    endpoint: Mapped[str] = mapped_column(Text, nullable=False)
    p256dh: Mapped[str] = mapped_column(String(200), nullable=False)
    auth: Mapped[str] = mapped_column(String(200), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    __table_args__ = (UniqueConstraint("user_id", "endpoint", name="uq_push_sub"),)
