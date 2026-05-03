"""
Firebase Admin SDK — verifies Firebase ID tokens sent from the frontend.
The backend never handles passwords directly when Firebase auth is used.
"""
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.core.logging import logger
import uuid

# ── Initialize Firebase Admin ─────────────────────────────────────────────────
_firebase_app = None


def init_firebase():
    """Initialize Firebase Admin SDK. Called once on app startup."""
    global _firebase_app
    if _firebase_app is not None:
        return  # Already initialized

    if not settings.FIREBASE_SERVICE_ACCOUNT_PATH and not settings.FIREBASE_PROJECT_ID:
        logger.warning("firebase_not_configured",
                       msg="Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_PROJECT_ID in .env")
        return

    try:
        if settings.FIREBASE_SERVICE_ACCOUNT_PATH:
            # Use service account JSON file (recommended for production)
            cred = credentials.Certificate(settings.FIREBASE_SERVICE_ACCOUNT_PATH)
        else:
            # Use Application Default Credentials (works on GCP/Cloud Run)
            cred = credentials.ApplicationDefault()

        _firebase_app = firebase_admin.initialize_app(cred, {
            "projectId": settings.FIREBASE_PROJECT_ID,
        })
        logger.info("firebase_initialized", project=settings.FIREBASE_PROJECT_ID)
    except Exception as e:
        logger.error("firebase_init_failed", error=str(e))


def is_firebase_enabled() -> bool:
    return _firebase_app is not None


# ── Token Verification ────────────────────────────────────────────────────────
bearer_scheme = HTTPBearer(auto_error=False)


async def verify_firebase_token(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """
    FastAPI dependency — verifies a Firebase ID token from the Authorization header.
    Returns the decoded token payload with uid, email, name, etc.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No authorization token provided",
        )

    token = credentials.credentials

    # If Firebase is not configured, fall back to local JWT verification
    if not is_firebase_enabled():
        from app.core.security import decode_token
        return decode_token(token)

    try:
        decoded = firebase_auth.verify_id_token(token, check_revoked=True)
        return decoded
    except firebase_auth.RevokedIdTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has been revoked")
    except firebase_auth.ExpiredIdTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")
    except firebase_auth.InvalidIdTokenError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {e}")
    except Exception as e:
        logger.error("firebase_token_verify_failed", error=str(e))
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token verification failed")


async def get_or_create_firebase_user(
    decoded_token: dict,
    db: AsyncSession,
) -> "User":  # type: ignore
    """
    After verifying a Firebase token, get the matching DB user or auto-create one.
    This enables seamless first-time login via Google/Email without manual registration.
    """
    from app.models.user import User, UserRole

    firebase_uid = decoded_token.get("uid")
    email = decoded_token.get("email", "")
    name = decoded_token.get("name") or decoded_token.get("display_name") or email.split("@")[0]

    # Look up by firebase_uid first, then by email
    result = await db.execute(
        select(User).where(User.firebase_uid == firebase_uid)
    )
    user = result.scalar_one_or_none()

    if not user:
        # Try by email (user may have registered locally before)
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user:
            # Link existing account to Firebase
            user.firebase_uid = firebase_uid
            await db.flush()

    if not user:
        # Auto-create new user from Firebase profile
        user = User(
            id=uuid.uuid4(),
            email=email,
            full_name=name,
            hashed_password="firebase_auth",  # Not used — Firebase handles auth
            role=UserRole.OPERATOR,
            firebase_uid=firebase_uid,
            is_active=True,
        )
        db.add(user)
        await db.flush()
        logger.info("firebase_user_created", email=email, uid=firebase_uid)

    return user
