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

import html as _html

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from sqlalchemy import text
from database import engine
from models import Base
from routers import accounts, crawl, restaurants, ad_check, search_place
from routers import users, follows, places, folders, upload, push, lists, feedback, shared_map

Base.metadata.create_all(bind=engine)

# Auto-add missing columns (safe for re-runs)
def _auto_migrate():
    """Add columns that create_all doesn't handle on existing tables."""
    with engine.connect() as conn:
        for stmt in [
            "ALTER TABLE personal_places ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500)",
            "ALTER TABLE personal_places ADD COLUMN IF NOT EXISTS photo_urls TEXT",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS kakao_id VARCHAR(50) UNIQUE",
            "ALTER TABLE place_comments ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES place_comments(id)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo_url VARCHAR(500)",
            "ALTER TABLE folders ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE",
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
# personal_places.router 제거 — places.router가 동일 엔드포인트를 photo_urls 포함하여 처리
app.include_router(folders.router)

# 신규 라우터
app.include_router(users.router)
app.include_router(follows.router)
app.include_router(places.router)
app.include_router(upload.router)
app.include_router(push.router)
app.include_router(lists.router)
app.include_router(feedback.router)
app.include_router(shared_map.router)


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
            desc = "나만의 큐레이션 지도를 만들어보세요"
            place_count = 0
            places = []
        else:
            places = db.query(PersonalPlace).filter(
                PersonalPlace.user_id == user.id, PersonalPlace.is_public == True
            ).all()
            place_count = len(places)
            title = f"{user.nickname}의 공간"
            desc = f"{place_count}곳의 큐레이션 지도"
    finally:
        db.close()

    # Build dot map SVG
    _SC = {"want_to_go": "#BA7517", "visited": "#1D9E75", "want_revisit": "#D4537E"}
    coords = [(p.lat, p.lng, p.status) for p in places if p.lat and p.lng]
    if coords:
        lats, lngs = [c[0] for c in coords], [c[1] for c in coords]
        mn_la, mx_la, mn_ln, mx_ln = min(lats), max(lats), min(lngs), max(lngs)
        lp = max((mx_la - mn_la) * 0.18, 0.004)
        gp = max((mx_ln - mn_ln) * 0.18, 0.004)
        mn_la -= lp; mx_la += lp; mn_ln -= gp; mx_ln += gp
        la_r = (mx_la - mn_la) or 0.01
        ln_r = (mx_ln - mn_ln) or 0.01
        sp = []
        for i in range(1, 6):
            gx, gy = round(300 / 6 * i, 1), round(375 / 6 * i, 1)
            sp.append(f'<line x1="{gx}" y1="0" x2="{gx}" y2="375" stroke="#e4e2de" stroke-width="0.5"/>')
            sp.append(f'<line x1="0" y1="{gy}" x2="300" y2="{gy}" stroke="#e4e2de" stroke-width="0.5"/>')
        for la, ln, st in coords:
            px = round(14 + ((ln - mn_ln) / ln_r) * 272, 1)
            py = round(14 + ((mx_la - la) / la_r) * 347, 1)
            c = _SC.get(st, "#655d54")
            sp.append(f'<circle cx="{px}" cy="{py}" r="4.5" fill="{c}" stroke="#fff" stroke-width="1"/>')
        map_html = '<div class="map"><svg viewBox="0 0 300 375">' + "".join(sp) + "</svg></div>"
    else:
        map_html = '<div class="map empty">지도 미리보기</div>'

    title = _html.escape(title)
    desc = _html.escape(desc)
    nickname_esc = _html.escape(nickname)
    redirect_url = f"{FRONTEND_URL}/@{nickname_esc}"
    photo_url = ""
    if user and user.profile_photo_url:
        photo_url = _html.escape(user.profile_photo_url)
    og_image = photo_url or f"{FRONTEND_URL}/og-image.png"
    avatar_inner = f"<img src='{photo_url}' alt=''>" if photo_url else _html.escape(nickname[0:1].upper())
    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<meta property="og:title" content="{title}" />
<meta property="og:description" content="{desc}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="{redirect_url}" />
<meta property="og:image" content="{og_image}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{title}" />
<meta name="twitter:description" content="{desc}" />
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,700;1,400&family=Manrope:wght@400;600;700&display=swap" rel="stylesheet">
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#faf9f6;font-family:'Manrope',sans-serif;padding:20px}}
.card{{max-width:380px;width:100%;background:#fff;border-radius:20px;padding:28px 24px;box-shadow:0 2px 24px rgba(47,52,48,0.06);text-decoration:none;color:inherit;display:block}}
.map{{border-radius:12px;background:#f0efec;margin-bottom:18px;overflow:hidden;line-height:0}}
.map svg{{width:100%;height:auto;display:block}}
.map.empty{{padding:48px 0;text-align:center;font-style:italic;font-size:12px;color:#a8a29e;line-height:1}}
.avatar-row{{display:flex;align-items:center;gap:12px;margin-bottom:4px}}
.avatar{{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#595149,#655d54);display:flex;align-items:center;justify-content:center;font-family:'Noto Serif',Georgia,serif;font-style:italic;font-size:18px;color:#fff6ef;font-weight:700;overflow:hidden;flex-shrink:0}}
.avatar img{{width:100%;height:100%;object-fit:cover}}
.name{{font-family:'Noto Serif',Georgia,serif;font-size:17px;font-weight:700;color:#2f3430;margin:0;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
.stats{{font-size:12px;font-weight:600;color:#5c605c;margin:6px 0 18px;text-align:left}}
.divider{{height:1px;background:#e8e8ed;margin-bottom:14px}}
.brand-row{{display:flex;align-items:center;gap:8px}}
.logo{{width:20px;height:20px;position:relative;flex-shrink:0}}
.logo .b{{position:absolute;top:1px;left:5px;width:11px;height:14px;border-radius:1.5px;background:#a89a8e}}
.logo .f{{position:absolute;top:3px;left:2px;width:11px;height:14px;border-radius:1.5px;background:#867a6e}}
.brand-name{{font-family:'Noto Serif',Georgia,serif;font-style:italic;font-weight:700;font-size:13px;color:#655d54}}
</style>
<meta http-equiv="refresh" content="1;url={redirect_url}" />
</head>
<body>
<a class="card" href="{redirect_url}">
  {map_html}
  <div class="avatar-row">
    <div class="avatar">{avatar_inner}</div>
    <p class="name">{title}</p>
  </div>
  <p class="stats">총 {place_count}개의 큐레이션 공간</p>
  <div class="divider"></div>
  <div class="brand-row">
    <div class="logo"><div class="b"></div><div class="f"></div></div>
    <span class="brand-name">나의 공간</span>
  </div>
</a>
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

    title = _html.escape(title)
    desc = _html.escape(desc)
    image = _html.escape(image)
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

    title = _html.escape(title)
    desc = _html.escape(desc)
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
