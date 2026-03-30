"""
routers/lists.py
큐레이션 리스트 CRUD API.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from database import get_db
from models import CuratedList, CuratedListItem, PersonalPlace, User

router = APIRouter(prefix="/lists", tags=["lists"])


class ListCreate(BaseModel):
    title: str
    description: str | None = None
    is_public: bool = True
    place_ids: list[int] = []


class ListUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    is_public: bool | None = None


class AddItemRequest(BaseModel):
    place_id: int
    note: str | None = None


# ── CRUD ──────────────────────────────────────────────────

@router.post("/", status_code=201)
def create_list(body: ListCreate, user_id: int = Query(...), db: Session = Depends(get_db)):
    cl = CuratedList(user_id=user_id, title=body.title, description=body.description, is_public=body.is_public)
    db.add(cl)
    db.flush()
    for i, pid in enumerate(body.place_ids):
        db.add(CuratedListItem(list_id=cl.id, place_id=pid, order=i))
    db.commit()
    db.refresh(cl)
    return _to_response(cl, db)


@router.get("/")
def get_my_lists(user_id: int = Query(...), db: Session = Depends(get_db)):
    lists = db.query(CuratedList).filter(CuratedList.user_id == user_id).order_by(CuratedList.created_at.desc()).all()
    return [_to_response(cl, db) for cl in lists]


@router.get("/{list_id}")
def get_list(list_id: int, db: Session = Depends(get_db)):
    cl = db.query(CuratedList).filter(CuratedList.id == list_id).first()
    if not cl:
        raise HTTPException(status_code=404, detail="리스트를 찾을 수 없습니다")
    if not cl.is_public:
        raise HTTPException(status_code=403, detail="비공개 리스트입니다")
    return _to_response(cl, db, include_places=True)


@router.patch("/{list_id}")
def update_list(list_id: int, body: ListUpdate, user_id: int = Query(...), db: Session = Depends(get_db)):
    cl = db.query(CuratedList).filter(CuratedList.id == list_id, CuratedList.user_id == user_id).first()
    if not cl:
        raise HTTPException(status_code=404)
    if body.title is not None: cl.title = body.title
    if body.description is not None: cl.description = body.description
    if body.is_public is not None: cl.is_public = body.is_public
    db.commit()
    return _to_response(cl, db)


@router.delete("/{list_id}", status_code=204)
def delete_list(list_id: int, user_id: int = Query(...), db: Session = Depends(get_db)):
    cl = db.query(CuratedList).filter(CuratedList.id == list_id, CuratedList.user_id == user_id).first()
    if not cl:
        raise HTTPException(status_code=404)
    db.delete(cl)
    db.commit()


@router.post("/{list_id}/items", status_code=201)
def add_item(list_id: int, body: AddItemRequest, user_id: int = Query(...), db: Session = Depends(get_db)):
    cl = db.query(CuratedList).filter(CuratedList.id == list_id, CuratedList.user_id == user_id).first()
    if not cl:
        raise HTTPException(status_code=404)
    existing = db.query(CuratedListItem).filter(CuratedListItem.list_id == list_id, CuratedListItem.place_id == body.place_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="이미 추가된 장소입니다")
    max_order = max((item.order for item in cl.items), default=-1) + 1
    item = CuratedListItem(list_id=list_id, place_id=body.place_id, note=body.note, order=max_order)
    db.add(item)
    db.commit()
    return _to_response(cl, db)


@router.delete("/{list_id}/items/{place_id}", status_code=204)
def remove_item(list_id: int, place_id: int, user_id: int = Query(...), db: Session = Depends(get_db)):
    cl = db.query(CuratedList).filter(CuratedList.id == list_id, CuratedList.user_id == user_id).first()
    if not cl:
        raise HTTPException(status_code=404)
    item = db.query(CuratedListItem).filter(CuratedListItem.list_id == list_id, CuratedListItem.place_id == place_id).first()
    if item:
        db.delete(item)
        db.commit()


# ── 공개 리스트 (비회원 접근) ────────────────────────────────

@router.get("/public/{nickname}")
def get_user_public_lists(nickname: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.nickname == nickname).first()
    if not user:
        raise HTTPException(status_code=404)
    lists = db.query(CuratedList).filter(
        CuratedList.user_id == user.id, CuratedList.is_public == True
    ).order_by(CuratedList.created_at.desc()).all()
    return [_to_response(cl, db, include_places=True) for cl in lists]


def _to_response(cl: CuratedList, db: Session, include_places=False):
    owner = db.query(User).filter(User.id == cl.user_id).first()
    resp = {
        "id": cl.id,
        "title": cl.title,
        "description": cl.description,
        "is_public": cl.is_public,
        "owner_nickname": owner.nickname if owner else None,
        "item_count": len(cl.items),
        "created_at": cl.created_at,
    }
    if include_places:
        resp["places"] = [
            {
                "id": item.place.id,
                "name": item.place.name,
                "address": item.place.address,
                "lat": item.place.lat,
                "lng": item.place.lng,
                "category": item.place.category,
                "status": item.place.status,
                "rating": item.place.rating,
                "memo": item.place.memo,
                "photo_url": item.place.photo_url,
                "note": item.note,
                "order": item.order,
            }
            for item in sorted(cl.items, key=lambda x: x.order)
        ]
    return resp
