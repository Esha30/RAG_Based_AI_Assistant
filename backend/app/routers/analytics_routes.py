from fastapi import APIRouter, Depends
from app.auth.auth import get_current_user
from app.database.database import get_user_analytics

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/")
async def get_analytics(current_user=Depends(get_current_user)):
    data = await get_user_analytics(current_user["id"])
    # Add derived metrics
    data["total_size_mb"] = round(data["total_size_bytes"] / (1024 * 1024), 2)
    data["avg_chunks_per_doc"] = (
        round(data["total_chunks"] / data["document_count"], 1)
        if data["document_count"] > 0 else 0
    )
    return data
