"""
routers/follows.py
팔로우 / 언팔로우 / 목록 조회 / 지도 레이어용 맛집 조회.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from database import get_db
from models import User, Follow, PersonalPlace

router = APIRouter(prefix="/follows", tags=["follows"])


# ── Pydantic 스키마 ──────────────────────────────────────────

class FollowUserResponse(BaseModel):
    """팔로우 목록의 유저 요약."""
    id: int
    nickname: str
    instagram_url: str | None
    is_public: bool
    place_count: int

    class Config:
        from_attributes = True


class LayerPlaceResponse(BaseModel):
    """지도 레이어용 맛집 마커 데이터."""
    id: int
    owner_id: int
    owner_nickname: str
    name: str
    lat: float
    lng: float
    category: str | None
    status: str
    rating: int | None
    memo: str | None
    instagram_post_url: str | None
    naver_place_url: str | None

    class Config:
        from_attributes = True


# ── 엔드포인트 ───────────────────────────────────────────────

@router.post("/{target_id}", status_code=201)
def follow_user(
    target_id: int,
    follower_id: int,                 # 쿼리 파라미터로 현재 유저 ID 전달
    db: Session = Depends(get_db),
):
    """
    target_id 유저를 팔로우.
    이미 팔로우 중이면 409.
    자기 자신은 팔로우 불가.
    대상 유저가 비공개면 팔로우 불가.
    """
    if follower_id == target_id:
        raise HTTPException(status_code=400, detail="자기 자신을 팔로우할 수 없습니다.")

    target = db.query(User).filter(User.id == target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다.")

    if not target.is_public:
        raise HTTPException(status_code=403, detail="비공개 유저는 팔로우할 수 없습니다.")

    existing = db.query(Follow).filter(
        Follow.follower_id == follower_id,
        Follow.following_id == target_id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="이미 팔로우 중입니다.")

    db.add(Follow(follower_id=follower_id, following_id=target_id))
    db.commit()
    return {"message": f"{target.nickname}님을 팔로우했습니다."}


@router.delete("/{target_id}", status_code=204)
def unfollow_user(
    target_id: int,
    follower_id: int,
    db: Session = Depends(get_db),
):
    """언팔로우."""
    follow = db.query(Follow).filter(
        Follow.follower_id == follower_id,
        Follow.following_id == target_id,
    ).first()
    if not follow:
        raise HTTPException(status_code=404, detail="팔로우 관계가 없습니다.")

    db.delete(follow)
    db.commit()


@router.get("/{user_id}/following", response_model=list[FollowUserResponse])
def get_following(user_id: int, db: Session = Depends(get_db)):
    """내가 팔로우하는 사람 목록."""
    follows = db.query(Follow).filter(Follow.follower_id == user_id).all()
    result = []
    for f in follows:
        u = f.following_user
        place_count = db.query(PersonalPlace).filter(
            PersonalPlace.user_id == u.id,
            PersonalPlace.is_public == True,
        ).count()
        result.append(FollowUserResponse(
            id=u.id,
            nickname=u.nickname,
            instagram_url=u.instagram_url,
            is_public=u.is_public,
            place_count=place_count,
        ))
    return result


@router.get("/{user_id}/followers", response_model=list[FollowUserResponse])
def get_followers(user_id: int, db: Session = Depends(get_db)):
    """나를 팔로우하는 사람 목록."""
    follows = db.query(Follow).filter(Follow.following_id == user_id).all()
    result = []
    for f in follows:
        u = f.follower
        place_count = db.query(PersonalPlace).filter(
            PersonalPlace.user_id == u.id,
            PersonalPlace.is_public == True,
        ).count()
        result.append(FollowUserResponse(
            id=u.id,
            nickname=u.nickname,
            instagram_url=u.instagram_url,
            is_public=u.is_public,
            place_count=place_count,
        ))
    return result


@router.get("/map-layer", response_model=list[LayerPlaceResponse])
def get_layer_places(
    user_id: int,
    following_ids: list[int] = None,  # 레이어 ON 상태인 팔로잉 ID 목록
    db: Session = Depends(get_db),
):
    """
    팔로우한 사람들의 공개 맛집을 지도 레이어용으로 반환.
    following_ids를 지정하면 해당 사람들만 필터링.
    최대 5명까지만 허용 (지도 가독성).
    """
    # 내가 팔로우하는 사람 ID 목록
    follow_rows = db.query(Follow).filter(Follow.follower_id == user_id).all()
    all_following_ids = [f.following_id for f in follow_rows]

    if not all_following_ids:
        return []

    # 레이어 ON인 사람만 필터 (지정 없으면 전체)
    target_ids = following_ids if following_ids else all_following_ids
    target_ids = [i for i in target_ids if i in all_following_ids]  # 팔로우 안 한 사람 제외
    target_ids = target_ids[:5]  # 최대 5명

    places = db.query(PersonalPlace).filter(
        PersonalPlace.user_id.in_(target_ids),
        PersonalPlace.is_public == True,
    ).all()

    result = []
    for p in places:
        owner = db.query(User).filter(User.id == p.user_id).first()
        result.append(LayerPlaceResponse(
            id=p.id,
            owner_id=p.user_id,
            owner_nickname=owner.nickname if owner else "",
            name=p.name,
            lat=p.lat,
            lng=p.lng,
            category=p.category,
            status=p.status,
            rating=p.rating,
            memo=p.memo,
            instagram_post_url=p.instagram_post_url,
            naver_place_url=p.naver_place_url,
        ))
    return result
