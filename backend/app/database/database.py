"""
Database abstraction layer.
Uses SQLite by default (zero-setup). Set MONGODB_URL in .env to switch to MongoDB.
"""
import os
import json
import uuid
import aiosqlite
from datetime import datetime
from typing import Optional, List, Dict, Any
from app.config import get_settings

settings = get_settings()

USE_MONGO = bool(settings.mongodb_url)

# ─── SQLite path ──────────────────────────────────────────────────────────────
SQLITE_PATH = os.path.join(os.path.dirname(__file__), "../../rag_assistant.db")


# ══════════════════════════════════════════════════════════════════════════════
#  SQLite Implementation
# ══════════════════════════════════════════════════════════════════════════════
async def init_sqlite():
    async with aiosqlite.connect(SQLITE_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                username TEXT NOT NULL,
                hashed_password TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                filename TEXT NOT NULL,
                original_name TEXT NOT NULL,
                file_type TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                chunk_count INTEGER DEFAULT 0,
                collection_name TEXT NOT NULL,
                status TEXT DEFAULT 'processing',
                created_at TEXT NOT NULL
            )
        """)
        # Migration: add status column to existing tables that lack it
        try:
            await db.execute("ALTER TABLE documents ADD COLUMN status TEXT DEFAULT 'processing'")
        except Exception:
            pass  # Column already exists
        await db.execute("""
            CREATE TABLE IF NOT EXISTS chats (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                document_ids TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                chat_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                sources TEXT,
                created_at TEXT NOT NULL
            )
        """)
        # ── Performance indices (safe to re-run) ────────────────────────────
        await db.execute(
            "CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)"
        )
        await db.execute(
            "CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents (user_id)"
        )
        await db.execute(
            "CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats (user_id)"
        )
        await db.execute(
            "CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats (updated_at DESC)"
        )
        await db.execute(
            "CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages (chat_id)"
        )
        await db.commit()


# ─── User Operations ──────────────────────────────────────────────────────────
async def create_user(email: str, username: str, hashed_password: str) -> Dict:
    user = {
        "id": str(uuid.uuid4()),
        "email": email,
        "username": username,
        "hashed_password": hashed_password,
        "created_at": datetime.utcnow().isoformat(),
    }
    async with aiosqlite.connect(SQLITE_PATH) as db:
        await db.execute(
            "INSERT INTO users VALUES (?, ?, ?, ?, ?)",
            (user["id"], user["email"], user["username"], user["hashed_password"], user["created_at"]),
        )
        await db.commit()
    return user


async def get_user_by_email(email: str) -> Optional[Dict]:
    async with aiosqlite.connect(SQLITE_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM users WHERE email = ?", (email,)) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None


async def get_user_by_id(user_id: str) -> Optional[Dict]:
    async with aiosqlite.connect(SQLITE_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM users WHERE id = ?", (user_id,)) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None


# ─── Document Operations ───────────────────────────────────────────────────────
async def create_document(user_id: str, filename: str, original_name: str,
                           file_type: str, file_size: int, collection_name: str) -> Dict:
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "filename": filename,
        "original_name": original_name,
        "file_type": file_type,
        "file_size": file_size,
        "chunk_count": 0,
        "collection_name": collection_name,
        "status": "processing",
        "created_at": datetime.utcnow().isoformat(),
    }
    async with aiosqlite.connect(SQLITE_PATH) as db:
        await db.execute(
            "INSERT INTO documents (id, user_id, filename, original_name, file_type, file_size, chunk_count, collection_name, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (doc["id"], doc["user_id"], doc["filename"], doc["original_name"],
             doc["file_type"], doc["file_size"], doc["chunk_count"],
             doc["collection_name"], doc["status"], doc["created_at"]),
        )
        await db.commit()
    return doc


async def update_document_chunks(doc_id: str, chunk_count: int):
    status = "processed" if chunk_count > 0 else "error"
    async with aiosqlite.connect(SQLITE_PATH) as db:
        await db.execute(
            "UPDATE documents SET chunk_count = ?, status = ? WHERE id = ?",
            (chunk_count, status, doc_id)
        )
        await db.commit()


async def update_document_status(doc_id: str, status: str):
    """Explicitly set document status (e.g., 'error')."""
    async with aiosqlite.connect(SQLITE_PATH) as db:
        await db.execute("UPDATE documents SET status = ? WHERE id = ?", (status, doc_id))
        await db.commit()


async def get_user_documents(user_id: str) -> List[Dict]:
    async with aiosqlite.connect(SQLITE_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC", (user_id,)) as cursor:
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]


async def get_document(doc_id: str) -> Optional[Dict]:
    async with aiosqlite.connect(SQLITE_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM documents WHERE id = ?", (doc_id,)) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None


async def delete_document(doc_id: str):
    async with aiosqlite.connect(SQLITE_PATH) as db:
        await db.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
        await db.commit()


# ─── Chat Operations ───────────────────────────────────────────────────────────
async def create_chat(user_id: str, title: str, document_ids: List[str]) -> Dict:
    now = datetime.utcnow().isoformat()
    chat = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": title,
        "document_ids": document_ids,
        "created_at": now,
        "updated_at": now,
    }
    async with aiosqlite.connect(SQLITE_PATH) as db:
        await db.execute(
            "INSERT INTO chats VALUES (?, ?, ?, ?, ?, ?)",
            (chat["id"], chat["user_id"], chat["title"],
             json.dumps(chat["document_ids"]), chat["created_at"], chat["updated_at"]),
        )
        await db.commit()
    return chat


async def get_user_chats(user_id: str) -> List[Dict]:
    async with aiosqlite.connect(SQLITE_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM chats WHERE user_id = ? ORDER BY updated_at DESC", (user_id,)) as cursor:
            rows = await cursor.fetchall()
            result = []
            for r in rows:
                d = dict(r)
                d["document_ids"] = json.loads(d["document_ids"])
                result.append(d)
            return result


async def get_chat(chat_id: str) -> Optional[Dict]:
    async with aiosqlite.connect(SQLITE_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM chats WHERE id = ?", (chat_id,)) as cursor:
            row = await cursor.fetchone()
            if not row:
                return None
            d = dict(row)
            d["document_ids"] = json.loads(d["document_ids"])
            return d


async def update_chat_title(chat_id: str, title: str):
    async with aiosqlite.connect(SQLITE_PATH) as db:
        await db.execute(
            "UPDATE chats SET title = ?, updated_at = ? WHERE id = ?",
            (title, datetime.utcnow().isoformat(), chat_id),
        )
        await db.commit()


async def delete_chat(chat_id: str):
    async with aiosqlite.connect(SQLITE_PATH) as db:
        await db.execute("DELETE FROM chats WHERE id = ?", (chat_id,))
        await db.execute("DELETE FROM messages WHERE chat_id = ?", (chat_id,))
        await db.commit()


# ─── Message Operations ────────────────────────────────────────────────────────
async def add_message(chat_id: str, role: str, content: str, sources: Optional[List] = None) -> Dict:
    msg = {
        "id": str(uuid.uuid4()),
        "chat_id": chat_id,
        "role": role,
        "content": content,
        "sources": sources or [],
        "created_at": datetime.utcnow().isoformat(),
    }
    async with aiosqlite.connect(SQLITE_PATH) as db:
        await db.execute(
            "INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?)",
            (msg["id"], msg["chat_id"], msg["role"], msg["content"],
             json.dumps(msg["sources"]), msg["created_at"]),
        )
        await db.execute(
            "UPDATE chats SET updated_at = ? WHERE id = ?",
            (msg["created_at"], chat_id),
        )
        await db.commit()
    return msg


async def get_chat_messages(chat_id: str) -> List[Dict]:
    async with aiosqlite.connect(SQLITE_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC", (chat_id,)) as cursor:
            rows = await cursor.fetchall()
            result = []
            for r in rows:
                d = dict(r)
                d["sources"] = json.loads(d["sources"])
                result.append(d)
            return result


# ─── Analytics ────────────────────────────────────────────────────────────────
async def get_user_analytics(user_id: str) -> Dict:
    async with aiosqlite.connect(SQLITE_PATH) as db:
        async with db.execute("SELECT COUNT(*), SUM(file_size), SUM(chunk_count) FROM documents WHERE user_id = ?", (user_id,)) as cursor:
            row = await cursor.fetchone()
            doc_count = row[0] or 0
            total_size = row[1] or 0
            total_chunks = row[2] or 0
        async with db.execute("SELECT COUNT(*) FROM chats WHERE user_id = ?", (user_id,)) as cursor:
            chat_count = (await cursor.fetchone())[0] or 0
        async with db.execute(
            "SELECT COUNT(*) FROM messages m JOIN chats c ON m.chat_id = c.id WHERE c.user_id = ? AND m.role = 'assistant'",
            (user_id,)
        ) as cursor:
            ai_responses = (await cursor.fetchone())[0] or 0
    return {
        "document_count": doc_count,
        "total_size_bytes": total_size,
        "total_chunks": total_chunks,
        "chat_count": chat_count,
        "ai_responses": ai_responses,
    }


# ─── Init dispatcher ──────────────────────────────────────────────────────────
async def init_db():
    await init_sqlite()
