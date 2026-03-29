"""
routers/personal_places.py
개인 맛집 CRUD. user_id 기반으로 본인 것만 조회/저장/수정/삭제.
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


class PersonalPlaceUpdate(BaseModel):
    folder_id: int | None = None
    status: str | None = None
    rating: int | None = None
    memo: str | None = None
    instagram_post_url: str | None = None
    is_public: bool | None = None


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
    """user_id 있으면 해당 유저 것만, 없으면 빈 배열."""
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
    """맛집 저장. 중복 방지."""
    if user_id and body.naver_place_id:
        existing = db.query(PersonalPlace).filter(
            PersonalPlace.user_id == user_id,
            PersonalPlace.naver_place_id == body.naver_place_id,
        ).first()
        if existing:
            return existing
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


@router.patch("/{place_id}", response_model=PersonalPlaceResponse)
def update_personal_place(
    place_id: int,
    body: PersonalPlaceUpdate,
    user_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    """맛집 수정. 본인만 가능."""
    place = db.query(PersonalPlace).filter(PersonalPlace.id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="맛집을 찾을 수 없습니다.")

    if user_id and place.user_id and place.user_id != user_id:
        raise HTTPException(status_code=403, detail="본인의 맛집만 수정할 수 있습니다.")

    if body.status is not None:
        place.status = body.status
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
    return place


@router.delete("/{place_id}", status_code=204)
def delete_personal_place(
    place_id: int,
    user_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    """맛집 삭제. 본인만 가능."""
    place = db.query(PersonalPlace).filter(PersonalPlace.id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="찾을 수 없습니다.")
    if user_id and place.user_id and place.user_id != user_id:
        raise HTTPException(status_code=403, detail="본인의 맛집만 삭제할 수 있습니다.")
    db.delete(place)
    db.commit()
