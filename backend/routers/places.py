"""
routers/places.py
개인 맛집 CRUD + 좋아요 + 댓글 + 알림 + 이웃 표시 + 활동 피드
"""

import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel
from datetime import datetime
from typing import Literal

from database import get_db
from models import User, Follow, Folder, PersonalPlace, PlaceLike, PlaceComment, Notification
from routers.push import send_push_to_user

router = APIRouter(tags=["places"])

VALID_STATUSES = {"want_to_go", "visited", "want_revisit"}


# ── 스키마 ───────────────────────────────────────────────────

class PlaceCreate(BaseModel):
    name: str
    address: str | None = None
    lat: float
    lng: float
    category: str | None = None
    naver_place_id: str | None = None
    naver_place_url: str | None = None
    folder_id: int | None = None
    status: str = "want_to_go"
    rating: int | None = None
    memo: str | None = None
    photo_url: str | None = None
    photo_urls: list[str] | None = None
    instagram_post_url: str | None = None
    is_public: bool = True


class PlaceUpdate(BaseModel):
    folder_id: int | None = None
    status: str | None = None
    rating: int | None = None
    memo: str | None = None
    photo_url: str | None = None
    photo_urls: list[str] | None = None
    instagram_post_url: str | None = None
    is_public: bool | None = None


class PlaceResponse(BaseModel):
    id: int
    user_id: int | None
    owner_nickname: str | None
    folder_id: int | None
    name: str
    address: str | None
    lat: float
    lng: float
    category: str | None
    naver_place_url: str | None
    naver_place_id: str | None
    status: str
    rating: int | None
    memo: str | None
    photo_url: str | None
    photo_urls: list[str]
    instagram_post_url: str | None
    is_public: bool
    like_count: int
    comment_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class NeighborResponse(BaseModel):
    """같은 가게를 저장한 이웃."""
    user_id: int
    nickname: str
    instagram_url: str | None
    status: str
    rating: int | None
    memo: str | None


class ActivityResponse(BaseModel):
    """팔로잉 활동 피드 아이템."""
    place_id: int
    place_name: str
    place_address: str | None
    place_category: str | None
    place_lat: float
    place_lng: float
    place_status: str
    rating: int | None
    memo: str | None
    photo_url: str | None
    photo_urls: list[str]
    instagram_post_url: str | None
    like_count: int
    comment_count: int
    owner_id: int
    owner_nickname: str
    created_at: datetime


class CommentCreate(BaseModel):
    content: str
    user_id: int
    parent_id: int | None = None


class CommentResponse(BaseModel):
    id: int
    place_id: int
    user_id: int
    author_nickname: str
    content: str
    parent_id: int | None = None
    replies: list["CommentResponse"] = []
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationResponse(BaseModel):
    id: int
    type: str
    actor_id: int
    actor_nickname: str
    target_place_id: int | None
    target_place_name: str | None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── 헬퍼 ─────────────────────────────────────────────────────

def _parse_photo_urls(p: PersonalPlace) -> list[str]:
    """photo_urls JSON 파싱. photo_url만 있으면 [photo_url] 반환."""
    import logging
    logger = logging.getLogger(__name__)
    urls = []
    if p.photo_urls:
        try:
            urls = json.loads(p.photo_urls)
        except (json.JSONDecodeError, TypeError):
            pass
    if not urls and p.photo_url:
        urls = [p.photo_url]
    logger.info(f"[_parse_photo_urls] place={p.id} photo_url={p.photo_url} photo_urls_raw={p.photo_urls} parsed={urls}")
    return urls


