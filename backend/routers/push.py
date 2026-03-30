"""
routers/push.py
Web Push 알림 구독/발송 API.
"""

import os
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models import PushSubscription, User

router = APIRouter(tags=["push"])

VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "")
VAPID_CLAIMS = {"sub": "mailto:matzip@example.com"}


class SubscribeRequest(BaseModel):
    user_id: int
    endpoint: str
    p256dh: str
    auth: str


@router.get("/push/vapid-key")
def get_vapid_key():
    """프론트엔드에서 구독 시 사용할 VAPID public key."""
    return {"public_key": VAPID_PUBLIC_KEY}


@router.post("/push/subscribe", status_code=201)
def subscribe(body: SubscribeRequest, db: Session = Depends(get_db)):
    existing = db.query(PushSubscription).filter(
        PushSubscription.user_id == body.user_id,
        PushSubscription.endpoint == body.endpoint,
    ).first()
    if existing:
        existing.p256dh = body.p256dh
        existing.auth = body.auth
    else:
        db.add(PushSubscription(
            user_id=body.user_id,
            endpoint=body.endpoint,
            p256dh=body.p256dh,
            auth=body.auth,
        ))
    db.commit()
    return {"status": "subscribed"}


@router.delete("/push/unsubscribe")
def unsubscribe(user_id: int, db: Session = Depends(get_db)):
    db.query(PushSubscription).filter(PushSubscription.user_id == user_id).delete()
    db.commit()
    return {"status": "unsubscribed"}


def send_push_to_user(db: Session, user_id: int, title: str, body: str, url: str = "/", tag: str = "default"):
    """유저에게 푸시 알림 전송 (내부 헬퍼)."""
    if not VAPID_PRIVATE_KEY:
        return
    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        return

    subs = db.query(PushSubscription).filter(PushSubscription.user_id == user_id).all()
    payload = json.dumps({"title": title, "body": body, "url": url, "tag": tag})

    for sub in subs:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims=VAPID_CLAIMS,
            )
        except Exception:
            # subscription expired — clean up
            db.delete(sub)
    db.commit()
