from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import uuid

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.services.shipment_service import ShipmentService
from app.api.v1.schemas import (
    ShipmentCreateRequest,
    ShipmentResponse,
    ShipmentListResponse,
)

router = APIRouter(prefix="/shipments", tags=["Shipments"])


@router.post("/", response_model=ShipmentResponse, status_code=status.HTTP_201_CREATED)
async def create_shipment(
    payload: ShipmentCreateRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Create a new shipment and trigger the full agentic workflow.

    The agent will:
    1. Run compliance checks
    2. Select optimal carrier/route
    3. Negotiate best rate
    4. Auto-execute if confidence ≥ 95%, or escalate to human if 70-95%
    """
    service = ShipmentService(db)
    shipment = await service.create_shipment(
        shipment_data=payload.model_dump(),
        user_id=user_id,
    )
    return shipment


@router.get("/", response_model=ShipmentListResponse)
async def list_shipments(
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """List all shipments with optional status filter."""
    service = ShipmentService(db)
    shipments = await service.list_shipments(
        status=status_filter, limit=limit, offset=offset
    )
    return ShipmentListResponse(total=len(shipments), items=shipments)


@router.get("/{shipment_id}", response_model=ShipmentResponse)
async def get_shipment(
    shipment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Get a specific shipment by ID."""
    service = ShipmentService(db)
    shipment = await service.get_shipment(str(shipment_id))
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return shipment


@router.get("/{shipment_id}/reasoning")
async def get_agent_reasoning(
    shipment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Get the full agent reasoning log for a shipment.
    Answers: 'Why did the agent choose DHL over FedEx?'
    """
    service = ShipmentService(db)
    shipment = await service.get_shipment(str(shipment_id))
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    return {
        "shipment_id": str(shipment_id),
        "selected_carrier": shipment.selected_carrier,
        "confidence_score": shipment.agent_confidence_score,
        "auto_executed": shipment.auto_executed,
        "reasoning_log": shipment.agent_reasoning,
        "alternatives_considered": shipment.agent_alternatives,
    }
