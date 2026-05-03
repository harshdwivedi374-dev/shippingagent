"""
Memory Tools — ChromaDB local persistent storage for long-term agent memory.
Stores carrier performance, route history, and customer patterns.
No server needed — data saved to ./chroma_db folder automatically.
"""
import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain.tools import tool
from app.core.config import settings
from app.core.logging import logger
from typing import Optional


# Singleton client — reused across all calls
_chroma_client: Optional[chromadb.PersistentClient] = None


def get_chroma_client() -> chromadb.PersistentClient:
    """Get or create a local persistent ChromaDB client."""
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = chromadb.PersistentClient(
            path=settings.CHROMA_PERSIST_DIR,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
    return _chroma_client


@tool
async def store_carrier_performance(
    carrier_code: str,
    route: str,
    on_time: bool,
    delay_hours: float,
    day_of_week: str,
    notes: str = "",
) -> dict:
    """
    Store a carrier performance data point in long-term memory.
    The agent uses this to learn patterns like 'Carrier X is late on Tuesdays'.

    Args:
        carrier_code: Carrier identifier (FEDEX, UPS, DHL, etc.)
        route: Route description (e.g., 'NYC-LAX')
        on_time: Whether delivery was on time
        delay_hours: Hours of delay (0 if on time)
        day_of_week: Day of week (Monday, Tuesday, etc.)
        notes: Additional context
    """
    try:
        client = get_chroma_client()
        collection = client.get_or_create_collection(
            name=settings.CHROMA_COLLECTION_CARRIER_MEMORY
        )
        doc_id = f"{carrier_code}_{route}_{day_of_week}_{abs(hash(notes)) % 10000}"
        document = (
            f"Carrier {carrier_code} on route {route} on {day_of_week}: "
            f"{'on time' if on_time else f'delayed by {delay_hours} hours'}. {notes}"
        )
        metadata = {
            "carrier_code": carrier_code,
            "route": route,
            "on_time": str(on_time),
            "delay_hours": delay_hours,
            "day_of_week": day_of_week,
        }
        collection.upsert(documents=[document], metadatas=[metadata], ids=[doc_id])
        return {"success": True, "stored_id": doc_id}
    except Exception as e:
        logger.error("memory_store_failed", error=str(e))
        return {"success": False, "error": str(e)}


@tool
async def query_carrier_memory(
    carrier_code: str,
    route: str,
    day_of_week: Optional[str] = None,
    n_results: int = 5,
) -> dict:
    """
    Query historical carrier performance from long-term memory.
    Returns patterns and reliability insights.

    Args:
        carrier_code: Carrier to query
        route: Route to check
        day_of_week: Optional day filter
        n_results: Number of results to return
    """
    try:
        client = get_chroma_client()
        collection = client.get_or_create_collection(
            name=settings.CHROMA_COLLECTION_CARRIER_MEMORY
        )
        query = f"Carrier {carrier_code} performance on route {route}"
        if day_of_week:
            query += f" on {day_of_week}"

        # Check if collection has any data first
        count = collection.count()
        if count == 0:
            return {
                "found": False,
                "insights": "No historical data yet — will learn as shipments complete",
            }

        results = collection.query(
            query_texts=[query],
            n_results=min(n_results, count),
        )
        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]

        if not documents:
            return {"found": False, "insights": "No historical data for this carrier/route"}

        delays = [float(m.get("delay_hours", 0)) for m in metadatas]
        on_time_count = sum(1 for m in metadatas if m.get("on_time") == "True")
        reliability = on_time_count / len(metadatas) if metadatas else 0

        return {
            "found": True,
            "sample_count": len(documents),
            "reliability_rate": round(reliability, 2),
            "avg_delay_hours": round(sum(delays) / len(delays), 1) if delays else 0,
            "max_delay_hours": max(delays) if delays else 0,
            "insights": documents[:3],
            "recommendation": (
                f"AVOID {carrier_code} on this route" if reliability < 0.7
                else f"{carrier_code} is reliable on this route ({reliability*100:.0f}% on-time)"
            ),
        }
    except Exception as e:
        logger.error("memory_query_failed", error=str(e))
        return {"found": False, "error": str(e)}


@tool
async def store_route_history(
    origin: str,
    destination: str,
    carrier: str,
    transit_days: int,
    cost: float,
    carbon_kg: float,
    success: bool,
) -> dict:
    """
    Store a completed route in memory for future optimization.

    Args:
        origin: Origin location
        destination: Destination location
        carrier: Carrier used
        transit_days: Actual transit days
        cost: Actual shipping cost
        carbon_kg: Carbon footprint in kg CO2
        success: Whether shipment was successful
    """
    try:
        client = get_chroma_client()
        collection = client.get_or_create_collection(
            name=settings.CHROMA_COLLECTION_ROUTES
        )
        doc_id = f"{origin}_{destination}_{carrier}_{abs(hash(str(cost))) % 10000}"
        document = (
            f"Route {origin} to {destination} via {carrier}: "
            f"{transit_days} days, ${cost:.2f}, {carbon_kg:.2f}kg CO2. "
            f"{'Successful' if success else 'Failed'} delivery."
        )
        metadata = {
            "origin": origin,
            "destination": destination,
            "carrier": carrier,
            "transit_days": transit_days,
            "cost": cost,
            "carbon_kg": carbon_kg,
            "success": str(success),
        }
        collection.upsert(documents=[document], metadatas=[metadata], ids=[doc_id])
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}
