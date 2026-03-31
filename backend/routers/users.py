"""
routers/users.py
유저 가입 / 로그인 / 프로필 조회·수정.
blog_url 필드 추가.
"""

import os
import bcrypt
import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from datetime import datetime

from database import get_db
from models import User, Follow, PersonalPlace

router = APIRouter(prefix="/users", tags=["users"])


class RegisterRequest(BaseModel):
    nickname: str
    pin: str


class LoginRequest(BaseModel):
    nickname: str
    pin: str


class UpdateUserRequest(BaseModel):
    nickname: str | None = None
    pin: str | None = None
    instagram_url: str | None = None
    blog_url: str | None = None
    profile_photo_url: str | None = None
    is_public: bool | None = None


class UserResponse(BaseModel):
    id: int
    nickname: str
    instagram_url: str | None
    blog_url: str | None
    profile_photo_url: str | None
    is_public: bool
    follower_count: int
    following_count: int
    place_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    user_id: int
    nickname: str
    instagram_url: str | None
    blog_url: str | None
    profile_photo_url: str | None
    is_public: bool


def _hash_pin(pin: str) -> str:
    return bcrypt.hashpw(pin.encode(), bcrypt.gensalt()).decode()

def _verify_pin(pin: str, hashed: str) -> bool:
    return bcrypt.checkpw(pin.encode(), hashed.encode())

def _to_response(user: User, db: Session) -> UserResponse:
    follower_count = db.query(Follow).filter(Follow.following_id == user.id).count()
    following_count = db.query(Follow).filter(Follow.follower_id == user.id).count()
    place_count = db.query(PersonalPlace).filter(
        PersonalPlace.user_id == user.id,
        PersonalPlace.is_public == True,
    ).count()
    return UserResponse(
        id=user.id,
        nickname=user.nickname,
        instagram_url=user.instagram_url,
        blog_url=user.blog_url,
        profile_photo_url=user.profile_photo_url,
        is_public=user.is_public,
        follower_count=follower_count,
        following_count=following_count,
        place_count=place_count,
        created_at=user.created_at,
    )


@router.post("/register", response_model=LoginResponse, status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if not body.pin.isdigit() or len(body.pin) != 4:
        raise HTTPException(status_code=400, detail="PIN은 4자리 숫자여야 합니다.")
    if len(body.nickname.strip()) < 2:
        raise HTTPException(status_code=400, detail="닉네임은 2자 이상이어야 합니다.")
    if len(body.nickname.strip()) > 30:
        raise HTTPException(status_code=400, detail="닉네임은 30자 이하여야 합니다.")
    existing = db.query(User).filter(User.nickname == body.nickname).first()
    if existing:
        raise HTTPException(status_code=409, detail="이미 사용 중인 닉네임입니다.")
    user = User(nickname=body.nickname.strip(), pin_hash=_hash_pin(body.pin))
    db.add(user)
    db.commit()
    db.refresh(user)
    return LoginResponse(user_id=user.id, nickname=user.nickname,
                         instagram_url=user.instagram_url, blog_url=user.blog_url,
                         profile_photo_url=user.profile_photo_url,
                         is_public=user.is_public)


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.nickname == body.nickname).first()
    if not user or not _verify_pin(body.pin, user.pin_hash):
        raise HTTPException(status_code=401, detail="닉네임 또는 PIN이 올바르지 않습니다.")
    return LoginResponse(user_id=user.id, nickname=user.nickname,
                         instagram_url=user.instagram_url, blog_url=user.blog_url,
                         profile_photo_url=user.profile_photo_url,
                         is_public=user.is_public)


@router.get("/search")
def search_users(q: str, db: Session = Depends(get_db)):
    """닉네임 부분 매칭 검색."""
    if not q.strip():
        return []
    users = db.query(User).filter(User.nickname.ilike(f"%{q.strip()}%")).limit(20).all()
    return [
        {"id": u.id, "nickname": u.nickname, "profile_photo_url": u.profile_photo_url,
         "instagram_url": u.instagram_url, "blog_url": u.blog_url, "is_public": u.is_public}
        for u in users
    ]


