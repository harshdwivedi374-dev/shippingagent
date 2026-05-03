"""
Monitoring tasks — periodic async jobs, no Celery needed.
Called from the FastAPI lifespan scheduler.
"""
from datetime import datetime, timedelta
from app.core.logging import logger


async def poll_in_transit_shipments():
    """Poll in-transit shipments for status updates every 30 min."""
    try:
        from app.core.database import AsyncSessionLocal
        from app.models.shipment import Shipment, ShipmentStatus
        from app.agents.tools.carrier_tools import track_shipment
        from sqlalchemy import select

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Shipment).where(
                    Shipment.status.in_([
                        ShipmentStatus.IN_TRANSIT,
                        ShipmentStatus.PICKED_UP,
                        ShipmentStatus.OUT_FOR_DELIVERY,
                    ])
                )
            )
            shipments = result.scalars().all()
            logger.info("polling_in_transit", count=len(shipments))

            for shipment in shipments:
                if not shipment.tracking_number:
                    continue
                try:
                    tracking = await track_shipment.ainvoke({
                        "tracking_number": shipment.tracking_number,
                        "carrier": shipment.selected_carrier or "",
                    })
                    if tracking.get("status") in ["delay", "exception", "failure"]:
                        from app.tasks.shipping_tasks import handle_exception_async
                        await handle_exception_async({
                            "shipment_id": str(shipment.id),
                            "tracking_number": shipment.tracking_number,
                            "carrier": shipment.selected_carrier,
                            "current_status": tracking.get("status"),
                            "declared_value": shipment.declared_value,
                        })
                except Exception as e:
                    logger.warning("poll_tracking_failed",
                                   shipment_id=str(shipment.id), error=str(e))
    except Exception as e:
        logger.error("poll_in_transit_failed", error=str(e))


async def check_expired_escalations():
    """Mark escalations as expired if past SLA."""
    try:
        from app.core.database import AsyncSessionLocal
        from app.models.escalation import EscalationTask, EscalationStatus
        from sqlalchemy import update

        async with AsyncSessionLocal() as db:
            now = datetime.utcnow()
            await db.execute(
                update(EscalationTask)
                .where(
                    EscalationTask.status == EscalationStatus.PENDING,
                    EscalationTask.expires_at < now,
                )
                .values(status=EscalationStatus.EXPIRED)
            )
            await db.commit()
            logger.info("expired_escalations_checked")
    except Exception as e:
        logger.error("check_escalations_failed", error=str(e))


async def update_carrier_metrics():
    """Update carrier performance metrics from recent shipment history."""
    try:
        from app.core.database import AsyncSessionLocal
        from app.models.shipment import Shipment, ShipmentStatus
        from app.agents.tools.memory_tools import store_carrier_performance
        from sqlalchemy import select

        async with AsyncSessionLocal() as db:
            cutoff = datetime.utcnow() - timedelta(days=7)
            result = await db.execute(
                select(Shipment).where(
                    Shipment.status == ShipmentStatus.DELIVERED,
                    Shipment.actual_delivery >= cutoff,
                    Shipment.selected_carrier.isnot(None),
                )
            )
            shipments = result.scalars().all()

            for shipment in shipments:
                if shipment.estimated_delivery and shipment.actual_delivery:
                    delay_hours = max(
                        0,
                        (shipment.actual_delivery - shipment.estimated_delivery
                         ).total_seconds() / 3600,
                    )
                    await store_carrier_performance.ainvoke({
                        "carrier_code": shipment.selected_carrier,
                        "route": (
                            f"{shipment.origin_address.get('city', '')}-"
                            f"{shipment.destination_address.get('city', '')}"
                        ),
                        "on_time": delay_hours < 2,
                        "delay_hours": delay_hours,
                        "day_of_week": shipment.created_at.strftime("%A"),
                        "notes": f"Shipment {str(shipment.id)[:8]}",
                    })

            logger.info("carrier_metrics_updated", count=len(shipments))
    except Exception as e:
        logger.error("update_carrier_metrics_failed", error=str(e))