def _to_place_response(p: PersonalPlace, db: Session) -> PlaceResponse:
    owner = db.query(User).filter(User.id == p.user_id).first() if p.user_id else None
    return PlaceResponse(
        id=p.id, user_id=p.user_id,
        owner_nickname=owner.nickname if owner else None,
        folder_id=p.folder_id, name=p.name, address=p.address,
        lat=p.lat, lng=p.lng, category=p.category,
        naver_place_url=p.naver_place_url, naver_place_id=p.naver_place_id,
        status=p.status, rating=p.rating, memo=p.memo,
        photo_url=p.photo_url, photo_urls=_parse_photo_urls(p),
        instagram_post_url=p.instagram_post_url,
        is_public=p.is_public,
        like_count=len(p.likes), comment_count=len(p.comments),
        created_at=p.created_at,
    )

def _create_notification(db, user_id, actor_id, ntype, place_id=None):
    if user_id == actor_id:
        return
    db.add(Notification(user_id=user_id, actor_id=actor_id, type=ntype, target_place_id=place_id))


# ══ 맛집 CRUD ═════════════════════════════════════════════════

@router.get("/personal-places/{place_id}/detail", response_model=PlaceResponse)
def get_place_detail(place_id: int, db: Session = Depends(get_db)):
    """장소 ID로 상세 조회 (공개 장소만, 딥링크/공유용)."""
    place = db.query(PersonalPlace).filter(PersonalPlace.id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="장소를 찾을 수 없습니다.")
    return _to_place_response(place, db)


@router.get("/personal-places/", response_model=list[PlaceResponse])
def list_my_places(
    user_id: int,
    status: str | None = Query(default=None),
    rating_gte: int | None = Query(default=None),
    folder_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    q = db.query(PersonalPlace).filter(PersonalPlace.user_id == user_id)
    if status:
        if status not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail=f"유효하지 않은 status: {status}")
        q = q.filter(PersonalPlace.status == status)
    if rating_gte is not None:
        q = q.filter(PersonalPlace.rating >= rating_gte)
    if folder_id is not None:
        q = q.filter(PersonalPlace.folder_id == folder_id)
    return [_to_place_response(p, db) for p in q.order_by(PersonalPlace.created_at.desc()).all()]


@router.get("/users/{target_user_id}/places", response_model=list[PlaceResponse])
def list_user_places(
    target_user_id: int,
    viewer_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    target = db.query(User).filter(User.id == target_user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다.")
    is_owner = viewer_id == target_user_id
    q = db.query(PersonalPlace).filter(PersonalPlace.user_id == target_user_id)
    if not is_owner:
        if not target.is_public:
            raise HTTPException(status_code=403, detail="비공개 유저입니다.")
        q = q.filter(PersonalPlace.is_public == True)
    return [_to_place_response(p, db) for p in q.order_by(PersonalPlace.created_at.desc()).all()]


@router.post("/personal-places/", response_model=PlaceResponse, status_code=201)
def create_place(body: PlaceCreate, user_id: int, db: Session = Depends(get_db)):
    if body.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"유효하지 않은 status: {body.status}")
    if body.rating is not None and not (1 <= body.rating <= 5):
        raise HTTPException(status_code=400, detail="별점은 1~5 사이여야 합니다.")
    if body.status == "want_to_go" and body.rating is not None:
        raise HTTPException(status_code=400, detail="'가고 싶어요' 상태에서는 별점을 입력할 수 없습니다.")
    data = body.dict()
    if data.get("photo_urls"):
        data["photo_urls"] = json.dumps(data["photo_urls"])
        if not data.get("photo_url"):
            data["photo_url"] = json.loads(data["photo_urls"])[0]
    else:
        data["photo_urls"] = None
    place = PersonalPlace(user_id=user_id, **data)
    db.add(place)
    db.commit()
    db.refresh(place)
    return _to_place_response(place, db)


@router.patch("/personal-places/{place_id}", response_model=PlaceResponse)
def update_place(place_id: int, body: PlaceUpdate, user_id: int, db: Session = Depends(get_db)):
    place = db.query(PersonalPlace).filter(PersonalPlace.id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="맛집을 찾을 수 없습니다.")
    if place.user_id != user_id:
        raise HTTPException(status_code=403, detail="본인의 맛집만 수정할 수 있습니다.")

    if body.status is not None:
        if body.status not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail=f"유효하지 않은 status: {body.status}")
        place.status = body.status
        if body.status == "want_to_go":
            place.rating = None
    if body.rating is not None:
        if place.status == "want_to_go":
            raise HTTPException(status_code=400, detail="'가고 싶어요' 상태에서는 별점 불가.")
        if not (1 <= body.rating <= 5):
            raise HTTPException(status_code=400, detail="별점은 1~5 사이여야 합니다.")
        place.rating = body.rating
    if body.folder_id is not None:
        place.folder_id = body.folder_id
    if body.memo is not None:
        place.memo = body.memo or None
    if body.photo_urls is not None:
        place.photo_urls = json.dumps(body.photo_urls) if body.photo_urls else None
        place.photo_url = body.photo_urls[0] if body.photo_urls else None
    elif body.photo_url is not None:
        place.photo_url = body.photo_url or None
    if body.instagram_post_url is not None:
        place.instagram_post_url = body.instagram_post_url or None
    if body.is_public is not None:
        place.is_public = body.is_public

    db.commit()
    db.refresh(place)
    return _to_place_response(place, db)


