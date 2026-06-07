from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import get_settings
from app.database.database import init_db
from app.routers import auth_routes, document_routes, chat_routes, analytics_routes, resume_routes

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    print("[OK] Database initialized")
    yield
    # Shutdown
    print("[BYE] Shutting down RAG Assistant")


app = FastAPI(
    title="RAG AI Assistant API",
    description="Enterprise RAG-Based AI Document Intelligence API",
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth_routes.router)
app.include_router(document_routes.router)
app.include_router(chat_routes.router)
app.include_router(analytics_routes.router)
app.include_router(resume_routes.router)


@app.get("/")
async def root():
    return {
        "message": "RAG AI Assistant API is running",
        "docs": "/docs",
        "version": "1.0.0",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
