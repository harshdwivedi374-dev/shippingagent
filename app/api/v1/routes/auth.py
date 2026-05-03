"""
Auth Routes — supports both:
  1. Firebase Auth (Google Sign-In, Email/Password via Firebase)
  2. Local JWT Auth (fallback for development / existing users)
"""
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
import uuid

from app.core.database import get_db
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
)
from app.core.firebase import (
    verify_firebase_token, get_or_create_firebase_user, is_firebase_enabled,
)
from app.models.user import User
from app.api.v1.schemas import (
    UserCreateRequest, UserResponse, LoginRequest, TokenResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── Firebase Login ────────────────────────────────────────────────────────────

@router.post("/firebase/login", response_model=TokenResponse)
async def firebase_login(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Exchange a Firebase ID token for a backend JWT.

    Flow:
      1. Frontend signs in via Firebase (Google, Email, etc.)
      2. Frontend sends Firebase ID token in Authorization: Bearer <token>
      3. Backend verifies token with Firebase Admin SDK
      4. Backend returns its own JWT for subsequent API calls

    This keeps the backend stateless and independent of Firebase for all
    non-auth endpoints.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Firebase ID token required")

    firebase_token = authorization.split(" ", 1)[1]

    if not is_firebase_enabled():
        raise HTTPException(
            status_code=503,
            detail="Firebase not configured. Set FIREBASE_PROJECT_ID and FIREBASE_SERVICE_ACCOUNT_PATH in .env",
        )

    # Verify with Firebase Admin
    from firebase_admin import auth as firebase_auth
    try:
        decoded = firebase_auth.verify_id_token(firebase_token, check_revoked=True)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid Firebase token: {e}")

    # Get or create user in our DB
    user = await get_or_create_firebase_user(decoded, db)

    # Issue our own JWT
    token_data = {"sub": str(user.id), "email": user.email, "role": user.role}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.get("/firebase/config")
async def get_firebase_config():
    """
    Return Firebase web config for the frontend to initialize the SDK.
    Only returns non-secret public config values.
    """
    from app.core.config import settings
    return {
        "enabled": is_firebase_enabled(),
        "projectId": settings.FIREBASE_PROJECT_ID,
        "apiKey": settings.FIREBASE_WEB_API_KEY,
    }


# ── Local Auth (fallback / development) ──────────────────────────────────────

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreateRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user with email/password (local auth)."""
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        id=uuid.uuid4(),
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        auth_provider="local",
    )
    db.add(user)
    await db.flush()
    return user


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Local email/password login — returns JWT tokens."""
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    token_data = {"sub": str(user.id), "email": user.email, "role": user.role}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """Get current user profile from either Firebase or local JWT."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token required")

    token = authorization.split(" ", 1)[1]

    # Try local JWT first
    try:
        from app.core.security import decode_token
        payload = decode_token(token)
        user_id = payload.get("sub")
        result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
        user = result.scalar_one_or_none()
        if user:
            return user
    except Exception:
        pass

    raise HTTPException(status_code=401, detail="Invalid token")
