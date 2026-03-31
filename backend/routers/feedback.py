"""
routers/feedback.py
이슈/아이디어 보고 (전체 공개, 누구나 작성/열람 가능).
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import Feedback

router = APIRouter(prefix="/feedback", tags=["feedback"])


class FeedbackCreate(BaseModel):
    nickname: str | None = None
    body: str


class FeedbackResponse(BaseModel):
    id: int
    nickname: str | None
    body: str
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/", response_model=list[FeedbackResponse])
def list_feedback(db: Session = Depends(get_db)):
    return db.query(Feedback).order_by(Feedback.created_at.desc()).limit(100).all()


@router.post("/", response_model=FeedbackResponse)
def create_feedback(payload: FeedbackCreate, db: Session = Depends(get_db)):
    body = payload.body.strip()
    if not body:
        raise HTTPException(status_code=400, detail="내용을 입력해주세요")
    fb = Feedback(nickname=payload.nickname, body=body)
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return fb


@router.delete("/{feedback_id}")
def delete_feedback(feedback_id: int, db: Session = Depends(get_db)):
    fb = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not fb:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(fb)
    db.commit()
    return {"ok": True}
