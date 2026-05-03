"""
Agent Routes — Direct access to individual agents for testing and integration.
"""
from fastapi import APIRouter, Depends, HTTPException
from app.core.security import get_current_user_id
from app.agents.orchestrator import ShippingOrchestrator
from app.agents.compliance_agent import ComplianceAgent
from app.agents.negotiator_agent import NegotiatorAgent
from app.agents.exception_agent import ExceptionAgent
from app.agents.tools.carrier_tools import get_multi_carrier_rates
from app.agents.tools.sustainability_tools import get_green_route_options, calculate_carbon_footprint
from app.api.v1.schemas import (
    ProcessShipmentRequest,
    ComplianceCheckRequest,
    ExceptionHandleRequest,
    RateQuoteRequest,
    AgentDecisionResponse,
)

router = APIRouter(prefix="/agents", tags=["Agents"])


@router.post("/process", response_model=AgentDecisionResponse)
async def process_shipment_with_agents(
    payload: ProcessShipmentRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Run the full multi-agent workflow (Compliance → Router → Negotiator).
    Returns the final decision with confidence score and disposition.
    """
    orchestrator = ShippingOrchestrator()
    result = await orchestrator.process_shipment(payload.model_dump())

    return AgentDecisionResponse(
        decision_id=result.get("shipment_id", ""),
        action="full_workflow",
        result=result,
        confidence=result.get("overall_confidence", 0.0),
        disposition=result.get("disposition", "reject"),
        reasoning=str(result.get("decision_log", [])),
        alternatives=result.get("alternatives", []),
    )


@router.post("/compliance/check")
async def run_compliance_check(
    payload: ComplianceCheckRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Run the Compliance Agent standalone.
    Classifies HS codes, validates documents, calculates duties.
    """
    agent = ComplianceAgent()
    decision = await agent.run(payload.model_dump())
    return decision.to_dict()


@router.post("/rates/quote")
async def get_rate_quotes(
    payload: RateQuoteRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Get real-time rates from all available carriers simultaneously.
    """
    result = await get_multi_carrier_rates.ainvoke({
        "origin_address": payload.origin_address.model_dump(),
        "destination_address": payload.destination_address.model_dump(),
        "weight_kg": payload.weight_kg,
        "length_cm": payload.length_cm,
        "width_cm": payload.width_cm,
        "height_cm": payload.height_cm,
    })
    return result


@router.post("/rates/negotiate")
async def negotiate_rates(
    payload: ProcessShipmentRequest,
    budget_usd: float = 500.0,
    max_transit_days: int = 7,
    user_id: str = Depends(get_current_user_id),
):
    """
    Run the Negotiator Agent to find the best rate including backhaul opportunities.
    """
    agent = NegotiatorAgent()
    input_data = {
        **payload.model_dump(),
        "budget_usd": budget_usd,
        "max_transit_days": max_transit_days,
    }
    decision = await agent.run(input_data)
    return decision.to_dict()


@router.post("/exceptions/handle")
async def handle_shipment_exception(
    payload: ExceptionHandleRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Run the Exception Agent to autonomously resolve a shipment issue.
    Returns recommended action and customer message.
    """
    agent = ExceptionAgent()
    decision = await agent.run(payload.model_dump())
    return decision.to_dict()


@router.post("/sustainability/carbon")
async def calculate_shipment_carbon(
    origin_country: str,
    destination_country: str,
    weight_kg: float,
    transport_mode: str = "road_freight_diesel",
    user_id: str = Depends(get_current_user_id),
):
    """Calculate carbon footprint for a shipment."""
    result = await calculate_carbon_footprint.ainvoke({
        "origin_country": origin_country,
        "destination_country": destination_country,
        "weight_kg": weight_kg,
        "transport_mode": transport_mode,
    })
    return result


@router.post("/sustainability/green-routes")
async def get_green_routes(
    payload: ProcessShipmentRequest,
    max_transit_days: int = 14,
    budget_usd: float = 200.0,
    user_id: str = Depends(get_current_user_id),
):
    """Find the greenest shipping routes within time and budget constraints."""
    result = await get_green_route_options.ainvoke({
        "origin_country": payload.origin_address.country,
        "destination_country": payload.destination_address.country,
        "weight_kg": payload.weight_kg,
        "max_transit_days": max_transit_days,
        "budget_usd": budget_usd,
    })
    return result
