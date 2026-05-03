from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
import uuid

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.escalation import EscalationTask, EscalationStatus
from app.services.shipment_service import ShipmentService
from app.api.v1.schemas import EscalationResponse, EscalationApproveRequest

router = APIRouter(prefix="/escalations", tags=["Human-in-the-Loop"])


@router.get("/", response_model=list[EscalationResponse])
async def list_escalations(
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    List all pending escalation tasks for human review.
    These are shipments where agent confidence was 70-95%.
    """
    query = (
        select(EscalationTask)
        .order_by(EscalationTask.created_at.desc())
        .limit(limit)
    )
    if status_filter:
        query = query.where(EscalationTask.status == status_filter)
    else:
        query = query.where(EscalationTask.status == EscalationStatus.PENDING)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{escalation_id}", response_model=EscalationResponse)
async def get_escalation(
    escalation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Get a specific escalation task with all pre-calculated options."""
    result = await db.execute(
        select(EscalationTask).where(EscalationTask.id == escalation_id)
    )
    escalation = result.scalar_one_or_none()
    if not escalation:
        raise HTTPException(status_code=404, detail="Escalation not found")
    return escalation


@router.post("/{escalation_id}/approve")
async def approve_escalation(
    escalation_id: uuid.UUID,
    payload: EscalationApproveRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Human approves an escalated shipment by selecting one of the
    three pre-calculated options (A, B, or C) provided by the agent.
    """
    service = ShipmentService(db)
    result = await service.approve_escalation(
        escalation_id=str(escalation_id),
        selected_option=payload.selected_option,
        human_notes=payload.human_notes or "",
        user_id=user_id,
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result


@router.post("/{escalation_id}/reject")
async def reject_escalation(
    escalation_id: uuid.UUID,
    reason: str = "Rejected by operator",
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Reject an escalated shipment — sends it back for manual processing."""
    result = await db.execute(
        select(EscalationTask).where(EscalationTask.id == escalation_id)
    )
    escalation = result.scalar_one_or_none()
    if not escalation:
        raise HTTPException(status_code=404, detail="Escalation not found")

    escalation.status = EscalationStatus.REJECTED
    escalation.human_notes = reason
    from datetime import datetime
    escalation.resolved_at = datetime.utcnow()

    return {"success": True, "message": "Escalation rejected"}
