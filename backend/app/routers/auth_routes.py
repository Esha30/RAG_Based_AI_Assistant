from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from app.database.database import create_user, get_user_by_email
from app.auth.auth import hash_password, verify_password, create_access_token, get_current_user
from fastapi import Depends

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: str
    username: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/register")
async def register(req: RegisterRequest):
    existing = await get_user_by_email(req.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    hashed = hash_password(req.password)
    user = await create_user(req.email, req.username, hashed)
    token = create_access_token({"sub": user["id"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user["id"], "email": user["email"], "username": user["username"]},
    }


@router.post("/login")
async def login(req: LoginRequest):
    user = await get_user_by_email(req.email)
    if not user or not verify_password(req.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token({"sub": user["id"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user["id"], "email": user["email"], "username": user["username"]},
    }


@router.get("/me")
async def get_me(current_user=Depends(get_current_user)):
    return {"id": current_user["id"], "email": current_user["email"], "username": current_user["username"]}