@router.delete("/{user_id}/account", status_code=204)
def delete_account(user_id: int, db: Session = Depends(get_db)):
    """계정 탈퇴 — 유저 및 관련 데이터 전부 삭제 (cascade)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다.")
    db.delete(user)
    db.commit()


@router.get("/{nickname}", response_model=UserResponse)
def get_profile(nickname: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.nickname == nickname).first()
    if not user:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다.")
    return _to_response(user, db)


@router.get("/{nickname}/public-places")
def get_public_places(nickname: str, viewer_id: int | None = None, db: Session = Depends(get_db)):
    """공개 장소 목록. 비공개 계정이면 accepted 팔로워만 접근 가능."""
    user = db.query(User).filter(User.nickname == nickname).first()
    if not user:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다.")
    if not user.is_public:
        allowed = False
        if viewer_id:
            row = db.execute(text(
                "SELECT id FROM follows WHERE follower_id=:vid AND following_id=:uid AND status='accepted'"
            ), {"vid": viewer_id, "uid": user.id}).fetchone()
            if row:
                allowed = True
        if not allowed:
            raise HTTPException(status_code=403, detail="비공개 프로필입니다.")
    places = db.query(PersonalPlace).filter(
        PersonalPlace.user_id == user.id,
        PersonalPlace.is_public == True,
    ).order_by(PersonalPlace.created_at.desc()).all()
    return [
        {
            "id": p.id, "name": p.name, "address": p.address,
            "lat": p.lat, "lng": p.lng, "category": p.category,
            "status": p.status, "rating": p.rating, "memo": p.memo,
            "photo_url": p.photo_url,
            "naver_place_url": p.naver_place_url,
            "created_at": p.created_at,
        }
        for p in places
    ]


class KakaoLoginRequest(BaseModel):
    access_token: str


@router.post("/kakao-login", response_model=LoginResponse)
def kakao_login(body: KakaoLoginRequest, db: Session = Depends(get_db)):
    """카카오 access_token으로 로그인/자동회원가입."""
    # 카카오 API로 사용자 정보 조회
    try:
        r = httpx.get(
            "https://kapi.kakao.com/v2/user/me",
            headers={"Authorization": f"Bearer {body.access_token}"},
            timeout=5,
        )
        r.raise_for_status()
        kakao_data = r.json()
    except Exception:
        raise HTTPException(status_code=401, detail="카카오 인증 실패")

    kakao_id = str(kakao_data.get("id", ""))
    if not kakao_id:
        raise HTTPException(status_code=401, detail="카카오 사용자 정보를 가져올 수 없습니다")

    kakao_nickname = (
        kakao_data.get("properties", {}).get("nickname")
        or kakao_data.get("kakao_account", {}).get("profile", {}).get("nickname")
        or f"user_{kakao_id[-4:]}"
    )

    # 기존 유저 찾기 (kakao_id로)
    user = db.query(User).filter(User.kakao_id == kakao_id).first()
    if user:
        return LoginResponse(
            user_id=user.id, nickname=user.nickname,
            instagram_url=user.instagram_url, blog_url=user.blog_url,
            profile_photo_url=user.profile_photo_url,
            is_public=user.is_public,
        )

    # 신규 유저 — 닉네임 중복 처리
    base_nick = kakao_nickname[:10]
    nick = base_nick
    suffix = 1
    while db.query(User).filter(User.nickname == nick).first():
        nick = f"{base_nick}{suffix}"
        suffix += 1

    user = User(
        nickname=nick,
        pin_hash=_hash_pin("0000"),  # 카카오 유저는 PIN 사용 안 함
        kakao_id=kakao_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return LoginResponse(
        user_id=user.id, nickname=user.nickname,
        instagram_url=user.instagram_url, blog_url=user.blog_url,
        profile_photo_url=user.profile_photo_url,
        is_public=user.is_public,
    )


@router.patch("/{user_id}", response_model=LoginResponse)
def update_user(user_id: int, body: UpdateUserRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다.")

    if body.nickname is not None:
        if len(body.nickname.strip()) < 2:
            raise HTTPException(status_code=400, detail="닉네임은 2자 이상이어야 합니다.")
        if len(body.nickname.strip()) > 30:
            raise HTTPException(status_code=400, detail="닉네임은 30자 이하여야 합니다.")
        dup = db.query(User).filter(User.nickname == body.nickname, User.id != user_id).first()
        if dup:
            raise HTTPException(status_code=409, detail="이미 사용 중인 닉네임입니다.")
        user.nickname = body.nickname.strip()

    if body.pin is not None:
        if not body.pin.isdigit() or len(body.pin) != 4:
            raise HTTPException(status_code=400, detail="PIN은 4자리 숫자여야 합니다.")
        user.pin_hash = _hash_pin(body.pin)

    if body.instagram_url is not None:
        user.instagram_url = body.instagram_url or None

    if body.blog_url is not None:
        user.blog_url = body.blog_url or None

    if body.profile_photo_url is not None:
        user.profile_photo_url = body.profile_photo_url or None

    if body.is_public is not None:
        user.is_public = body.is_public

    db.commit()
    db.refresh(user)
    return LoginResponse(user_id=user.id, nickname=user.nickname,
                         instagram_url=user.instagram_url, blog_url=user.blog_url,
                         profile_photo_url=user.profile_photo_url,
                         is_public=user.is_public)
