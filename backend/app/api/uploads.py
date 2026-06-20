import os
import uuid
from datetime import datetime
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from fastapi.responses import FileResponse
from pathlib import Path

from app.config import settings

router = APIRouter(prefix="/uploads", tags=["文件上传"])

UPLOAD_BASE_DIR = Path(settings.UPLOAD_DIR)


async def save_upload_file(file: UploadFile, sub_dir: str = "general") -> dict:
    if file.size and file.size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="文件大小超过限制")

    allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"}
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="不支持的文件格式")

    target_dir = UPLOAD_BASE_DIR / sub_dir
    target_dir.mkdir(parents=True, exist_ok=True)

    unique_filename = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}{file_ext}"
    file_path = target_dir / unique_filename

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    return {
        "filename": unique_filename,
        "original_filename": file.filename,
        "file_path": str(file_path),
        "file_url": f"/uploads/{sub_dir}/{unique_filename}",
        "size": len(content),
    }


@router.post("/flood-photos")
async def upload_flood_photo(file: UploadFile = File(...)):
    result = await save_upload_file(file, sub_dir="flood_photos")
    return result


@router.post("/multiple")
async def upload_multiple_files(files: List[UploadFile] = File(...), sub_dir: str = "general"):
    results = []
    for file in files:
        result = await save_upload_file(file, sub_dir=sub_dir)
        results.append(result)
    return {"count": len(results), "files": results}


@router.get("/{sub_dir}/{filename}")
async def get_upload_file(sub_dir: str, filename: str):
    file_path = UPLOAD_BASE_DIR / sub_dir / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="文件不存在")

    return FileResponse(file_path)
