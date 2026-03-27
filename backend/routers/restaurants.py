"""
routers/restaurants.py
맛집 조회 엔드포인트. 프론트 지도에서 마커 데이터로 사용.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models import Restaurant, PostRestaurant, Post, Account

router = APIRouter(prefix="/restaurants", tags=["restaurants"])


# ── Pydantic 스키마 ──────────────────────

class AccountMention(BaseModel):
    """마커에서 계정별 언급 정보."""
    account_id: int
    mention_count: int  # 해당 계정이 이 가게를 몇 번 언급했는지


class RestaurantMarker(BaseModel):
    """지도 마커용 최소 데이터."""
    id: int
    name: str
    lat: float
    lng: float
    category: str | None
    account_mentions: list[AccountMention]  # 계정별 언급 횟수

    class Config:
        from_attributes = True


class RestaurantDetail(BaseModel):
    """마커 클릭 시 상세 패널용 데이터."""
    id: int
    name: str
    category: str | None
    address: str | None
    lat: float
    lng: float
    naver_place_url: str | None
    sources: list[dict]

    class Config:
        from_attributes = True


# ── 엔드포인트 ───────────────────────────

@router.get("/", response_model=list[RestaurantMarker])
def list_restaurants(
    account_ids: list[int] = Query(default=[]),
    db: Session = Depends(get_db),
):
    query = db.query(Restaurant)

    if account_ids:
        query = query.join(PostRestaurant).join(Post).join(Account).filter(
            Account.id.in_(account_ids)
        ).distinct()

    restaurants = query.all()

    result = []
    for r in restaurants:
        # 계정별 언급 횟수 집계
        mention_map: dict[int, int] = {}
        for post_r in r.post_restaurants:
            acc_id = post_r.post.account_id
            if acc_id is not None:
                mention_map[acc_id] = mention_map.get(acc_id, 0) + 1

        account_mentions = [
            AccountMention(account_id=acc_id, mention_count=count)
            for acc_id, count in mention_map.items()
        ]

        result.append(RestaurantMarker(
            id=r.id,
            name=r.name,
            lat=r.lat,
            lng=r.lng,
            category=r.category,
            account_mentions=account_mentions,
        ))

    return result


@router.get("/{restaurant_id}", response_model=RestaurantDetail)
def get_restaurant(restaurant_id: int, db: Session = Depends(get_db)):
    r = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not r:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="맛집을 찾을 수 없습니다.")

    sources = []
    for post_r in r.post_restaurants:
        post = post_r.post
        account = post.account
        sources.append({
            "author_id": account.author_id if account else None,
            "author_name": account.author_name if account else None,
            "post_url": post.post_url,
            "post_title": post.title,
        })

    return RestaurantDetail(
        id=r.id,
        name=r.name,
        category=r.category,
        address=r.address,
        lat=r.lat,
        lng=r.lng,
        naver_place_url=r.naver_place_url,
        sources=sources,
    )
