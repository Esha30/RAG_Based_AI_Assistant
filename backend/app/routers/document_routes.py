import os
import uuid
import asyncio
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, BackgroundTasks
from typing import List
from app.auth.auth import get_current_user
from app.database.database import (
    create_document, get_user_documents, get_document,
    delete_document, update_document_chunks, update_document_status
)
from app.rag.rag_service import ingest_documents, summarize_document, delete_collection
from app.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/api/documents", tags=["documents"])

ALLOWED_TYPES = {"pdf", "docx", "doc", "txt"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


def _get_file_type(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower()


async def _process_document(file_path: str, file_type: str, doc_id: str, collection_name: str):
    """Background task: ingest document and update chunk count."""
    try:
        chunk_count = ingest_documents(file_path, file_type, collection_name)
        await update_document_chunks(doc_id, chunk_count)
        print(f"[OK] Document {doc_id} processed: {chunk_count} chunks")
    except Exception as e:
        print(f"[ERROR] Failed to process document {doc_id}: {e}")
        await update_document_status(doc_id, "error")


@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    file_type = _get_file_type(file.filename or "")
    if file_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Allowed: {', '.join(ALLOWED_TYPES)}")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 20MB")

    # Save to uploads directory
    os.makedirs(settings.upload_dir, exist_ok=True)
    safe_name = f"{uuid.uuid4()}.{file_type}"
    file_path = os.path.join(settings.upload_dir, safe_name)
    with open(file_path, "wb") as f:
        f.write(content)

    collection_name = f"user_{current_user['id']}_{uuid.uuid4().hex[:8]}"
    doc = await create_document(
        user_id=current_user["id"],
        filename=safe_name,
        original_name=file.filename,
        file_type=file_type,
        file_size=len(content),
        collection_name=collection_name,
    )

    # Process in background
    background_tasks.add_task(_process_document, file_path, file_type, doc["id"], collection_name)

    doc["status"] = "processing"
    return {"message": "Document uploaded successfully. Processing in background.", "document": doc}


@router.get("/")
async def list_documents(current_user=Depends(get_current_user)):
    docs = await get_user_documents(current_user["id"])
    return {"documents": docs}


@router.delete("/{doc_id}")
async def delete_doc(doc_id: str, current_user=Depends(get_current_user)):
    doc = await get_document(doc_id)
    if not doc or doc["user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Document not found")

    # Remove file from disk
    file_path = os.path.join(settings.upload_dir, doc["filename"])
    if os.path.exists(file_path):
        os.remove(file_path)

    # Remove from ChromaDB
    delete_collection(doc["collection_name"])

    # Remove from database
    await delete_document(doc_id)
    return {"message": "Document deleted successfully"}


@router.get("/{doc_id}/summarize")
async def summarize_doc(doc_id: str, current_user=Depends(get_current_user)):
    doc = await get_document(doc_id)
    if not doc or doc["user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc["chunk_count"] == 0:
        raise HTTPException(status_code=400, detail="Document is still processing. Please wait.")
    try:
        summary = summarize_document(doc["collection_name"], doc["original_name"])
    except Exception as e:
        err_str = str(e).lower()
        if "resource exhausted" in err_str or "429" in err_str or "quota" in err_str:
            raise HTTPException(
                status_code=503,
                detail="AI service is temporarily rate-limited. Please wait a minute and try again.",
            )
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}")
    return {"document_id": doc_id, "document_name": doc["original_name"], **summary}
