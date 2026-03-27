"""
routers/accounts.py
블로거 계정 추가 / 조회 / 삭제 엔드포인트.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from database import get_db
from models import Account

router = APIRouter(prefix="/accounts", tags=["accounts"])


# ── Pydantic 스키마 ──────────────────────

class AccountCreate(BaseModel):
    source: str      # "naver_blog" | "instagram"
    author_id: str   # 블로거 ID
    author_name: str | None = None

class AccountResponse(BaseModel):
    id: int
    source: str
    author_id: str
    author_name: str | None
    is_active: bool
    last_crawled_at: datetime | None
    created_at: datetime
    post_count: int = 0

    class Config:
        from_attributes = True


# ── 엔드포인트 ───────────────────────────

@router.get("/", response_model=list[AccountResponse])
def list_accounts(db: Session = Depends(get_db)):
    """등록된 블로거 계정 전체 조회."""
    accounts = db.query(Account).filter(Account.is_active == True).all()
    result = []
    for acc in accounts:
        result.append(AccountResponse(
            id=acc.id,
            source=acc.source,
            author_id=acc.author_id,
            author_name=acc.author_name,
            is_active=acc.is_active,
            last_crawled_at=acc.last_crawled_at,
            created_at=acc.created_at,
            post_count=len(acc.posts),
        ))
    return result


@router.post("/", response_model=AccountResponse, status_code=201)
def add_account(body: AccountCreate, db: Session = Depends(get_db)):
    """블로거 계정 추가. 이미 존재하면 재활성화."""
    existing = db.query(Account).filter(
        Account.source == body.source,
        Account.author_id == body.author_id,
    ).first()

    if existing:
        if not existing.is_active:
            existing.is_active = True
            db.commit()
            db.refresh(existing)
        return AccountResponse(
            id=existing.id, source=existing.source,
            author_id=existing.author_id, author_name=existing.author_name,
            is_active=existing.is_active, last_crawled_at=existing.last_crawled_at,
            created_at=existing.created_at, post_count=len(existing.posts),
        )

    account = Account(
        source=body.source,
        author_id=body.author_id,
        author_name=body.author_name,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return AccountResponse(
        id=account.id, source=account.source,
        author_id=account.author_id, author_name=account.author_name,
        is_active=account.is_active, last_crawled_at=account.last_crawled_at,
        created_at=account.created_at, post_count=0,
    )


@router.delete("/{account_id}", status_code=204)
def delete_account(account_id: int, db: Session = Depends(get_db)):
    """계정 비활성화 (소프트 삭제)."""
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="계정을 찾을 수 없습니다.")
    account.is_active = False
    db.commit()
