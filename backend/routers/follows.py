"""
routers/follows.py
팔로우 시스템 — 인스타그램 방식.
SQLAlchemy ORM 대신 raw SQL 사용 (status 컬럼 캐시 문제 회피).
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from datetime import datetime

from database import get_db
from models import User, PersonalPlace, Notification
from routers.push import send_push_to_user

router = APIRouter(prefix="/follows", tags=["follows"])


# ── 스키마 ───────────────────────────────────────────────────

class FollowUserResponse(BaseModel):
    id: int
    nickname: str
    instagram_url: str | None
    blog_url: str | None
    is_public: bool
    place_count: int
    status: str | None = None

    class Config:
        from_attributes = True


class FollowRequestResponse(BaseModel):
    from_user_id: int
    from_nickname: str
    from_instagram_url: str | None
    requested_at: datetime


# ── 헬퍼 ─────────────────────────────────────────────────────

def _place_count(db, user_id):
    return db.query(PersonalPlace).filter(
        PersonalPlace.user_id == user_id,
        PersonalPlace.is_public == True,
    ).count()

def _create_notification(db, user_id, actor_id, ntype, place_id=None):
    if user_id == actor_id:
        return
    db.add(Notification(
        user_id=user_id, actor_id=actor_id,
        type=ntype, target_place_id=place_id,
    ))

def _get_user(db, user_id):
    return db.query(User).filter(User.id == user_id).first()


# ── 엔드포인트 ───────────────────────────────────────────────

@router.post("/{target_id}", status_code=201)
def follow_user(target_id: int, follower_id: int, db: Session = Depends(get_db)):
    if follower_id == target_id:
        raise HTTPException(status_code=400, detail="자기 자신을 팔로우할 수 없습니다.")

    target = _get_user(db, target_id)
    if not target:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다.")

    # 기존 팔로우 여부 확인
    existing = db.execute(text(
        "SELECT id, status FROM follows WHERE follower_id=:fid AND following_id=:tid"
    ), {"fid": follower_id, "tid": target_id}).fetchone()

    if existing:
        if existing.status == "pending":
            raise HTTPException(status_code=409, detail="이미 팔로우 요청을 보냈습니다.")
        raise HTTPException(status_code=409, detail="이미 팔로우 중입니다.")

    status = "accepted" if target.is_public else "pending"

    db.execute(text(
        "INSERT INTO follows (follower_id, following_id, status, created_at) "
        "VALUES (:fid, :tid, :status, NOW())"
    ), {"fid": follower_id, "tid": target_id, "status": status})

    ntype = "follow" if status == "accepted" else "follow_request"
    _create_notification(db, target_id, follower_id, ntype)
    follower = db.query(User).filter(User.id == follower_id).first()
    if follower:
        msg = f"{follower.nickname}님이 팔로우했어요" if status == "accepted" else f"{follower.nickname}님이 팔로우 요청을 보냈어요"
        send_push_to_user(db, target_id, "나의 공간", msg, tag="follow")
    db.commit()

    if status == "accepted":
        return {"message": f"{target.nickname}님을 팔로우했습니다.", "status": "accepted"}
    else:
        return {"message": f"{target.nickname}님에게 팔로우 요청을 보냈습니다.", "status": "pending"}


@router.delete("/{target_id}", status_code=204)
def unfollow_user(target_id: int, follower_id: int, db: Session = Depends(get_db)):
    result = db.execute(text(
        "DELETE FROM follows WHERE follower_id=:fid AND following_id=:tid"
    ), {"fid": follower_id, "tid": target_id})
    db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="팔로우 관계가 없습니다.")


@router.get("/{user_id}/following", response_model=list[FollowUserResponse])
def get_following(user_id: int, db: Session = Depends(get_db)):
    """내가 팔로우하는 사람 목록 (accepted만)."""
    rows = db.execute(text(
        "SELECT following_id FROM follows WHERE follower_id=:uid AND status='accepted'"
    ), {"uid": user_id}).fetchall()

    result = []
    for row in rows:
        u = _get_user(db, row.following_id)
        if u:
            result.append(FollowUserResponse(
                id=u.id, nickname=u.nickname,
                instagram_url=u.instagram_url,
                blog_url=getattr(u, 'blog_url', None),
                is_public=u.is_public,
                place_count=_place_count(db, u.id),
                status="accepted",
            ))
    return result


@router.get("/{user_id}/followers", response_model=list[FollowUserResponse])
def get_followers(user_id: int, db: Session = Depends(get_db)):
    """나를 팔로우하는 사람 목록 (accepted만)."""
    rows = db.execute(text(
        "SELECT follower_id FROM follows WHERE following_id=:uid AND status='accepted'"
    ), {"uid": user_id}).fetchall()

    result = []
    for row in rows:
        u = _get_user(db, row.follower_id)
        if u:
            result.append(FollowUserResponse(
                id=u.id, nickname=u.nickname,
                instagram_url=u.instagram_url,
                blog_url=getattr(u, 'blog_url', None),
                is_public=u.is_public,
                place_count=_place_count(db, u.id),
                status="accepted",
            ))
    return result


@router.get("/{user_id}/pending", response_model=list[FollowUserResponse])
def get_pending_sent(user_id: int, db: Session = Depends(get_db)):
    """내가 보낸 팔로우 요청 (pending)."""
    rows = db.execute(text(
        "SELECT following_id FROM follows WHERE follower_id=:uid AND status='pending'"
    ), {"uid": user_id}).fetchall()

    result = []
    for row in rows:
        u = _get_user(db, row.following_id)
        if u:
            result.append(FollowUserResponse(
                id=u.id, nickname=u.nickname,
                instagram_url=u.instagram_url,
                blog_url=getattr(u, 'blog_url', None),
                is_public=u.is_public,
                place_count=0,
                status="pending",
            ))
    return result


@router.get("/requests/{user_id}", response_model=list[FollowRequestResponse])
def get_follow_requests(user_id: int, db: Session = Depends(get_db)):
    """나에게 온 팔로우 요청."""
    rows = db.execute(text(
        "SELECT follower_id, created_at FROM follows "
        "WHERE following_id=:uid AND status='pending'"
    ), {"uid": user_id}).fetchall()

    result = []
    for row in rows:
        u = _get_user(db, row.follower_id)
        if u:
            result.append(FollowRequestResponse(
                from_user_id=u.id,
                from_nickname=u.nickname,
                from_instagram_url=u.instagram_url,
                requested_at=row.created_at,
            ))
    return result


@router.post("/requests/{from_id}/accept")
def accept_follow_request(from_id: int, user_id: int, db: Session = Depends(get_db)):
    result = db.execute(text(
        "UPDATE follows SET status='accepted' "
        "WHERE follower_id=:fid AND following_id=:uid AND status='pending'"
    ), {"fid": from_id, "uid": user_id})
    db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="팔로우 요청을 찾을 수 없습니다.")
    _create_notification(db, from_id, user_id, "follow_accepted")
    db.commit()
    return {"message": "팔로우 요청을 수락했습니다."}


@router.post("/requests/{from_id}/reject", status_code=204)
def reject_follow_request(from_id: int, user_id: int, db: Session = Depends(get_db)):
    result = db.execute(text(
        "DELETE FROM follows WHERE follower_id=:fid AND following_id=:uid AND status='pending'"
    ), {"fid": from_id, "uid": user_id})
    db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="팔로우 요청을 찾을 수 없습니다.")
