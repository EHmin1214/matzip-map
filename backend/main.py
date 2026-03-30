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

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from sqlalchemy import text
from database import engine
from models import Base
from routers import accounts, crawl, restaurants, ad_check, search_place, personal_places
from routers import users, follows, places, folders, upload, push, lists

Base.metadata.create_all(bind=engine)

# Auto-add missing columns (safe for re-runs)
def _auto_migrate():
    """Add columns that create_all doesn't handle on existing tables."""
    with engine.connect() as conn:
        for stmt in [
            "ALTER TABLE personal_places ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500)",
            "ALTER TABLE personal_places ADD COLUMN IF NOT EXISTS photo_urls TEXT",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS kakao_id VARCHAR(50) UNIQUE",
        ]:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception:
                conn.rollback()

try:
    _auto_migrate()
except Exception:
    pass

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
        "https://matzip-map.vercel.app",
        "https://myplace-map.vercel.app",

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
app.include_router(personal_places.router)
app.include_router(folders.router)

# 신규 라우터
app.include_router(users.router)
app.include_router(follows.router)
app.include_router(places.router)
app.include_router(upload.router)
app.include_router(push.router)
app.include_router(lists.router)


FRONTEND_URL = "https://myplace-map.vercel.app"


@app.get("/")
def root():
    return {"status": "ok", "message": "맛집 지도 API v2"}


@app.get("/og/@{nickname}", response_class=HTMLResponse)
def og_profile(nickname: str):
    """카카오톡/인스타 공유용 OG 메타태그 HTML. 브라우저는 프론트엔드로 리디렉트."""
    from database import SessionLocal
    from models import User, PersonalPlace

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.nickname == nickname).first()
        if not user or not user.is_public:
            title = "나의 공간 — The Curated Archive"
            desc = "나만의 맛집 지도를 만들어보세요"
            place_count = 0
        else:
            place_count = db.query(PersonalPlace).filter(
                PersonalPlace.user_id == user.id, PersonalPlace.is_public == True
            ).count()
            title = f"{user.nickname}의 공간"
            desc = f"{place_count}곳의 큐레이션 맛집 지도"
    finally:
        db.close()

    redirect_url = f"{FRONTEND_URL}/@{nickname}"
    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{title}</title>
<meta property="og:title" content="{title}" />
<meta property="og:description" content="{desc}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="{redirect_url}" />
<meta property="og:image" content="{FRONTEND_URL}/og-image.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{title}" />
<meta name="twitter:description" content="{desc}" />
<meta http-equiv="refresh" content="0;url={redirect_url}" />
</head>
<body>
<p>Redirecting to <a href="{redirect_url}">{title}</a>...</p>
</body>
</html>"""


@app.get("/og/place/{place_id}", response_class=HTMLResponse)
def og_place(place_id: int):
    """장소 공유용 OG 메타태그 HTML."""
    from database import SessionLocal
    from models import PersonalPlace, User

    db = SessionLocal()
    try:
        place = db.query(PersonalPlace).filter(PersonalPlace.id == place_id).first()
        if not place:
            title = "나의 공간"
            desc = "나만의 맛집 지도를 만들어보세요"
            image = f"{FRONTEND_URL}/og-image.png"
        else:
            owner = db.query(User).filter(User.id == place.user_id).first()
            title = f"{place.name}"
            desc = f"{owner.nickname if owner else ''}님의 큐레이션"
            if place.memo:
                desc += f' — "{place.memo[:60]}"'
            image = place.photo_url or f"{FRONTEND_URL}/og-image.png"
    finally:
        db.close()

    redirect_url = f"{FRONTEND_URL}/?place={place_id}"
    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{title} — 나의 공간</title>
<meta property="og:title" content="{title}" />
<meta property="og:description" content="{desc}" />
<meta property="og:type" content="article" />
<meta property="og:url" content="{redirect_url}" />
<meta property="og:image" content="{image}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{title}" />
<meta name="twitter:description" content="{desc}" />
<meta http-equiv="refresh" content="0;url={redirect_url}" />
</head>
<body>
<p>Redirecting to <a href="{redirect_url}">{title}</a>...</p>
</body>
</html>"""


@app.get("/og/list/{list_id}", response_class=HTMLResponse)
def og_list(list_id: int):
    """큐레이션 리스트 공유용 OG 메타태그."""
    from database import SessionLocal
    from models import CuratedList, User

    db = SessionLocal()
    try:
        cl = db.query(CuratedList).filter(CuratedList.id == list_id).first()
        if not cl:
            title = "나의 공간"
            desc = "큐레이션 리스트"
        else:
            owner = db.query(User).filter(User.id == cl.user_id).first()
            title = cl.title
            desc = f"{owner.nickname if owner else ''}님의 큐레이션 — {len(cl.items)}곳"
            if cl.description:
                desc = cl.description[:80]
    finally:
        db.close()

    redirect_url = f"{FRONTEND_URL}/list/{list_id}"
    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{title} — 나의 공간</title>
<meta property="og:title" content="{title}" />
<meta property="og:description" content="{desc}" />
<meta property="og:type" content="article" />
<meta property="og:url" content="{redirect_url}" />
<meta name="twitter:card" content="summary" />
<meta http-equiv="refresh" content="0;url={redirect_url}" />
</head>
<body>
<p>Redirecting...</p>
</body>
</html>"""