@router.delete("/personal-places/{place_id}", status_code=204)
def delete_place(place_id: int, user_id: int, db: Session = Depends(get_db)):
    place = db.query(PersonalPlace).filter(PersonalPlace.id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="맛집을 찾을 수 없습니다.")
    if place.user_id != user_id:
        raise HTTPException(status_code=403, detail="본인의 맛집만 삭제할 수 있습니다.")
    db.delete(place)
    db.commit()


# ══ 이웃 표시 ════════════════════════════════════════════════

@router.get("/places/{place_id}/neighbors", response_model=list[NeighborResponse])
def get_neighbors(place_id: int, viewer_id: int | None = Query(default=None), db: Session = Depends(get_db)):
    """
    같은 naver_place_id를 저장한 다른 유저 목록.
    팔로잉 관계인 사람만 표시.
    """
    place = db.query(PersonalPlace).filter(PersonalPlace.id == place_id).first()
    if not place or not place.naver_place_id:
        return []

    # 같은 naver_place_id를 가진 다른 맛집
    same_places = db.query(PersonalPlace).filter(
        PersonalPlace.naver_place_id == place.naver_place_id,
        PersonalPlace.id != place_id,
        PersonalPlace.is_public == True,
    ).all()

    if not same_places:
        return []

    # viewer의 팔로잉 목록
    following_ids = set()
    if viewer_id:
        follows = db.query(Follow).filter(
            Follow.follower_id == viewer_id,
            Follow.status == "accepted",
        ).all()
        following_ids = {f.following_id for f in follows}

    result = []
    for p in same_places:
        if not p.user_id:
            continue
        # 본인이거나 팔로잉 중인 사람만
        if p.user_id == viewer_id or p.user_id in following_ids:
            owner = db.query(User).filter(User.id == p.user_id).first()
            if owner:
                result.append(NeighborResponse(
                    user_id=owner.id,
                    nickname=owner.nickname,
                    instagram_url=owner.instagram_url,
                    status=p.status,
                    rating=p.rating,
                    memo=p.memo,
                ))
    return result


# ══ 활동 피드 ════════════════════════════════════════════════

