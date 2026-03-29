"""
routers/follows.py
팔로우 시스템 — 인스타그램 방식.

공개 계정  → 팔로우 즉시 accepted
비공개 계정 → 팔로우 요청(pending) → 상대방 수락 시 accepted

엔드포인트:
  POST   /follows/{target_id}          팔로우 or 팔로우 요청
  DELETE /follows/{target_id}          언팔로우 or 요청 취소
  GET    /follows/{user_id}/following  내가 팔로우하는 사람 (accepted)
  GET    /follows/{user_id}/followers  나를 팔로우하는 사람 (accepted)
  GET    /follows/requests             나에게 온 팔로우 요청 목록 (pending)
  POST   /follows/requests/{from_id}/accept   수락
  POST   /follows/requests/{from_id}/reject   거절
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from database import get_db
from models import User, Follow, PersonalPlace, Notification

router = APIRouter(prefix="/follows", tags=["follows"])


# ── 스키마 ───────────────────────────────────────────────────

class FollowUserResponse(BaseModel):
    id: int
    nickname: str
    instagram_url: str | None
    blog_url: str | None
    is_public: bool
    place_count: int
    status: str | None = None  # "accepted" | "pending" (내가 팔로우 요청한 경우)

    class Config:
        from_attributes = True


class FollowRequestResponse(BaseModel):
    """나에게 온 팔로우 요청."""
    from_user_id: int
    from_nickname: str
    from_instagram_url: str | None
    requested_at: datetime


# ── 헬퍼 ─────────────────────────────────────────────────────

def _create_notification(db, user_id, actor_id, ntype, place_id=None):
    if user_id == actor_id:
        return
    db.add(Notification(
        user_id=user_id, actor_id=actor_id,
        type=ntype, target_place_id=place_id,
    ))


def _place_count(db, user_id):
    return db.query(PersonalPlace).filter(
        PersonalPlace.user_id == user_id,
        PersonalPlace.is_public == True,
    ).count()


# ── 엔드포인트 ───────────────────────────────────────────────

@router.post("/{target_id}", status_code=201)
def follow_user(target_id: int, follower_id: int, db: Session = Depends(get_db)):
    """
    팔로우 or 팔로우 요청.
    - 공개 계정  → status=accepted (바로 팔로우)
    - 비공개 계정 → status=pending  (요청 대기)
    """
    if follower_id == target_id:
        raise HTTPException(status_code=400, detail="자기 자신을 팔로우할 수 없습니다.")

    target = db.query(User).filter(User.id == target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다.")

    existing = db.query(Follow).filter(
        Follow.follower_id == follower_id,
        Follow.following_id == target_id,
    ).first()

    if existing:
        if existing.status == "pending":
            raise HTTPException(status_code=409, detail="이미 팔로우 요청을 보냈습니다.")
        raise HTTPException(status_code=409, detail="이미 팔로우 중입니다.")

    # 공개면 바로 수락, 비공개면 pending
    status = "accepted" if target.is_public else "pending"

    db.add(Follow(
        follower_id=follower_id,
        following_id=target_id,
        status=status,
    ))

    # 알림: 공개면 "팔로우", 비공개면 "팔로우 요청"
    ntype = "follow" if status == "accepted" else "follow_request"
    _create_notification(db, target_id, follower_id, ntype)

    db.commit()

    if status == "accepted":
        return {"message": f"{target.nickname}님을 팔로우했습니다.", "status": "accepted"}
    else:
        return {"message": f"{target.nickname}님에게 팔로우 요청을 보냈습니다.", "status": "pending"}


@router.delete("/{target_id}", status_code=204)
def unfollow_user(target_id: int, follower_id: int, db: Session = Depends(get_db)):
    """언팔로우 or 팔로우 요청 취소."""
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
    """내가 팔로우하는 사람 목록 (accepted만)."""
    follows = db.query(Follow).filter(
        Follow.follower_id == user_id,
        Follow.status == "accepted",
    ).all()
    result = []
    for f in follows:
        u = f.following_user
        result.append(FollowUserResponse(
            id=u.id, nickname=u.nickname,
            instagram_url=u.instagram_url, blog_url=u.blog_url,
            is_public=u.is_public,
            place_count=_place_count(db, u.id),
            status="accepted",
        ))
    return result


@router.get("/{user_id}/followers", response_model=list[FollowUserResponse])
def get_followers(user_id: int, db: Session = Depends(get_db)):
    """나를 팔로우하는 사람 목록 (accepted만)."""
    follows = db.query(Follow).filter(
        Follow.following_id == user_id,
        Follow.status == "accepted",
    ).all()
    result = []
    for f in follows:
        u = f.follower
        result.append(FollowUserResponse(
            id=u.id, nickname=u.nickname,
            instagram_url=u.instagram_url, blog_url=u.blog_url,
            is_public=u.is_public,
            place_count=_place_count(db, u.id),
            status="accepted",
        ))
    return result


@router.get("/{user_id}/pending", response_model=list[FollowUserResponse])
def get_pending_sent(user_id: int, db: Session = Depends(get_db)):
    """내가 보낸 팔로우 요청 목록 (pending)."""
    follows = db.query(Follow).filter(
        Follow.follower_id == user_id,
        Follow.status == "pending",
    ).all()
    result = []
    for f in follows:
        u = f.following_user
        result.append(FollowUserResponse(
            id=u.id, nickname=u.nickname,
            instagram_url=u.instagram_url, blog_url=u.blog_url,
            is_public=u.is_public,
            place_count=0,
            status="pending",
        ))
    return result


@router.get("/requests/{user_id}", response_model=list[FollowRequestResponse])
def get_follow_requests(user_id: int, db: Session = Depends(get_db)):
    """나에게 온 팔로우 요청 목록."""
    follows = db.query(Follow).filter(
        Follow.following_id == user_id,
        Follow.status == "pending",
    ).all()
    result = []
    for f in follows:
        u = f.follower
        result.append(FollowRequestResponse(
            from_user_id=u.id,
            from_nickname=u.nickname,
            from_instagram_url=u.instagram_url,
            requested_at=f.created_at,
        ))
    return result


@router.post("/requests/{from_id}/accept")
def accept_follow_request(from_id: int, user_id: int, db: Session = Depends(get_db)):
    """팔로우 요청 수락."""
    follow = db.query(Follow).filter(
        Follow.follower_id == from_id,
        Follow.following_id == user_id,
        Follow.status == "pending",
    ).first()
    if not follow:
        raise HTTPException(status_code=404, detail="팔로우 요청을 찾을 수 없습니다.")

    follow.status = "accepted"
    # 요청자에게 수락 알림
    _create_notification(db, from_id, user_id, "follow_accepted")
    db.commit()
    return {"message": "팔로우 요청을 수락했습니다."}


@router.post("/requests/{from_id}/reject", status_code=204)
def reject_follow_request(from_id: int, user_id: int, db: Session = Depends(get_db)):
    """팔로우 요청 거절."""
    follow = db.query(Follow).filter(
        Follow.follower_id == from_id,
        Follow.following_id == user_id,
        Follow.status == "pending",
    ).first()
    if not follow:
        raise HTTPException(status_code=404, detail="팔로우 요청을 찾을 수 없습니다.")
    db.delete(follow)
    db.commit()


@router.get("/map-layer", response_model=list)
def get_layer_places(user_id: int, following_ids: list[int] = None, db: Session = Depends(get_db)):
    """팔로우한 사람들 공개 맛집 (레이어용)."""
    follow_rows = db.query(Follow).filter(
        Follow.follower_id == user_id,
        Follow.status == "accepted",
    ).all()
    all_following_ids = [f.following_id for f in follow_rows]
    if not all_following_ids:
        return []

    target_ids = following_ids if following_ids else all_following_ids
    target_ids = [i for i in target_ids if i in all_following_ids][:5]

    places = db.query(PersonalPlace).filter(
        PersonalPlace.user_id.in_(target_ids),
        PersonalPlace.is_public == True,
    ).all()
    return places
