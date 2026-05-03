"""
Shipment Service — business logic layer between API and agents.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import Optional
import uuid
from datetime import datetime, timedelta

from app.models.shipment import Shipment, ShipmentStatus
from app.models.escalation import EscalationTask, AgentDecisionLog, EscalationStatus
from app.agents.orchestrator import ShippingOrchestrator
from app.core.redis_client import cache_set, cache_get, publish_event
from app.core.logging import logger


class ShipmentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.orchestrator = ShippingOrchestrator()

    async def create_shipment(self, shipment_data: dict, user_id: Optional[str] = None) -> Shipment:
        """Create a new shipment and trigger the agentic workflow."""
        shipment = Shipment(
            id=uuid.uuid4(),
            status=ShipmentStatus.PENDING_AGENT,
            origin_address=shipment_data.get("origin_address"),
            destination_address=shipment_data.get("destination_address"),
            weight_kg=shipment_data.get("weight_kg", 1.0),
            length_cm=shipment_data.get("length_cm"),
            width_cm=shipment_data.get("width_cm"),
            height_cm=shipment_data.get("height_cm"),
            declared_value=shipment_data.get("declared_value", 0.0),
            currency=shipment_data.get("currency", "USD"),
            contents_description=shipment_data.get("contents_description"),
            is_hazmat=shipment_data.get("is_hazmat", False),
            requires_signature=shipment_data.get("requires_signature", False),
            created_by=uuid.UUID(user_id) if user_id else None,
        )
        self.db.add(shipment)
        await self.db.flush()

        logger.info("shipment_created", shipment_id=str(shipment.id))

        # Trigger agentic workflow asynchronously
        await self._run_agent_workflow(shipment, shipment_data)

        return shipment

    async def _run_agent_workflow(self, shipment: Shipment, input_data: dict) -> None:
        """Run the full multi-agent workflow for a shipment."""
        shipment.status = ShipmentStatus.AGENT_PROCESSING
        await self.db.flush()

        workflow_input = {
            "shipment_id": str(shipment.id),
            **input_data,
        }

        result = await self.orchestrator.process_shipment(workflow_input)

        # Log the decision
        log_entry = AgentDecisionLog(
            shipment_id=str(shipment.id),
            agent_name="ShippingOrchestrator",
            action_type="full_workflow",
            input_data=workflow_input,
            output_data=result,
            reasoning=str(result.get("decision_log", [])),
            confidence_score=result.get("overall_confidence"),
            success="error" not in result,
        )
        self.db.add(log_entry)

        disposition = result.get("disposition", "reject")

        if disposition == "auto_execute":
            # Agent executes autonomously
            shipment.selected_carrier = result.get("recommended_carrier")
            shipment.selected_service = result.get("recommended_service")
            shipment.quoted_rate = result.get("estimated_cost_usd")
            shipment.agent_confidence_score = result.get("overall_confidence")
            shipment.agent_reasoning = result.get("decision_log")
            shipment.agent_alternatives = result.get("alternatives")
            shipment.auto_executed = True
            shipment.carbon_footprint_kg = result.get("carbon_footprint_kg")
            shipment.is_green_route = result.get("is_green_route", False)
            shipment.status = ShipmentStatus.LABEL_CREATED
            shipment.hs_code = result.get("hs_code")

            await publish_event("shipment_updates", {
                "event": "auto_executed",
                "shipment_id": str(shipment.id),
                "carrier": result.get("recommended_carrier"),
                "confidence": result.get("overall_confidence"),
            })

        elif disposition == "escalate_to_human":
            # Create escalation task
            escalation = EscalationTask(
                shipment_id=shipment.id,
                status=EscalationStatus.PENDING,
                confidence_score=result.get("overall_confidence", 0.0),
                reason=result.get("escalation_reason", "Agent confidence below threshold"),
                option_a=result.get("alternatives", [None, None])[0],
                option_b=result.get("alternatives", [None, None])[1],
                option_c={"carrier": result.get("recommended_carrier"), "cost": result.get("estimated_cost_usd")},
                agent_reasoning_log=result.get("decision_log"),
                expires_at=datetime.utcnow() + timedelta(hours=4),
            )
            self.db.add(escalation)
            shipment.status = ShipmentStatus.AWAITING_APPROVAL
            shipment.agent_confidence_score = result.get("overall_confidence")
            shipment.agent_reasoning = result.get("decision_log")
            shipment.agent_alternatives = result.get("alternatives")

            await publish_event("escalations", {
                "event": "new_escalation",
                "shipment_id": str(shipment.id),
                "confidence": result.get("overall_confidence"),
            })

        else:
            # Reject — needs manual intervention
            shipment.status = ShipmentStatus.EXCEPTION
            shipment.agent_confidence_score = result.get("overall_confidence", 0.0)

        await self.db.flush()

    async def get_shipment(self, shipment_id: str) -> Optional[Shipment]:
        """Get a shipment by ID with caching."""
        cache_key = f"shipment:{shipment_id}"
        cached = await cache_get(cache_key)
        if cached:
            return cached

        result = await self.db.execute(
            select(Shipment).where(Shipment.id == uuid.UUID(shipment_id))
        )
        shipment = result.scalar_one_or_none()
        return shipment

    async def list_shipments(
        self,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Shipment]:
        """List shipments with optional status filter."""
        query = select(Shipment).order_by(Shipment.created_at.desc()).limit(limit).offset(offset)
        if status:
            query = query.where(Shipment.status == status)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def approve_escalation(
        self,
        escalation_id: str,
        selected_option: str,
        human_notes: str = "",
        user_id: Optional[str] = None,
    ) -> dict:
        """Human approves an escalated shipment decision."""
        result = await self.db.execute(
            select(EscalationTask).where(EscalationTask.id == uuid.UUID(escalation_id))
        )
        escalation = result.scalar_one_or_none()
        if not escalation:
            return {"success": False, "error": "Escalation not found"}

        escalation.status = EscalationStatus.APPROVED
        escalation.selected_option = selected_option.upper()
        escalation.human_notes = human_notes
        escalation.resolved_at = datetime.utcnow()

        # Apply the selected option to the shipment
        option_map = {
            "A": escalation.option_a,
            "B": escalation.option_b,
            "C": escalation.option_c,
        }
        chosen = option_map.get(selected_option.upper(), {})

        if escalation.shipment_id and chosen:
            await self.db.execute(
                update(Shipment)
                .where(Shipment.id == escalation.shipment_id)
                .values(
                    selected_carrier=chosen.get("carrier"),
                    quoted_rate=chosen.get("cost") or chosen.get("rate_usd"),
                    status=ShipmentStatus.LABEL_CREATED,
                    auto_executed=False,
                )
            )

        await publish_event("shipment_updates", {
            "event": "escalation_approved",
            "shipment_id": str(escalation.shipment_id),
            "selected_option": selected_option,
        })

        return {"success": True, "applied_option": chosen}
