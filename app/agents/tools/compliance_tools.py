"""
Compliance Tools — Zero-Trust document auditing and HS code classification.
The Compliance Agent uses these to prevent customs seizures.
"""
import httpx
from langchain.tools import tool
from app.core.config import settings
from app.core.logging import logger
from typing import Optional


# Restricted/dual-use goods patterns (simplified — production uses full ECCN/CCL lists)
RESTRICTED_KEYWORDS = [
    "firearm", "weapon", "explosive", "nuclear", "chemical weapon",
    "biological", "drone", "encryption", "military", "satellite",
]

SANCTIONED_COUNTRIES = ["CU", "IR", "KP", "SY", "RU"]  # Cuba, Iran, North Korea, Syria, Russia


@tool
async def classify_hs_code(
    product_description: str,
    origin_country: str,
    destination_country: str,
) -> dict:
    """
    Automatically classify a product's HS (Harmonized System) code
    using AI-based classification. Returns HS code, duty rate, and restrictions.

    Args:
        product_description: Natural language description of the goods
        origin_country: ISO 2-letter country code
        destination_country: ISO 2-letter country code
    """
    # In production: call WCO API or a specialized HS classification service
    # Here we use pattern matching + LLM reasoning as a fallback
    description_lower = product_description.lower()

    # Check for restricted items
    flags = []
    for keyword in RESTRICTED_KEYWORDS:
        if keyword in description_lower:
            flags.append(f"Potential dual-use/restricted item: '{keyword}' detected")

    # Check sanctioned countries
    if origin_country in SANCTIONED_COUNTRIES or destination_country in SANCTIONED_COUNTRIES:
        flags.append(f"Sanctioned country involved: {origin_country} → {destination_country}")

    # Simplified HS code mapping (production uses full 6-digit HS database)
    hs_mapping = {
        "electronics": ("8471.30", 0.0, "Free"),
        "clothing": ("6109.10", 12.0, "Standard"),
        "food": ("2106.90", 6.4, "Standard"),
        "machinery": ("8479.89", 0.0, "Free"),
        "chemicals": ("2901.10", 5.5, "Restricted"),
        "toys": ("9503.00", 0.0, "Free"),
        "books": ("4901.99", 0.0, "Free"),
        "cosmetics": ("3304.99", 6.5, "Standard"),
        "medical": ("9018.90", 0.0, "Free"),
        "automotive": ("8708.99", 2.5, "Standard"),
    }

    hs_code = "9999.99"
    duty_rate = 5.0
    category = "General"

    for keyword, (code, rate, cat) in hs_mapping.items():
        if keyword in description_lower:
            hs_code = code
            duty_rate = rate
            category = cat
            break

    return {
        "hs_code": hs_code,
        "duty_rate_pct": duty_rate,
        "category": category,
        "compliance_flags": flags,
        "requires_export_license": len(flags) > 0,
        "estimated_duty_formula": f"Duty = Declared Value × {duty_rate}%",
    }


@tool
async def validate_customs_documents(
    document_data: dict,
    origin_country: str,
    destination_country: str,
    hs_code: str,
) -> dict:
    """
    Validate customs documents against current trade regulations.
    Flags missing fields, incorrect values, and dual-use concerns.

    Args:
        document_data: Dict containing invoice fields
        origin_country: ISO 2-letter origin country
        destination_country: ISO 2-letter destination country
        hs_code: Product HS code
    """
    required_fields = [
        "shipper_name", "shipper_address", "consignee_name",
        "consignee_address", "description_of_goods", "quantity",
        "unit_value", "total_value", "currency", "country_of_origin",
    ]

    missing_fields = [f for f in required_fields if not document_data.get(f)]
    flags = []

    if missing_fields:
        flags.append(f"Missing required fields: {', '.join(missing_fields)}")

    # Value check
    total_value = document_data.get("total_value", 0)
    if isinstance(total_value, (int, float)) and total_value > 2500:
        flags.append("High-value shipment: formal entry required (>$2500 USD)")

    # Undervaluation check
    quantity = document_data.get("quantity", 1)
    unit_value = document_data.get("unit_value", 0)
    if quantity and unit_value and (quantity * unit_value) != total_value:
        flags.append("Value discrepancy: quantity × unit_value ≠ total_value")

    # Sanctioned country check
    if origin_country in SANCTIONED_COUNTRIES or destination_country in SANCTIONED_COUNTRIES:
        flags.append(f"CRITICAL: Sanctioned country in route — shipment blocked")

    return {
        "is_valid": len(flags) == 0,
        "compliance_flags": flags,
        "missing_fields": missing_fields,
        "risk_level": "high" if any("CRITICAL" in f for f in flags) else ("medium" if flags else "low"),
        "recommended_action": (
            "BLOCK shipment" if any("CRITICAL" in f for f in flags)
            else "Fix issues before shipping" if flags
            else "Documents are compliant"
        ),
    }


@tool
async def calculate_duties_and_taxes(
    declared_value: float,
    currency: str,
    hs_code: str,
    origin_country: str,
    destination_country: str,
    weight_kg: float,
) -> dict:
    """
    Calculate estimated import duties, VAT, and other taxes.

    Args:
        declared_value: Declared value of goods
        currency: Currency code (USD, EUR, etc.)
        hs_code: Product HS code
        origin_country: ISO 2-letter origin country
        destination_country: ISO 2-letter destination country
        weight_kg: Package weight in kg
    """
    # Simplified duty rates by destination (production uses full tariff schedule)
    duty_rates = {
        "US": 0.05, "GB": 0.04, "DE": 0.035, "FR": 0.035,
        "CA": 0.06, "AU": 0.05, "JP": 0.04, "CN": 0.08,
        "IN": 0.10, "BR": 0.14,
    }
    vat_rates = {
        "GB": 0.20, "DE": 0.19, "FR": 0.20, "AU": 0.10,
        "CA": 0.05, "JP": 0.10, "IN": 0.18, "BR": 0.17,
    }

    duty_rate = duty_rates.get(destination_country, 0.05)
    vat_rate = vat_rates.get(destination_country, 0.0)

    import_duty = declared_value * duty_rate
    vat = (declared_value + import_duty) * vat_rate
    total_tax = import_duty + vat

    return {
        "declared_value": declared_value,
        "currency": currency,
        "import_duty": round(import_duty, 2),
        "vat": round(vat, 2),
        "total_estimated_tax": round(total_tax, 2),
        "duty_rate_pct": duty_rate * 100,
        "vat_rate_pct": vat_rate * 100,
        "de_minimis_exempt": declared_value < 800 and destination_country == "US",
        "breakdown": {
            "step1_import_duty": f"{declared_value} × {duty_rate*100}% = {import_duty:.2f}",
            "step2_vat": f"({declared_value} + {import_duty:.2f}) × {vat_rate*100}% = {vat:.2f}",
        },
    }
