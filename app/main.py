"""
Agentic Shipping Automation — FastAPI Application Entry Point
SQLite + in-memory cache — no Docker/Redis/PostgreSQL needed.
"""
import asyncio
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import time

from app.core.config import settings
from app.core.database import init_db
from app.core.logging import setup_logging, logger
from app.api.v1.router import api_router


async def background_scheduler():
    """
    Lightweight periodic task runner — replaces Celery Beat.
    Runs monitoring tasks on a schedule using plain asyncio.
    """
    from app.tasks.monitoring_tasks import (
        poll_in_transit_shipments,
        check_expired_escalations,
        update_carrier_metrics,
    )

    poll_interval = 1800       # 30 min
    escalation_interval = 3600 # 1 hour
    metrics_interval = 86400   # 24 hours

    last_poll = 0
    last_escalation = 0
    last_metrics = 0

    while True:
        now = time.time()
        try:
            if now - last_poll >= poll_interval:
                await poll_in_transit_shipments()
                last_poll = now

            if now - last_escalation >= escalation_interval:
                await check_expired_escalations()
                last_escalation = now

            if now - last_metrics >= metrics_interval:
                await update_carrier_metrics()
                last_metrics = now
        except Exception as e:
            logger.error("scheduler_error", error=str(e))

        await asyncio.sleep(60)  # Check every minute


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info("agentic_shipping_starting", env=settings.APP_ENV, db="SQLite")

    # Import all models before creating tables
    from app.models import user, shipment, tracking, carrier, document, escalation  # noqa

    # Create all SQLite tables automatically
    await init_db()
    logger.info("sqlite_database_ready", path="./shipping.db")

    # Initialize Firebase Admin SDK
    from app.core.firebase import init_firebase
    init_firebase()

    # Start background scheduler
    scheduler_task = asyncio.create_task(background_scheduler())
    logger.info("background_scheduler_started")

    yield

    # Cleanup
    scheduler_task.cancel()
    logger.info("agentic_shipping_shutting_down")


app = FastAPI(
    title="Agentic Shipping Automation API",
    description="""
## Elite Agentic Shipping Backend

Multi-agent system running on **SQLite** — zero external dependencies.

### Agents
- **Router Agent** — Optimal carrier/route selection with Reflexion self-critique
- **Compliance Agent** — Zero-trust customs validation + HS code classification
- **Negotiator Agent** — Spot-rate procurement + backhaul detection
- **Exception Agent** — Self-healing exception resolution

### Confidence System
| Score | Action |
|---|---|
| ≥ 95% | Auto-execute autonomously |
| 70–95% | Escalate to human with 3 options |
| < 70% | Reject — manual intervention |

### Quick Start
1. `POST /api/v1/auth/register` — create account
2. `POST /api/v1/auth/login` — get token
3. `POST /api/v1/shipments/` — create shipment (agents run automatically)
4. `GET /api/v1/escalations/` — review pending human decisions
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    response.headers["X-Process-Time-Ms"] = str(round(process_time, 2))
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("unhandled_exception", path=request.url.path, error=str(exc))
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error", "error": str(exc)},
    )


app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": "1.0.0",
        "database": "SQLite (./shipping.db)",
        "cache": "in-memory",
        "vector_db": "ChromaDB local (./chroma_db)",
        "llm": settings.LLM_MODEL,
    }


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Agentic Shipping Automation API",
        "docs": "/docs",
        "health": "/health",
    }
