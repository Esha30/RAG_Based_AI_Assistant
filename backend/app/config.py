from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    gemini_api_key: str = ""
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080

    mongodb_url: str = ""
    database_name: str = "rag_assistant"

    upload_dir: str = "../uploads"
    chroma_db_path: str = "../chroma_db"

    frontend_url: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
