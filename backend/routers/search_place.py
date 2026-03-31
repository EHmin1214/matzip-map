"""
routers/search_place.py
가게명으로 네이버 장소 검색해서 좌표를 반환하는 엔드포인트.
광고 분석 검색 시 지도 마커 추가에 사용.
"""

from fastapi import APIRouter, Query
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from routers.place_resolver import PlaceResolver
from scrapers.base import PostData, SourceType
from datetime import datetime


router = APIRouter(prefix="/search-place", tags=["search-place"])


class PlaceResponse(BaseModel):
    name: str
    address: str
    lat: float
    lng: float
    category: str
    naver_place_url: str
    naver_place_id: str


@router.get("/", response_model=list[PlaceResponse])
def search_place(name: str = Query(...)):
    """가게명으로 네이버 장소 검색 후 최대 5개 반환."""
    resolver = PlaceResolver()

    dummy_post = PostData(
        source=SourceType.NAVER_BLOG,
        post_id="search", post_url="",
        title=name, content="",
        author_id="", author_name="",
        published_at=datetime.now(),
    )

    results = resolver._search_places(name, None, dummy_post, max_results=5)
    return [
        PlaceResponse(
            name=r.name,
            address=r.address,
            lat=r.lat,
            lng=r.lng,
            category=r.category,
            naver_place_url=r.naver_place_url,
            naver_place_id=r.naver_place_id,
        )
        for r in results
    ]
