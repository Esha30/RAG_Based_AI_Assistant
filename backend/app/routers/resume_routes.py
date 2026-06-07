import os
import uuid
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from typing import Optional
from app.auth.auth import get_current_user
from app.rag.rag_service import analyze_resume
from app.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/api/resume", tags=["resume"])

ALLOWED_TYPES = {"pdf", "docx", "doc", "txt"}


@router.post("/analyze")
async def analyze_resume_endpoint(
    file: UploadFile = File(...),
    job_description: Optional[str] = Form(None),
    current_user=Depends(get_current_user),
):
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename else ""
    if ext not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 10MB")

    os.makedirs(settings.upload_dir, exist_ok=True)
    tmp_name = f"resume_{uuid.uuid4()}.{ext}"
    tmp_path = os.path.join(settings.upload_dir, tmp_name)

    try:
        with open(tmp_path, "wb") as f:
            f.write(content)
        result = analyze_resume(tmp_path, ext, job_description)
    except Exception as e:
        err_str = str(e).lower()
        if "resource exhausted" in err_str or "429" in err_str or "quota" in err_str:
            raise HTTPException(
                status_code=503,
                detail="AI service is temporarily rate-limited. Please wait a minute and try again.",
            )
        raise HTTPException(status_code=500, detail=f"Resume analysis failed: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    return result
