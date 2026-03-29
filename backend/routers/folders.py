"""
routers/folders.py
폴더 CRUD.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from database import get_db
from models import Folder, PersonalPlace

router = APIRouter(prefix="/folders", tags=["folders"])


class FolderCreate(BaseModel):
    user_id: int
    name: str
    color: str = "#E8593C"


class FolderUpdate(BaseModel):
    name: str | None = None
    color: str | None = None
    is_public: bool | None = None


class FolderResponse(BaseModel):
    id: int
    user_id: int
    name: str
    color: str
    is_public: bool
    place_count: int
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/", response_model=list[FolderResponse])
def list_folders(user_id: int, db: Session = Depends(get_db)):
    """내 폴더 목록."""
    folders = db.query(Folder).filter(Folder.user_id == user_id).all()
    result = []
    for f in folders:
        count = db.query(PersonalPlace).filter(PersonalPlace.folder_id == f.id).count()
        result.append(FolderResponse(
            id=f.id, user_id=f.user_id, name=f.name,
            color=f.color, is_public=f.is_public,
            place_count=count, created_at=f.created_at,
        ))
    return result


@router.post("/", response_model=FolderResponse, status_code=201)
def create_folder(body: FolderCreate, db: Session = Depends(get_db)):
    """폴더 생성."""
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="폴더 이름을 입력해주세요.")
    folder = Folder(user_id=body.user_id, name=body.name.strip(), color=body.color)
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return FolderResponse(
        id=folder.id, user_id=folder.user_id, name=folder.name,
        color=folder.color, is_public=folder.is_public,
        place_count=0, created_at=folder.created_at,
    )


@router.patch("/{folder_id}", response_model=FolderResponse)
def update_folder(folder_id: int, body: FolderUpdate, user_id: int, db: Session = Depends(get_db)):
    """폴더 수정. 본인만 가능."""
    folder = db.query(Folder).filter(Folder.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="폴더를 찾을 수 없습니다.")
    if folder.user_id != user_id:
        raise HTTPException(status_code=403, detail="본인의 폴더만 수정할 수 있습니다.")

    if body.name is not None:
        folder.name = body.name.strip()
    if body.color is not None:
        folder.color = body.color
    if body.is_public is not None:
        folder.is_public = body.is_public

    db.commit()
    db.refresh(folder)
    count = db.query(PersonalPlace).filter(PersonalPlace.folder_id == folder.id).count()
    return FolderResponse(
        id=folder.id, user_id=folder.user_id, name=folder.name,
        color=folder.color, is_public=folder.is_public,
        place_count=count, created_at=folder.created_at,
    )


@router.delete("/{folder_id}", status_code=204)
def delete_folder(folder_id: int, user_id: int, db: Session = Depends(get_db)):
    """폴더 삭제. 폴더 안 맛집은 folder_id=null로 변경."""
    folder = db.query(Folder).filter(Folder.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="폴더를 찾을 수 없습니다.")
    if folder.user_id != user_id:
        raise HTTPException(status_code=403, detail="본인의 폴더만 삭제할 수 있습니다.")

    # 폴더 안 맛집 folder_id 초기화
    db.query(PersonalPlace).filter(PersonalPlace.folder_id == folder_id).update({"folder_id": None})
    db.delete(folder)
    db.commit()
