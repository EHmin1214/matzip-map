"""
routers/users.py
유저 가입 / 로그인 / 프로필 조회·수정.
blog_url 필드 추가.
"""

import bcrypt
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
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
    blog_url: str | None = None        # ← 신규
    is_public: bool | None = None


class UserResponse(BaseModel):
    id: int
    nickname: str
    instagram_url: str | None
    blog_url: str | None               # ← 신규
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
    blog_url: str | None               # ← 신규
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
    existing = db.query(User).filter(User.nickname == body.nickname).first()
    if existing:
        raise HTTPException(status_code=409, detail="이미 사용 중인 닉네임입니다.")
    user = User(nickname=body.nickname.strip(), pin_hash=_hash_pin(body.pin))
    db.add(user)
    db.commit()
    db.refresh(user)
    return LoginResponse(user_id=user.id, nickname=user.nickname,
                         instagram_url=user.instagram_url, blog_url=user.blog_url,
                         is_public=user.is_public)


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.nickname == body.nickname).first()
    if not user or not _verify_pin(body.pin, user.pin_hash):
        raise HTTPException(status_code=401, detail="닉네임 또는 PIN이 올바르지 않습니다.")
    return LoginResponse(user_id=user.id, nickname=user.nickname,
                         instagram_url=user.instagram_url, blog_url=user.blog_url,
                         is_public=user.is_public)


@router.get("/{nickname}", response_model=UserResponse)
def get_profile(nickname: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.nickname == nickname).first()
    if not user:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다.")
    return _to_response(user, db)


@router.patch("/{user_id}", response_model=LoginResponse)
def update_user(user_id: int, body: UpdateUserRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다.")

    if body.nickname is not None:
        if len(body.nickname.strip()) < 2:
            raise HTTPException(status_code=400, detail="닉네임은 2자 이상이어야 합니다.")
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

    if body.is_public is not None:
        user.is_public = body.is_public

    db.commit()
    db.refresh(user)
    return LoginResponse(user_id=user.id, nickname=user.nickname,
                         instagram_url=user.instagram_url, blog_url=user.blog_url,
                         is_public=user.is_public)
