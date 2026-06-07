import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from app.auth.auth import get_current_user
from app.database.database import (
    create_chat, get_user_chats, get_chat, delete_chat,
    add_message, get_chat_messages, get_document, update_chat_title
)
from app.rag.rag_service import generate_answer

router = APIRouter(prefix="/api/chats", tags=["chats"])


class CreateChatRequest(BaseModel):
    title: str = Field(default="New Chat", max_length=200)
    document_ids: List[str] = Field(default_factory=list, max_length=20)


class SendMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000)
    document_ids: Optional[List[str]] = Field(default=None, max_length=20)

    @field_validator('content')
    @classmethod
    def content_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('Message content cannot be blank')
        return v.strip()


@router.post("/")
async def create_new_chat(req: CreateChatRequest, current_user=Depends(get_current_user)):
    chat = await create_chat(current_user["id"], req.title, req.document_ids)
    return chat


@router.get("/")
async def list_chats(current_user=Depends(get_current_user)):
    chats = await get_user_chats(current_user["id"])
    return {"chats": chats}


@router.get("/{chat_id}")
async def get_chat_detail(chat_id: str, current_user=Depends(get_current_user)):
    chat = await get_chat(chat_id)
    if not chat or chat["user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Chat not found")
    messages = await get_chat_messages(chat_id)
    return {"chat": chat, "messages": messages}


@router.delete("/{chat_id}")
async def delete_chat_endpoint(chat_id: str, current_user=Depends(get_current_user)):
    chat = await get_chat(chat_id)
    if not chat or chat["user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Chat not found")
    await delete_chat(chat_id)
    return {"message": "Chat deleted"}


@router.post("/{chat_id}/messages")
async def send_message(chat_id: str, req: SendMessageRequest, current_user=Depends(get_current_user)):  # noqa: E501
    chat = await get_chat(chat_id)
    if not chat or chat["user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Chat not found")

    # Save user message
    await add_message(chat_id, "user", req.content)

    # Get document collection names
    doc_ids = req.document_ids or chat["document_ids"]
    collection_names = []
    for doc_id in doc_ids:
        doc = await get_document(doc_id)
        if doc and doc["user_id"] == current_user["id"]:
            collection_names.append(doc["collection_name"])

    # Get history for context
    history = await get_chat_messages(chat_id)

    async def stream_response():
        full_text = ""
        sources = []
        try:
            async for chunk in generate_answer(req.content, collection_names, history):
                if chunk.startswith("\n\n__SOURCES__"):
                    raw = chunk.replace("\n\n__SOURCES__", "")
                    try:
                        sources = json.loads(raw)
                    except Exception:
                        sources = []
                    yield f"data: {json.dumps({'type': 'sources', 'sources': sources})}\n\n"
                else:
                    full_text += chunk
                    yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

            # Save assistant message only if we got a response
            if full_text:
                await add_message(chat_id, "assistant", full_text, sources)

            # Auto-title the chat from first message if still default
            if chat["title"] in ("New Chat", "") and len(history) <= 1 and full_text:
                short_title = req.content[:50] + ("..." if len(req.content) > 50 else "")
                await update_chat_title(chat_id, short_title)

            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            err_str = str(e).lower()
            if "resource exhausted" in err_str or "429" in err_str or "quota" in err_str:
                msg = ("⚠️ The AI service has reached its request quota. "
                       "Please wait a minute and try again.")
            else:
                msg = f"⚠️ An error occurred while generating the response. Please try again."
            print(f"[ERROR] stream_response failed: {e}")
            yield f"data: {json.dumps({'type': 'error', 'content': msg})}\n\n"

    return StreamingResponse(stream_response(), media_type="text/event-stream")
