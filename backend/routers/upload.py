"""
routers/upload.py
사진 업로드 API — Cloudinary 사용.
"""

import os
import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, UploadFile, File, HTTPException, Query

router = APIRouter(tags=["upload"])

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
)

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}
MAX_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/upload/photo")
async def upload_photo(
    user_id: int = Query(...),
    file: UploadFile = File(...),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="지원하지 않는 파일 형식입니다. (JPEG, PNG, WebP, HEIC)")

    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="파일 크기는 10MB 이하여야 합니다.")

    try:
        result = cloudinary.uploader.upload(
            data,
            folder=f"matzip/{user_id}",
            transformation=[
                {"width": 1200, "height": 1200, "crop": "limit", "quality": "auto:good", "fetch_format": "auto"}
            ],
        )
        return {"url": result["secure_url"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"업로드 실패: {str(e)}")
