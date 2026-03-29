"""
routers/personal_places.py
개인 맛집 관리. user_id 기반으로 본인 것만 조회/저장/삭제.

변경 사항:
  - GET /personal-places/ : user_id 쿼리 파라미터 필수 → 본인 것만 반환
  - POST /personal-places/ : user_id, status, rating, memo, instagram_post_url 지원
  - DELETE /personal-places/{id} : user_id 검증 추가
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from database import get_db
from models import PersonalPlace

router = APIRouter(prefix="/personal-places", tags=["personal-places"])


class PersonalPlaceCreate(BaseModel):
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
    instagram_post_url: str | None = None
    is_public: bool = True


class PersonalPlaceResponse(BaseModel):
    id: int
    user_id: int | None
    name: str
    address: str | None
    lat: float
    lng: float
    category: str | None
    naver_place_url: str | None
    folder_id: int | None = None
    status: str = "want_to_go"
    rating: int | None = None
    memo: str | None = None
    instagram_post_url: str | None = None
    is_public: bool = True

    class Config:
        from_attributes = True


@router.get("/", response_model=list[PersonalPlaceResponse])
def list_personal_places(
    user_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    """
    개인 맛집 목록 조회.
    - user_id 있으면 → 해당 유저 것만 반환 (로그인 상태)
    - user_id 없으면 → 빈 배열 반환 (비로그인 또는 user_id 미전달)
    """
    if user_id is None:
        return []
    return db.query(PersonalPlace).filter(
        PersonalPlace.user_id == user_id
    ).order_by(PersonalPlace.created_at.desc()).all()


@router.post("/", response_model=PersonalPlaceResponse, status_code=201)
def add_personal_place(
    body: PersonalPlaceCreate,
    user_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    """
    개인 맛집 저장.
    같은 유저가 같은 naver_place_id를 중복 저장하면 기존 것 반환.
    """
    # 중복 체크 (naver_place_id 기준, user_id 있을 때)
    if user_id and body.naver_place_id:
        existing = db.query(PersonalPlace).filter(
            PersonalPlace.user_id == user_id,
            PersonalPlace.naver_place_id == body.naver_place_id,
        ).first()
        if existing:
            return existing

    # naver_place_id 없으면 이름+주소로 중복 체크
    elif user_id:
        existing = db.query(PersonalPlace).filter(
            PersonalPlace.user_id == user_id,
            PersonalPlace.name == body.name,
            PersonalPlace.address == body.address,
        ).first()
        if existing:
            return existing

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
    return place


@router.delete("/{place_id}", status_code=204)
def delete_personal_place(
    place_id: int,
    user_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    """개인 맛집 삭제. 본인 것만 삭제 가능."""
    place = db.query(PersonalPlace).filter(PersonalPlace.id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="찾을 수 없습니다.")

    # user_id가 있으면 본인 것인지 검증
    if user_id and place.user_id and place.user_id != user_id:
        raise HTTPException(status_code=403, detail="본인의 맛집만 삭제할 수 있습니다.")

    db.delete(place)
    db.commit()
