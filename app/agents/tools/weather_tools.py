"""
Weather & Disruption Tools — agent uses these to predict delays
and trigger dynamic re-routing decisions.
"""
import httpx
from langchain.tools import tool
from app.core.config import settings
from app.core.logging import logger


@tool
async def get_weather_disruptions(
    origin_city: str,
    destination_city: str,
    transit_hubs: list[str] | None = None,
) -> dict:
    """
    Check weather conditions along a shipping route.
    Returns disruption risk score and affected locations.

    Args:
        origin_city: Origin city name
        destination_city: Destination city name
        transit_hubs: Optional list of intermediate hub cities
    """
    cities = [origin_city, destination_city] + (transit_hubs or [])
    disruptions = []

    async with httpx.AsyncClient(timeout=10.0) as client:
        for city in cities:
            try:
                resp = await client.get(
                    "https://api.openweathermap.org/data/2.5/weather",
                    params={
                        "q": city,
                        "appid": settings.OPENWEATHER_API_KEY,
                        "units": "metric",
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    weather_id = data["weather"][0]["id"]
                    # Weather IDs: 2xx=thunderstorm, 3xx=drizzle, 5xx=rain, 6xx=snow, 7xx=atmosphere
                    severity = "none"
                    if weather_id < 300:
                        severity = "high"  # Thunderstorm
                    elif weather_id < 600:
                        severity = "medium"  # Rain
                    elif weather_id < 700:
                        severity = "high"  # Snow
                    elif weather_id in [711, 721, 741, 762, 771, 781]:
                        severity = "high"  # Smoke, fog, volcanic ash, squalls, tornado

                    if severity != "none":
                        disruptions.append({
                            "city": city,
                            "condition": data["weather"][0]["description"],
                            "severity": severity,
                            "wind_speed_ms": data["wind"]["speed"],
                            "visibility_m": data.get("visibility", 10000),
                        })
            except Exception as e:
                logger.warning("weather_check_failed", city=city, error=str(e))

    risk_score = 0.0
    if disruptions:
        severity_map = {"low": 0.2, "medium": 0.5, "high": 0.9}
        risk_score = max(severity_map.get(d["severity"], 0) for d in disruptions)

    return {
        "disruptions": disruptions,
        "overall_risk_score": risk_score,
        "recommendation": (
            "Consider air freight or alternate route"
            if risk_score > 0.7
            else "Route appears clear"
        ),
    }


@tool
async def get_port_congestion(port_code: str) -> dict:
    """
    Check current congestion level at a shipping port.
    Uses a mock/real port congestion API.

    Args:
        port_code: IATA/UNLOCODE port code (e.g., USLAX, CNSHA)
    """
    # In production, integrate with MarineTraffic or similar
    # Returning structured mock for now with realistic fields
    congestion_data = {
        "USLAX": {"level": "high", "avg_wait_days": 3.5, "vessels_waiting": 42},
        "CNSHA": {"level": "medium", "avg_wait_days": 1.2, "vessels_waiting": 18},
        "NLRTM": {"level": "low", "avg_wait_days": 0.5, "vessels_waiting": 5},
        "SGSIN": {"level": "low", "avg_wait_days": 0.3, "vessels_waiting": 3},
    }
    data = congestion_data.get(port_code.upper(), {"level": "unknown", "avg_wait_days": 0, "vessels_waiting": 0})
    return {
        "port_code": port_code,
        "congestion_level": data["level"],
        "avg_wait_days": data["avg_wait_days"],
        "vessels_waiting": data["vessels_waiting"],
        "delay_risk": data["level"] in ["high", "medium"],
    }