@router.get("/activity-feed", response_model=list[ActivityResponse])
def get_activity_feed(user_id: int, limit: int = 30, db: Session = Depends(get_db)):
    """
    팔로잉한 사람들의 최근 맛집 활동 피드.
    최근 추가/업데이트된 공개 맛집을 시간순으로 반환.
    """
    # 팔로잉 목록 (accepted만)
    follows = db.query(Follow).filter(
        Follow.follower_id == user_id,
        Follow.status == "accepted",
    ).all()
    following_ids = [f.following_id for f in follows]

    if not following_ids:
        return []

    places = db.query(PersonalPlace).filter(
        PersonalPlace.user_id.in_(following_ids),
        PersonalPlace.is_public == True,
    ).order_by(desc(PersonalPlace.created_at)).limit(limit).all()

    result = []
    for p in places:
        owner = db.query(User).filter(User.id == p.user_id).first()
        if owner:
            result.append(ActivityResponse(
                place_id=p.id,
                place_name=p.name,
                place_address=p.address,
                place_category=p.category,
                place_lat=p.lat,
                place_lng=p.lng,
                place_status=p.status,
                rating=p.rating,
                memo=p.memo,
                photo_url=p.photo_url,
                photo_urls=_parse_photo_urls(p),
                instagram_post_url=p.instagram_post_url,
                like_count=len(p.likes),
                comment_count=len(p.comments),
                owner_id=owner.id,
                owner_nickname=owner.nickname,
                created_at=p.created_at,
            ))
    return result


# ══ 좋아요 ════════════════════════════════════════════════════

