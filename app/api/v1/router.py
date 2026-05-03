from fastapi import APIRouter
from app.api.v1.routes import auth, shipments, agents, escalations, tracking, documents

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(shipments.router)
api_router.include_router(agents.router)
api_router.include_router(escalations.router)
api_router.include_router(tracking.router)
api_router.include_router(documents.router)
