from pydantic_settings import BaseSettings
from typing import List, Optional
from functools import lru_cache


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "AgenticShipping"
    APP_ENV: str = "development"
    APP_SECRET_KEY: str = "agentic-shipping-dev-secret-2026"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    ALLOWED_ORIGINS: List[str] = ["*"]

    # Database — SQLite (no server needed, file stored locally)
    DATABASE_URL: str = "sqlite+aiosqlite:///./shipping.db"
    SYNC_DATABASE_URL: str = "sqlite:///./shipping.db"

    # Cache — in-memory (no Redis needed)
    REDIS_URL: str = ""
    CELERY_BROKER_URL: str = ""
    CELERY_RESULT_BACKEND: str = ""

    # LLM
    GOOGLE_API_KEY: Optional[str] = "AIzaSyDqy-mJ2Un8LPQXEJtRLRWdbLBeojfyMzU"
    OPENAI_API_KEY: Optional[str] = None
    LLM_MODEL: str = "gemini-1.5-flash"
    LLM_FAST_MODEL: str = "gemini-1.5-flash"

    # Vector DB — local file (no server needed)
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8001
    CHROMA_PERSIST_DIR: str = "./chroma_db"
    CHROMA_COLLECTION_CARRIER_MEMORY: str = "carrier_performance"
    CHROMA_COLLECTION_ROUTES: str = "route_history"

    # Carrier APIs
    EASYPOST_API_KEY: Optional[str] = None
    SHIPPO_API_KEY: Optional[str] = None
    FEDEX_API_KEY: Optional[str] = None
    FEDEX_SECRET_KEY: Optional[str] = None
    UPS_CLIENT_ID: Optional[str] = None
    UPS_CLIENT_SECRET: Optional[str] = None
    DHL_API_KEY: Optional[str] = None

    # Freight APIs
    FREIGHTOS_API_KEY: Optional[str] = None
    FLEXPORT_API_KEY: Optional[str] = None

    # External APIs
    OPENWEATHER_API_KEY: Optional[str] = None
    GOOGLE_MAPS_API_KEY: Optional[str] = None
    SHIPSURANCE_API_KEY: Optional[str] = None

    # Monitoring
    SENTRY_DSN: Optional[str] = None
    PROMETHEUS_PORT: int = 9090

    # JWT
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Agent Thresholds
    AGENT_AUTO_EXECUTE_THRESHOLD: float = 0.95
    AGENT_ESCALATE_THRESHOLD: float = 0.70
    AGENT_REJECT_THRESHOLD: float = 0.40

    # Sustainability
    CARBON_CREDIT_PRICE_PER_TON: float = 25.0
    EV_LAST_MILE_PREFERENCE: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
