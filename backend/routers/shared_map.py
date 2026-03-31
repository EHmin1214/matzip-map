"""
우리의 공간 — 공유 큐레이션 맵 API.
카테고리당 5개 베스트 슬롯, 집계 데이터 공개.
"""
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import BestPick, User

router = APIRouter(tags=["shared-map"])

VALID_CATEGORIES = {"restaurant", "cafe", "bar", "general_store"}
MAX_SLOTS = 5


# ── Schemas ───────────────────────────────────────────────────

class BestPickCreate(BaseModel):
    category: str
    name: str
    address: str | None = None
    lat: float
    lng: float
    naver_place_id: str | None = None
    naver_place_url: str | None = None
    personal_place_id: int | None = None


class BestPickReplace(BaseModel):
    name: str
    address: str | None = None
    lat: float
    lng: float
    naver_place_id: str | None = None
    naver_place_url: str | None = None
    personal_place_id: int | None = None


class BestPickOut(BaseModel):
    id: int
    slot_number: int
    category: str
    name: str
    address: str | None
    lat: float
    lng: float
    naver_place_id: str | None
    personal_place_id: int | None

    class Config:
        from_attributes = True


class PickerOut(BaseModel):
    user_id: int
    nickname: str
    profile_photo_url: str | None
    is_public: bool

class SharedPlaceOut(BaseModel):
    name: str
    address: str | None
    lat: float
    lng: float
    naver_place_id: str | None
    naver_place_url: str | None
    category: str
    pick_count: int
    pickers: list[PickerOut] = []


# ── Endpoints ─────────────────────────────────────────────────

@router.get("/shared-map/", response_model=list[SharedPlaceOut])
def list_shared_places(
    category: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    """집계된 장소 목록 (비로그인 접근 가능)."""
    # 항상 전체 조회 후 그룹핑 — 같은 장소를 다른 카테고리로 등록한 유저도 합산
    all_picks = db.query(BestPick).all()

    # 좌표 반올림으로 그룹핑 (카테고리 무관 — 같은 장소면 합산)
    # naver_place_id가 있는 유저/없는 유저가 섞여도 같은 좌표면 합산
    # 단, 같은 user_id의 중복 추가는 1회로 카운트 (유저 수 기준)
    groups: dict[str, list] = {}
    for p in all_picks:
        key = f"{round(p.lat, 3)}_{round(p.lng, 3)}"
        groups.setdefault(key, []).append(p)

    # 유저 정보 일괄 조회
    user_ids = set(p.user_id for p in all_picks)
    users_map = {}
    if user_ids:
        users = db.query(User).filter(User.id.in_(user_ids)).all()
        users_map = {u.id: u for u in users}

    result = []
    for picks in groups.values():
        rep = picks[0]
        seen_users = set()
        pickers = []
        for p in picks:
            if p.user_id in seen_users:
                continue
            seen_users.add(p.user_id)
            u = users_map.get(p.user_id)
            if u and u.is_public:
                pickers.append(PickerOut(
                    user_id=u.id, nickname=u.nickname,
                    profile_photo_url=u.profile_photo_url,
                    is_public=True,
                ))
        cat_counts = Counter(p.category for p in picks)
        top_category = cat_counts.most_common(1)[0][0]
        result.append(SharedPlaceOut(
            name=rep.name,
            address=rep.address,
            lat=rep.lat,
            lng=rep.lng,
            naver_place_id=rep.naver_place_id,
            naver_place_url=rep.naver_place_url,
            category=top_category,
            pick_count=len(seen_users),
            pickers=pickers,
        ))
    # 카테고리 필터는 그룹핑 후 적용 (pick_count는 전체 기준 유지)
    if category and category in VALID_CATEGORIES:
        result = [r for r in result if r.category == category]
    result.sort(key=lambda x: x.pick_count, reverse=True)
    return result


@router.get("/shared-map/my-picks", response_model=dict[str, list[BestPickOut]])
def get_my_picks(
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    """내 베스트 목록 (카테고리별)."""
    picks = (
        db.query(BestPick)
        .filter(BestPick.user_id == user_id)
        .order_by(BestPick.category, BestPick.slot_number)
        .all()
    )
    result = {cat: [] for cat in VALID_CATEGORIES}
    for p in picks:
        if p.category in result:
            result[p.category].append(BestPickOut.model_validate(p))
    return result


@router.post("/shared-map/my-picks", response_model=BestPickOut)
def add_pick(
    body: BestPickCreate,
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    """베스트에 장소 추가. 슬롯이 꽉 찬 경우 409."""
    if body.category not in VALID_CATEGORIES:
        raise HTTPException(400, f"유효하지 않은 카테고리: {body.category}")

    existing = (
        db.query(BestPick)
        .filter(BestPick.user_id == user_id, BestPick.category == body.category)
        .order_by(BestPick.slot_number)
        .all()
    )

    # 중복 체크
    for p in existing:
        if body.naver_place_id and p.naver_place_id == body.naver_place_id:
            raise HTTPException(409, "이미 이 카테고리에 등록된 장소입니다.")
        if not body.naver_place_id and abs(p.lat - body.lat) < 0.001 and abs(p.lng - body.lng) < 0.001:
            raise HTTPException(409, "이미 이 카테고리에 등록된 장소입니다.")

    if len(existing) >= MAX_SLOTS:
        raise HTTPException(
            409,
            detail={
                "message": "슬롯이 가득 찼습니다. 교체할 장소를 선택하세요.",
                "picks": [BestPickOut.model_validate(p).model_dump() for p in existing],
            },
        )

    # 빈 슬롯 찾기
    used = {p.slot_number for p in existing}
    slot = next(s for s in range(1, MAX_SLOTS + 1) if s not in used)

    pick = BestPick(
        user_id=user_id,
        category=body.category,
        slot_number=slot,
        name=body.name,
        address=body.address,
        lat=body.lat,
        lng=body.lng,
        naver_place_id=body.naver_place_id,
        naver_place_url=body.naver_place_url,
        personal_place_id=body.personal_place_id,
    )
    db.add(pick)
    db.commit()
    db.refresh(pick)
    return BestPickOut.model_validate(pick)


@router.put("/shared-map/my-picks/{pick_id}", response_model=BestPickOut)
def replace_pick(
    pick_id: int,
    body: BestPickReplace,
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    """기존 슬롯을 다른 장소로 교체."""
    pick = db.query(BestPick).filter(BestPick.id == pick_id).first()
    if not pick or pick.user_id != user_id:
        raise HTTPException(404, "베스트 픽을 찾을 수 없습니다.")

    pick.name = body.name
    pick.address = body.address
    pick.lat = body.lat
    pick.lng = body.lng
    pick.naver_place_id = body.naver_place_id
    pick.naver_place_url = body.naver_place_url
    pick.personal_place_id = body.personal_place_id
    db.commit()
    db.refresh(pick)
    return BestPickOut.model_validate(pick)


@router.delete("/shared-map/my-picks/{pick_id}")
def remove_pick(
    pick_id: int,
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    """베스트에서 장소 제거."""
    pick = db.query(BestPick).filter(BestPick.id == pick_id).first()
    if not pick or pick.user_id != user_id:
        raise HTTPException(404, "베스트 픽을 찾을 수 없습니다.")
    db.delete(pick)
    db.commit()
    return {"ok": True}
