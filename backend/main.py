"""
main.py
FastAPI 진입점.

[신규 라우터]
  /users          : 유저 가입 / 로그인 / 프로필
  /follows        : 팔로우 / 언팔로우 / 목록 / 레이어
  /personal-places: 맛집 CRUD + 상태/별점/필터
  /places         : 좋아요 / 댓글 / 알림

[기존 라우터 유지]
  /accounts, /crawl, /restaurants, /ad-check, /search-place, /personal-places (구버전)

[의존성 추가]
  pip install bcrypt
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine
from models import Base
from routers import accounts, crawl, restaurants, ad_check, search_place, personal_places
from routers import users, follows, places   # ← 신규

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="맛집 지도 API",
    description="블로그 크롤링 + 팔로우 기반 맛집 지도 서비스",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://restaurant-map-rosy.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 기존 라우터
app.include_router(accounts.router)
app.include_router(crawl.router)
app.include_router(restaurants.router)
app.include_router(ad_check.router)
app.include_router(search_place.router)
app.include_router(personal_places.router)   # 기존 personal-places (하위 호환)

# 신규 라우터
app.include_router(users.router)
app.include_router(follows.router)
app.include_router(places.router)


@app.get("/")
def root():
    return {"status": "ok", "message": "맛집 지도 API v2"}
