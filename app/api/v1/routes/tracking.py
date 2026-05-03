from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.tracking import TrackingEvent, ShipmentException
from app.models.shipment import Shipment
from app.agents.tools.carrier_tools import track_shipment
from app.api.v1.schemas import TrackingEventResponse

router = APIRouter(prefix="/tracking", tags=["Tracking"])


@router.get("/{shipment_id}/events", response_model=list[TrackingEventResponse])
async def get_tracking_events(
    shipment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Get all tracking events for a shipment."""
    result = await db.execute(
        select(TrackingEvent)
        .where(TrackingEvent.shipment_id == shipment_id)
        .order_by(TrackingEvent.occurred_at.desc())
    )
    return result.scalars().all()


@router.get("/{shipment_id}/live")
async def get_live_tracking(
    shipment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Get live tracking data directly from the carrier API.
    Also checks for exceptions and triggers the Exception Agent if needed.
    """
    result = await db.execute(
        select(Shipment).where(Shipment.id == shipment_id)
    )
    shipment = result.scalar_one_or_none()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    if not shipment.tracking_number:
        return {"status": "no_tracking_number", "message": "Label not yet created"}

    live_data = await track_shipment.ainvoke({
        "tracking_number": shipment.tracking_number,
        "carrier": shipment.selected_carrier or "",
    })

    return {
        "shipment_id": str(shipment_id),
        "tracking_number": shipment.tracking_number,
        "carrier": shipment.selected_carrier,
        "live_status": live_data,
    }


@router.get("/{shipment_id}/exceptions")
async def get_shipment_exceptions(
    shipment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Get all exceptions detected for a shipment."""
    result = await db.execute(
        select(ShipmentException)
        .where(ShipmentException.shipment_id == shipment_id)
        .order_by(ShipmentException.detected_at.desc())
    )
    exceptions = result.scalars().all()
    return [
        {
            "id": str(e.id),
            "exception_type": e.exception_type,
            "severity": e.severity,
            "description": e.description,
            "agent_action_taken": e.agent_action_taken,
            "resolution_status": e.resolution_status,
            "detected_at": e.detected_at,
        }
        for e in exceptions
    ]
