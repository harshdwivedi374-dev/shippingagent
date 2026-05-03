"""
Carrier Tools — gives the agent "hands" to interact with shipping APIs.
Supports EasyPost, Shippo, FedEx, UPS, DHL simultaneously.
"""
import asyncio
import httpx
from typing import Any, Optional
from langchain.tools import tool
from app.core.config import settings
from app.core.logging import logger


async def _fetch_easypost_rates(origin: dict, destination: dict, parcel: dict) -> list[dict]:
    """Fetch rates from EasyPost API."""
    if not settings.EASYPOST_API_KEY:
        return []
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            payload = {
                "shipment": {
                    "to_address": destination,
                    "from_address": origin,
                    "parcel": parcel,
                }
            }
            resp = await client.post(
                "https://api.easypost.com/v2/shipments",
                json=payload,
                auth=(settings.EASYPOST_API_KEY, ""),
            )
            resp.raise_for_status()
            data = resp.json()
            rates = []
            for rate in data.get("rates", []):
                rates.append({
                    "carrier": rate["carrier"],
                    "service": rate["service"],
                    "rate": float(rate["rate"]),
                    "currency": rate["currency"],
                    "transit_days": rate.get("delivery_days"),
                    "provider": "easypost",
                    "rate_id": rate["id"],
                })
            return rates
    except Exception as e:
        logger.warning("easypost_rates_failed", error=str(e))
        return []


async def _fetch_shippo_rates(origin: dict, destination: dict, parcel: dict) -> list[dict]:
    """Fetch rates from Shippo API."""
    if not settings.SHIPPO_API_KEY:
        return []
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            payload = {
                "address_from": origin,
                "address_to": destination,
                "parcels": [parcel],
                "async": False,
            }
            resp = await client.post(
                "https://api.goshippo.com/shipments/",
                json=payload,
                headers={"Authorization": f"ShippoToken {settings.SHIPPO_API_KEY}"},
            )
            resp.raise_for_status()
            data = resp.json()
            rates = []
            for rate in data.get("rates", []):
                rates.append({
                    "carrier": rate["provider"],
                    "service": rate["servicelevel"]["name"],
                    "rate": float(rate["amount"]),
                    "currency": rate["currency"],
                    "transit_days": rate.get("estimated_days"),
                    "provider": "shippo",
                    "rate_id": rate["object_id"],
                })
            return rates
    except Exception as e:
        logger.warning("shippo_rates_failed", error=str(e))
        return []


@tool
async def get_multi_carrier_rates(
    origin_address: dict,
    destination_address: dict,
    weight_kg: float,
    length_cm: float = 30,
    width_cm: float = 20,
    height_cm: float = 15,
) -> dict:
    """
    Fetch shipping rates from ALL available carriers simultaneously.
    Returns a ranked list of options with cost, speed, and sustainability scores.

    Args:
        origin_address: Dict with name, street1, city, state, zip, country
        destination_address: Dict with name, street1, city, state, zip, country
        weight_kg: Package weight in kilograms
        length_cm: Package length in cm
        width_cm: Package width in cm
        height_cm: Package height in cm
    """
    parcel_easypost = {
        "weight": weight_kg * 35.274,  # oz
        "length": length_cm / 2.54,
        "width": width_cm / 2.54,
        "height": height_cm / 2.54,
    }
    parcel_shippo = {
        "length": str(length_cm / 2.54),
        "width": str(width_cm / 2.54),
        "height": str(height_cm / 2.54),
        "distance_unit": "in",
        "weight": str(weight_kg * 2.205),
        "mass_unit": "lb",
    }

    # Fetch from all carriers in parallel
    results = await asyncio.gather(
        _fetch_easypost_rates(origin_address, destination_address, parcel_easypost),
        _fetch_shippo_rates(origin_address, destination_address, parcel_shippo),
        return_exceptions=True,
    )

    all_rates = []
    for result in results:
        if isinstance(result, list):
            all_rates.extend(result)

    # Sort by rate
    all_rates.sort(key=lambda x: x["rate"])

    return {
        "total_quotes": len(all_rates),
        "cheapest": all_rates[0] if all_rates else None,
        "fastest": min(all_rates, key=lambda x: x.get("transit_days") or 999) if all_rates else None,
        "all_rates": all_rates[:10],  # Top 10
    }


@tool
async def purchase_shipping_label(
    rate_id: str,
    provider: str,
    shipment_id: str,
) -> dict:
    """
    Purchase a shipping label using a previously fetched rate ID.

    Args:
        rate_id: The rate ID from get_multi_carrier_rates
        provider: 'easypost' or 'shippo'
        shipment_id: Internal shipment UUID for tracking
    """
    try:
        if provider == "easypost":
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"https://api.easypost.com/v2/shipments/{shipment_id}/buy",
                    json={"rate": {"id": rate_id}},
                    auth=(settings.EASYPOST_API_KEY, ""),
                )
                resp.raise_for_status()
                data = resp.json()
                return {
                    "success": True,
                    "tracking_number": data.get("tracking_code"),
                    "label_url": data.get("postage_label", {}).get("label_url"),
                    "carrier": data.get("selected_rate", {}).get("carrier"),
                    "cost": float(data.get("selected_rate", {}).get("rate", 0)),
                }
        elif provider == "shippo":
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    "https://api.goshippo.com/transactions/",
                    json={"rate": rate_id, "label_file_type": "PDF", "async": False},
                    headers={"Authorization": f"ShippoToken {settings.SHIPPO_API_KEY}"},
                )
                resp.raise_for_status()
                data = resp.json()
                return {
                    "success": True,
                    "tracking_number": data.get("tracking_number"),
                    "label_url": data.get("label_url"),
                    "carrier": data.get("rate", {}).get("provider"),
                    "cost": float(data.get("rate", {}).get("amount", 0)),
                }
    except Exception as e:
        logger.error("label_purchase_failed", error=str(e), provider=provider)
        return {"success": False, "error": str(e)}


@tool
async def track_shipment(tracking_number: str, carrier: str) -> dict:
    """
    Get real-time tracking status for a shipment.

    Args:
        tracking_number: The carrier tracking number
        carrier: Carrier code (FEDEX, UPS, DHL, USPS, etc.)
    """
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"https://api.easypost.com/v2/trackers",
                params={"tracking_code": tracking_number, "carrier": carrier},
                auth=(settings.EASYPOST_API_KEY, ""),
            )
            resp.raise_for_status()
            data = resp.json()
            trackers = data.get("trackers", [])
            if trackers:
                t = trackers[0]
                return {
                    "status": t.get("status"),
                    "location": t.get("tracking_details", [{}])[-1].get("tracking_location", {}),
                    "estimated_delivery": t.get("est_delivery_date"),
                    "events": t.get("tracking_details", []),
                }
    except Exception as e:
        logger.warning("tracking_failed", error=str(e))
    return {"status": "unknown", "error": "Could not fetch tracking data"}
