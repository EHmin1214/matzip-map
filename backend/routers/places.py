"""
routers/places.py
개인 맛집 CRUD + 좋아요 + 댓글 + 알림.

status 값: want_to_go | visited | want_revisit | not_recommended
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from typing import Literal

from database import get_db
from models import User, Follow, Folder, PersonalPlace, PlaceLike, PlaceComment, Notification

router = APIRouter(tags=["places"])

VALID_STATUSES = {"want_to_go", "visited", "want_revisit", "not_recommended"}


# ── Pydantic 스키마 ──────────────────────────────────────────

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
    rating: int | None = None          # 1~5
    memo: str | None = None
    instagram_post_url: str | None = None
    is_public: bool = True


class PlaceUpdate(BaseModel):
    folder_id: int | None = None
    status: str | None = None
    rating: int | None = None
    memo: str | None = None
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
    status: str
    rating: int | None
    memo: str | None
    instagram_post_url: str | None
    is_public: bool
    like_count: int
    comment_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class CommentCreate(BaseModel):
    content: str
    user_id: int


class CommentResponse(BaseModel):
    id: int
    place_id: int
    user_id: int
    author_nickname: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationResponse(BaseModel):
    id: int
    type: str
    actor_nickname: str
    target_place_id: int | None
    target_place_name: str | None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── 헬퍼 ────────────────────────────────────────────────────

def _to_place_response(p: PersonalPlace, db: Session) -> PlaceResponse:
    owner = db.query(User).filter(User.id == p.user_id).first() if p.user_id else None
    return PlaceResponse(
        id=p.id,
        user_id=p.user_id,
        owner_nickname=owner.nickname if owner else None,
        folder_id=p.folder_id,
        name=p.name,
        address=p.address,
        lat=p.lat,
        lng=p.lng,
        category=p.category,
        naver_place_url=p.naver_place_url,
        status=p.status,
        rating=p.rating,
        memo=p.memo,
        instagram_post_url=p.instagram_post_url,
        is_public=p.is_public,
        like_count=len(p.likes),
        comment_count=len(p.comments),
        created_at=p.created_at,
    )

def _create_notification(db: Session, user_id: int, actor_id: int,
                          ntype: str, place_id: int | None = None):
    """알림 생성 헬퍼. 자기 자신에겐 알림 안 보냄."""
    if user_id == actor_id:
        return
    db.add(Notification(
        user_id=user_id,
        actor_id=actor_id,
        type=ntype,
        target_place_id=place_id,
    ))


# ══ 맛집 CRUD ═════════════════════════════════════════════════

@router.get("/personal-places/", response_model=list[PlaceResponse])
def list_my_places(
    user_id: int,
    status: str | None = Query(default=None),
    rating_gte: int | None = Query(default=None),
    folder_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    """
    내 맛집 목록 조회. 상태 / 별점 / 폴더 필터 지원.
    예: /personal-places/?user_id=1&status=want_revisit&rating_gte=4
    """
    q = db.query(PersonalPlace).filter(PersonalPlace.user_id == user_id)

    if status:
        if status not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail=f"유효하지 않은 status: {status}")
        q = q.filter(PersonalPlace.status == status)

    if rating_gte is not None:
        q = q.filter(PersonalPlace.rating >= rating_gte)

    if folder_id is not None:
        q = q.filter(PersonalPlace.folder_id == folder_id)

    places = q.order_by(PersonalPlace.created_at.desc()).all()
    return [_to_place_response(p, db) for p in places]


@router.get("/users/{target_user_id}/places", response_model=list[PlaceResponse])
def list_user_places(
    target_user_id: int,
    viewer_id: int | None = Query(default=None),  # 현재 로그인 유저 (없으면 비로그인)
    db: Session = Depends(get_db),
):
    """
    특정 유저의 공개 맛집 목록.
    본인이면 비공개도 포함.
    """
    target = db.query(User).filter(User.id == target_user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다.")

    is_owner = viewer_id == target_user_id

    q = db.query(PersonalPlace).filter(PersonalPlace.user_id == target_user_id)
    if not is_owner:
        if not target.is_public:
            raise HTTPException(status_code=403, detail="비공개 유저입니다.")
        q = q.filter(PersonalPlace.is_public == True)

    places = q.order_by(PersonalPlace.created_at.desc()).all()
    return [_to_place_response(p, db) for p in places]


@router.post("/personal-places/", response_model=PlaceResponse, status_code=201)
def create_place(body: PlaceCreate, user_id: int, db: Session = Depends(get_db)):
    """맛집 저장."""
    if body.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"유효하지 않은 status: {body.status}")

    if body.rating is not None and not (1 <= body.rating <= 5):
        raise HTTPException(status_code=400, detail="별점은 1~5 사이여야 합니다.")

    # 방문 전 상태에서 별점 입력 방지
    if body.status == "want_to_go" and body.rating is not None:
        raise HTTPException(status_code=400, detail="'가고 싶어요' 상태에서는 별점을 입력할 수 없습니다.")

    place = PersonalPlace(
        user_id=user_id,
        folder_id=body.folder_id,
        name=body.name,
        address=body.address,
        lat=body.lat,
        lng=body.lng,
        category=body.category,
        naver_place_id=body.naver_place_id,
        naver_place_url=body.naver_place_url,
        status=body.status,
        rating=body.rating,
        memo=body.memo,
        instagram_post_url=body.instagram_post_url,
        is_public=body.is_public,
    )
    db.add(place)
    db.commit()
    db.refresh(place)
    return _to_place_response(place, db)


@router.patch("/personal-places/{place_id}", response_model=PlaceResponse)
def update_place(
    place_id: int,
    body: PlaceUpdate,
    user_id: int,
    db: Session = Depends(get_db),
):
    """맛집 수정. 본인만 가능."""
    place = db.query(PersonalPlace).filter(PersonalPlace.id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="맛집을 찾을 수 없습니다.")
    if place.user_id != user_id:
        raise HTTPException(status_code=403, detail="본인의 맛집만 수정할 수 있습니다.")

    if body.status is not None:
        if body.status not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail=f"유효하지 않은 status: {body.status}")
        place.status = body.status
        # want_to_go로 변경 시 별점 초기화
        if body.status == "want_to_go":
            place.rating = None

    if body.rating is not None:
        if place.status == "want_to_go":
            raise HTTPException(status_code=400, detail="'가고 싶어요' 상태에서는 별점을 입력할 수 없습니다.")
        if not (1 <= body.rating <= 5):
            raise HTTPException(status_code=400, detail="별점은 1~5 사이여야 합니다.")
        place.rating = body.rating

    if body.folder_id is not None:
        place.folder_id = body.folder_id
    if body.memo is not None:
        place.memo = body.memo or None
    if body.instagram_post_url is not None:
        place.instagram_post_url = body.instagram_post_url or None
    if body.is_public is not None:
        place.is_public = body.is_public

    db.commit()
    db.refresh(place)
    return _to_place_response(place, db)


@router.delete("/personal-places/{place_id}", status_code=204)
def delete_place(place_id: int, user_id: int, db: Session = Depends(get_db)):
    """맛집 삭제. 본인만 가능."""
    place = db.query(PersonalPlace).filter(PersonalPlace.id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="맛집을 찾을 수 없습니다.")
    if place.user_id != user_id:
        raise HTTPException(status_code=403, detail="본인의 맛집만 삭제할 수 있습니다.")

    db.delete(place)
    db.commit()


# ══ 좋아요 ════════════════════════════════════════════════════

@router.post("/places/{place_id}/like", status_code=200)
def toggle_like(place_id: int, user_id: int, db: Session = Depends(get_db)):
    """
    좋아요 토글.
    이미 좋아요면 취소, 아니면 추가.
    공개 맛집에만 가능.
    """
    place = db.query(PersonalPlace).filter(PersonalPlace.id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="맛집을 찾을 수 없습니다.")
    if not place.is_public:
        raise HTTPException(status_code=403, detail="비공개 맛집입니다.")

    existing = db.query(PlaceLike).filter(
        PlaceLike.place_id == place_id,
        PlaceLike.user_id == user_id,
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        return {"liked": False, "like_count": len(place.likes) - 1}
    else:
        db.add(PlaceLike(place_id=place_id, user_id=user_id))
        # 알림 생성 (맛집 소유자에게)
        if place.user_id:
            _create_notification(db, place.user_id, user_id, "like", place_id)
        db.commit()
        db.refresh(place)
        return {"liked": True, "like_count": len(place.likes)}


# ══ 댓글 ══════════════════════════════════════════════════════

@router.get("/places/{place_id}/comments", response_model=list[CommentResponse])
def list_comments(place_id: int, db: Session = Depends(get_db)):
    """댓글 목록 조회."""
    place = db.query(PersonalPlace).filter(PersonalPlace.id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="맛집을 찾을 수 없습니다.")

    comments = db.query(PlaceComment).filter(
        PlaceComment.place_id == place_id
    ).order_by(PlaceComment.created_at.asc()).all()

    result = []
    for c in comments:
        author = db.query(User).filter(User.id == c.user_id).first()
        result.append(CommentResponse(
            id=c.id,
            place_id=c.place_id,
            user_id=c.user_id,
            author_nickname=author.nickname if author else "알 수 없음",
            content=c.content,
            created_at=c.created_at,
        ))
    return result


@router.post("/places/{place_id}/comments", response_model=CommentResponse, status_code=201)
def create_comment(place_id: int, body: CommentCreate, db: Session = Depends(get_db)):
    """
    댓글 작성.
    맛집 소유자 팔로워만 작성 가능 (본인은 항상 가능).
    공개 맛집에만 가능.
    """
    place = db.query(PersonalPlace).filter(PersonalPlace.id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="맛집을 찾을 수 없습니다.")
    if not place.is_public:
        raise HTTPException(status_code=403, detail="비공개 맛집입니다.")

    # 본인이 아닌 경우 팔로워 여부 확인
    if place.user_id and body.user_id != place.user_id:
        is_follower = db.query(Follow).filter(
            Follow.follower_id == body.user_id,
            Follow.following_id == place.user_id,
        ).first()
        if not is_follower:
            raise HTTPException(status_code=403, detail="팔로워만 댓글을 작성할 수 있습니다.")

    if not body.content.strip():
        raise HTTPException(status_code=400, detail="댓글 내용을 입력해주세요.")

    comment = PlaceComment(
        place_id=place_id,
        user_id=body.user_id,
        content=body.content.strip(),
    )
    db.add(comment)

    # 알림 생성
    if place.user_id:
        _create_notification(db, place.user_id, body.user_id, "comment", place_id)

    db.commit()
    db.refresh(comment)

    author = db.query(User).filter(User.id == body.user_id).first()
    return CommentResponse(
        id=comment.id,
        place_id=comment.place_id,
        user_id=comment.user_id,
        author_nickname=author.nickname if author else "알 수 없음",
        content=comment.content,
        created_at=comment.created_at,
    )


@router.delete("/comments/{comment_id}", status_code=204)
def delete_comment(comment_id: int, user_id: int, db: Session = Depends(get_db)):
    """댓글 삭제. 본인만 가능."""
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
    """내 알림 목록. 최신순 50개."""
    notifications = db.query(Notification).filter(
        Notification.user_id == user_id
    ).order_by(Notification.created_at.desc()).limit(50).all()

    result = []
    for n in notifications:
        actor = db.query(User).filter(User.id == n.actor_id).first()
        place = db.query(PersonalPlace).filter(PersonalPlace.id == n.target_place_id).first() \
            if n.target_place_id else None
        result.append(NotificationResponse(
            id=n.id,
            type=n.type,
            actor_nickname=actor.nickname if actor else "알 수 없음",
            target_place_id=n.target_place_id,
            target_place_name=place.name if place else None,
            is_read=n.is_read,
            created_at=n.created_at,
        ))
    return result


@router.patch("/notifications/read", status_code=200)
def mark_all_read(user_id: int, db: Session = Depends(get_db)):
    """알림 전체 읽음 처리."""
    db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"message": "모든 알림을 읽음 처리했습니다."}
