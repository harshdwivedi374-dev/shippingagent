"""
Sustainability Tools — Carbon footprint calculation and green route optimization.
Balances cost vs. carbon credits for eco-conscious shipping.
"""
from langchain.tools import tool
from app.core.config import settings


# Emission factors (kg CO2 per tonne-km) by transport mode
EMISSION_FACTORS = {
    "air_freight": 0.602,
    "ocean_freight": 0.010,
    "road_freight_diesel": 0.096,
    "road_freight_ev": 0.020,
    "rail_freight": 0.028,
    "express_courier": 0.150,
}

# Average distances for common routes (km) — simplified
ROUTE_DISTANCES = {
    ("US", "GB"): {"air": 5570, "ocean": 8000},
    ("US", "DE"): {"air": 6200, "ocean": 9000},
    ("US", "CN"): {"air": 11000, "ocean": 18000},
    ("US", "JP"): {"air": 10800, "ocean": 15000},
    ("US", "AU"): {"air": 15000, "ocean": 20000},
    ("GB", "DE"): {"air": 930, "road": 1100},
    ("CN", "JP"): {"air": 2100, "ocean": 2800},
}


@tool
async def calculate_carbon_footprint(
    origin_country: str,
    destination_country: str,
    weight_kg: float,
    transport_mode: str,
) -> dict:
    """
    Calculate the carbon footprint of a shipment.

    Args:
        origin_country: ISO 2-letter origin country
        destination_country: ISO 2-letter destination country
        weight_kg: Package weight in kg
        transport_mode: One of: air_freight, ocean_freight, road_freight_diesel,
                        road_freight_ev, rail_freight, express_courier
    """
    emission_factor = EMISSION_FACTORS.get(transport_mode, 0.096)

    # Get distance
    route_key = tuple(sorted([origin_country, destination_country]))
    distances = ROUTE_DISTANCES.get(route_key, {})
    if "air" in transport_mode or "express" in transport_mode:
        distance_km = distances.get("air", 5000)
    elif "ocean" in transport_mode:
        distance_km = distances.get("ocean", 10000)
    else:
        distance_km = distances.get("road", distances.get("air", 3000))

    weight_tonnes = weight_kg / 1000
    carbon_kg = emission_factor * weight_tonnes * distance_km

    carbon_credit_cost = (carbon_kg / 1000) * settings.CARBON_CREDIT_PRICE_PER_TON

    return {
        "transport_mode": transport_mode,
        "distance_km": distance_km,
        "weight_kg": weight_kg,
        "carbon_footprint_kg_co2": round(carbon_kg, 4),
        "carbon_credit_cost_usd": round(carbon_credit_cost, 4),
        "equivalent_trees_needed": round(carbon_kg / 21, 2),  # avg tree absorbs 21kg/year
        "emission_factor": emission_factor,
    }


@tool
async def get_green_route_options(
    origin_country: str,
    destination_country: str,
    weight_kg: float,
    max_transit_days: int,
    budget_usd: float,
) -> dict:
    """
    Find the greenest shipping route that fits within time and budget constraints.
    Automatically considers EV last-mile delivery if available.

    Args:
        origin_country: ISO 2-letter origin country
        destination_country: ISO 2-letter destination country
        weight_kg: Package weight in kg
        max_transit_days: Maximum acceptable transit days
        budget_usd: Maximum shipping budget in USD
    """
    options = []

    modes_to_check = [
        ("ocean_freight", 25, 0.8),       # (mode, transit_days, cost_multiplier)
        ("rail_freight", 14, 1.2),
        ("road_freight_ev", 5, 1.5),
        ("road_freight_diesel", 4, 1.3),
        ("express_courier", 3, 2.5),
        ("air_freight", 2, 4.0),
    ]

    base_cost = weight_kg * 2.5  # Simplified base cost per kg

    for mode, transit_days, cost_mult in modes_to_check:
        if transit_days > max_transit_days:
            continue

        cost = base_cost * cost_mult
        if cost > budget_usd:
            continue

        emission_factor = EMISSION_FACTORS[mode]
        route_key = tuple(sorted([origin_country, destination_country]))
        distances = ROUTE_DISTANCES.get(route_key, {})
        if "air" in mode or "express" in mode:
            distance_km = distances.get("air", 5000)
        elif "ocean" in mode:
            distance_km = distances.get("ocean", 10000)
        else:
            distance_km = distances.get("road", 3000)

        carbon_kg = emission_factor * (weight_kg / 1000) * distance_km
        carbon_cost = (carbon_kg / 1000) * settings.CARBON_CREDIT_PRICE_PER_TON
        total_cost = cost + carbon_cost

        options.append({
            "mode": mode,
            "transit_days": transit_days,
            "shipping_cost_usd": round(cost, 2),
            "carbon_kg_co2": round(carbon_kg, 4),
            "carbon_credit_cost_usd": round(carbon_cost, 4),
            "total_cost_with_carbon": round(total_cost, 2),
            "is_ev_last_mile": "ev" in mode,
            "green_score": round(1 - (emission_factor / max(EMISSION_FACTORS.values())), 2),
        })

    # Sort by green score (highest first)
    options.sort(key=lambda x: (-x["green_score"], x["total_cost_with_carbon"]))

    return {
        "greenest_option": options[0] if options else None,
        "cheapest_option": min(options, key=lambda x: x["shipping_cost_usd"]) if options else None,
        "all_options": options,
        "ev_available": any(o["is_ev_last_mile"] for o in options),
        "carbon_savings_vs_air": (
            round(
                EMISSION_FACTORS["air_freight"] * (weight_kg / 1000) * 5000
                - (options[0]["carbon_kg_co2"] if options else 0),
                4,
            )
        ),
    }