@router.post("/places/{place_id}/like", status_code=200)
def toggle_like(place_id: int, user_id: int, db: Session = Depends(get_db)):
    place = db.query(PersonalPlace).filter(PersonalPlace.id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="맛집을 찾을 수 없습니다.")
    if not place.is_public:
        raise HTTPException(status_code=403, detail="비공개 맛집입니다.")

    existing = db.query(PlaceLike).filter(
        PlaceLike.place_id == place_id, PlaceLike.user_id == user_id,
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        db.refresh(place)
        return {"liked": False, "like_count": len(place.likes)}
    else:
        db.add(PlaceLike(place_id=place_id, user_id=user_id))
        if place.user_id:
            _create_notification(db, place.user_id, user_id, "like", place_id)
            actor = db.query(User).filter(User.id == user_id).first()
            if actor:
                send_push_to_user(db, place.user_id,
                    "나의 공간", f"{actor.nickname}님이 '{place.name}'에 좋아요를 눌렀어요",
                    url=f"/?place={place_id}", tag=f"like-{place_id}")
        db.commit()
        db.refresh(place)
        return {"liked": True, "like_count": len(place.likes)}


@router.get("/places/{place_id}/like-status")
def get_like_status(place_id: int, user_id: int, db: Session = Depends(get_db)):
    existing = db.query(PlaceLike).filter(
        PlaceLike.place_id == place_id, PlaceLike.user_id == user_id,
    ).first()
    place = db.query(PersonalPlace).filter(PersonalPlace.id == place_id).first()
    return {"liked": existing is not None, "like_count": len(place.likes) if place else 0}


# ══ 댓글 ══════════════════════════════════════════════════════

def _build_comment_response(c, db: Session) -> CommentResponse:
    author = db.query(User).filter(User.id == c.user_id).first()
    replies = []
    for r in sorted(c.replies, key=lambda x: x.created_at):
        replies.append(_build_comment_response(r, db))
    return CommentResponse(
        id=c.id, place_id=c.place_id, user_id=c.user_id,
        author_nickname=author.nickname if author else "알 수 없음",
        content=c.content, parent_id=c.parent_id,
        replies=replies, created_at=c.created_at,
    )


@router.get("/places/{place_id}/comments", response_model=list[CommentResponse])
def list_comments(place_id: int, db: Session = Depends(get_db)):
    place = db.query(PersonalPlace).filter(PersonalPlace.id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="맛집을 찾을 수 없습니다.")
    # Only fetch top-level comments (no parent); replies are nested via relationship
    comments = db.query(PlaceComment).filter(
        PlaceComment.place_id == place_id,
        PlaceComment.parent_id == None,
    ).order_by(PlaceComment.created_at.asc()).all()
    return [_build_comment_response(c, db) for c in comments]


@router.post("/places/{place_id}/comments", response_model=CommentResponse, status_code=201)
def create_comment(place_id: int, body: CommentCreate, db: Session = Depends(get_db)):
    place = db.query(PersonalPlace).filter(PersonalPlace.id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="맛집을 찾을 수 없습니다.")
    if not place.is_public:
        raise HTTPException(status_code=403, detail="비공개 맛집입니다.")

    if place.user_id and body.user_id != place.user_id:
        is_follower = db.query(Follow).filter(
            Follow.follower_id == body.user_id,
            Follow.following_id == place.user_id,
            Follow.status == "accepted",
        ).first()
        if not is_follower:
            raise HTTPException(status_code=403, detail="팔로워만 댓글을 작성할 수 있습니다.")

    if not body.content.strip():
        raise HTTPException(status_code=400, detail="댓글 내용을 입력해주세요.")

    # Validate parent_id if replying
    if body.parent_id:
        parent = db.query(PlaceComment).filter(
            PlaceComment.id == body.parent_id, PlaceComment.place_id == place_id,
        ).first()
        if not parent:
            raise HTTPException(status_code=404, detail="원댓글을 찾을 수 없습니다.")

    comment = PlaceComment(
        place_id=place_id, user_id=body.user_id,
        content=body.content.strip(), parent_id=body.parent_id,
    )
    db.add(comment)

    # Notify place owner
    if place.user_id:
        _create_notification(db, place.user_id, body.user_id, "comment", place_id)
        actor = db.query(User).filter(User.id == body.user_id).first()
        if actor:
            send_push_to_user(db, place.user_id,
                "나의 공간", f"{actor.nickname}님이 '{place.name}'에 댓글을 남겼어요",
                url=f"/?place={place_id}", tag=f"comment-{place_id}")

    # Notify parent comment author if it's a reply
    if body.parent_id:
        parent_comment = db.query(PlaceComment).filter(PlaceComment.id == body.parent_id).first()
        if parent_comment and parent_comment.user_id != body.user_id:
            _create_notification(db, parent_comment.user_id, body.user_id, "comment", place_id)

    db.commit()
    db.refresh(comment)
    return _build_comment_response(comment, db)


@router.delete("/comments/{comment_id}", status_code=204)
def delete_comment(comment_id: int, user_id: int, db: Session = Depends(get_db)):
    comment = db.query(PlaceComment).filter(PlaceComment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="댓글을 찾을 수 없습니다.")
    if comment.user_id != user_id:
        raise HTTPException(status_code=403, detail="본인의 댓글만 삭제할 수 있습니다.")
    db.delete(comment)
    db.commit()


# ══ 알림 ══════════════════════════════════════════════════════

@router.get("/notifications/", response_model=list[NotificationResponse])
def list_notifications(user_id: int, db: Session = Depends(get_db)):
    notifications = db.query(Notification).filter(
        Notification.user_id == user_id
    ).order_by(Notification.created_at.desc()).limit(50).all()

    result = []
    for n in notifications:
        actor = db.query(User).filter(User.id == n.actor_id).first()
        place = db.query(PersonalPlace).filter(PersonalPlace.id == n.target_place_id).first() \
            if n.target_place_id else None
        result.append(NotificationResponse(
            id=n.id, type=n.type,
            actor_id=n.actor_id,
            actor_nickname=actor.nickname if actor else "알 수 없음",
            target_place_id=n.target_place_id,
            target_place_name=place.name if place else None,
            is_read=n.is_read, created_at=n.created_at,
        ))
    return result


@router.patch("/notifications/read", status_code=200)
def mark_all_read(user_id: int, db: Session = Depends(get_db)):
    db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"message": "모든 알림을 읽음 처리했습니다."}


@router.delete("/notifications/{notification_id}", status_code=204)
def delete_notification(notification_id: int, user_id: int, db: Session = Depends(get_db)):
    n = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user_id,
    ).first()
    if not n:
        raise HTTPException(status_code=404, detail="알림을 찾을 수 없습니다.")
    db.delete(n)
    db.commit()


@router.delete("/notifications/", status_code=204)
def delete_all_notifications(user_id: int, db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.user_id == user_id).delete()
    db.commit()
