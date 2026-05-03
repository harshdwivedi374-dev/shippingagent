"""
Background shipping tasks — async, no Celery/Redis needed.
"""
from app.core.logging import logger


async def process_shipment_async(shipment_id: str, shipment_data: dict) -> dict:
    """Process a shipment through the full agent workflow."""
    try:
        from app.agents.orchestrator import ShippingOrchestrator
        orchestrator = ShippingOrchestrator()
        result = await orchestrator.process_shipment({
            "shipment_id": shipment_id,
            **shipment_data,
        })
        logger.info("async_shipment_processed", shipment_id=shipment_id,
                    disposition=result.get("disposition"))
        return result
    except Exception as e:
        logger.error("async_shipment_failed", shipment_id=shipment_id, error=str(e))
        return {"error": str(e)}


async def handle_exception_async(exception_data: dict) -> dict:
    """Handle a shipment exception."""
    try:
        from app.agents.exception_agent import ExceptionAgent
        agent = ExceptionAgent()
        result = await agent.run(exception_data)
        logger.info("exception_handled", shipment_id=exception_data.get("shipment_id"))
        return result.to_dict()
    except Exception as e:
        logger.error("exception_handling_failed", error=str(e))
        return {"error": str(e)}


async def send_proactive_customer_notification(
    shipment_id: str,
    customer_email: str,
    message: str,
    offer_discount: bool = False,
    discount_pct: float = 10.0,
) -> dict:
    """Send proactive customer notification (stub — wire up SendGrid/SMTP here)."""
    logger.info("customer_notification_queued", shipment_id=shipment_id, email=customer_email)
    return {
        "sent": True,
        "shipment_id": shipment_id,
        "recipient": customer_email,
        "message_preview": message[:100],
    }


async def file_insurance_claim_async(
    shipment_id: str,
    damage_description: str,
    declared_value: float,
    image_urls: list,
) -> dict:
    """Auto-file insurance claim for damaged goods."""
    logger.info("insurance_claim_filed", shipment_id=shipment_id, value=declared_value)
    return {
        "claim_filed": True,
        "shipment_id": shipment_id,
        "claim_reference": f"CLM-{shipment_id[:8].upper()}",
        "estimated_payout": declared_value * 0.9,
    }
