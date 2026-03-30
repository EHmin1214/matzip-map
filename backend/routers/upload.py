"""
routers/upload.py
사진 업로드 API — Cloudinary 사용.
"""

import os
import logging
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException, Query

logger = logging.getLogger(__name__)

router = APIRouter(tags=["upload"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}
MAX_SIZE = 10 * 1024 * 1024  # 10MB


def _get_cloudinary():
    """Cloudinary 초기화. 환경변수가 없으면 에러."""
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    api_key = os.getenv("CLOUDINARY_API_KEY")
    api_secret = os.getenv("CLOUDINARY_API_SECRET")

    if not all([cloud_name, api_key, api_secret]):
        missing = []
        if not cloud_name: missing.append("CLOUDINARY_CLOUD_NAME")
        if not api_key: missing.append("CLOUDINARY_API_KEY")
        if not api_secret: missing.append("CLOUDINARY_API_SECRET")
        raise HTTPException(
            status_code=500,
            detail=f"Cloudinary 환경변수 누락: {', '.join(missing)}"
        )

    import cloudinary
    import cloudinary.uploader
    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret,
    )
    return cloudinary.uploader


def _upload_one(uploader, data: bytes, user_id: int, filename: str) -> dict:
    """파일 1개를 Cloudinary에 업로드하고 결과 반환."""
    logger.info(f"Uploading {filename} ({len(data)} bytes) for user {user_id}")
    result = uploader.upload(
        data,
        folder=f"matzip/{user_id}",
        transformation=[
            {"width": 1200, "height": 1200, "crop": "limit",
             "quality": "auto:good", "fetch_format": "auto"}
        ],
    )
    url = result["secure_url"]
    logger.info(f"Upload success: {url}")
    return {
        "url": url,
        "width": result.get("width", 0),
        "height": result.get("height", 0),
    }


@router.post("/upload/photo")
async def upload_photo(
    user_id: int = Query(...),
    file: UploadFile = File(...),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 파일 형식: {file.content_type}")

    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="파일 크기는 10MB 이하여야 합니다.")

    uploader = _get_cloudinary()
    try:
        result = _upload_one(uploader, data, user_id, file.filename or "photo")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"업로드 실패: {str(e)}")


@router.post("/upload/photos")
async def upload_photos(
    user_id: int = Query(...),
    files: List[UploadFile] = File(...),
):
    """여러 장의 사진을 한번에 업로드. 최대 5장."""
    if len(files) > 5:
        raise HTTPException(status_code=400, detail="최대 5장까지 업로드할 수 있습니다.")

    uploader = _get_cloudinary()
    results = []

    for file in files:
        if file.content_type not in ALLOWED_TYPES:
            raise HTTPException(status_code=400, detail=f"지원하지 않는 파일 형식: {file.filename} ({file.content_type})")
        data = await file.read()
        if len(data) > MAX_SIZE:
            raise HTTPException(status_code=400, detail=f"파일 크기 초과: {file.filename}")
        if len(data) == 0:
            raise HTTPException(status_code=400, detail=f"빈 파일: {file.filename}")

        try:
            result = _upload_one(uploader, data, user_id, file.filename or "photo")
            results.append(result)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Upload failed for {file.filename}: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"업로드 실패 ({file.filename}): {str(e)}")

    urls = [r["url"] for r in results]
    logger.info(f"All uploads done for user {user_id}: {urls}")
    return {"photos": results, "urls": urls}
