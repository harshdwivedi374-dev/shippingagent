"""
Negotiator Agent — Autonomous spot-rate procurement officer.
Pings multiple freight APIs simultaneously, finds backhaul opportunities,
and negotiates the best rate in milliseconds.
"""
import json
import re
import asyncio
import httpx
from app.agents.base_agent import BaseAgent, AgentDecision
from app.agents.tools.carrier_tools import get_multi_carrier_rates
from app.core.config import settings
from app.core.logging import logger


NEGOTIATOR_SYSTEM_PROMPT = """You are the Negotiator Agent for an elite agentic shipping system.
You act as an autonomous procurement officer for freight.

Your goal: Find the BEST rate through:
1. Simultaneous multi-carrier rate comparison
2. Identifying backhaul opportunities (empty trucks returning = 50% cheaper)
3. Spot rate negotiation when standard rates exceed budget
4. Volume discount identification

Decision criteria (in order):
1. Does it meet the delivery deadline?
2. Is the carrier reliable on this route? (check memory)
3. What is the total landed cost (rate + duties + carbon credits)?
4. Is there a backhaul opportunity?

Output Format (JSON):
{
  "best_rate": {
    "carrier": "...",
    "service": "...",
    "rate_usd": 0.0,
    "transit_days": 0,
    "is_backhaul": false,
    "is_spot_rate": false,
    "savings_vs_standard": 0.0
  },
  "negotiation_strategy": "...",
  "backhaul_available": false,
  "total_landed_cost": 0.0,
  "confidence": 0.0,
  "reasoning": "...",
  "all_quotes": [...]
}"""


async def _check_backhaul_opportunities(
    origin: str,
    destination: str,
    weight_kg: float,
) -> list[dict]:
    """
    Check freight marketplaces for backhaul (empty return truck) opportunities.
    These are typically 40-60% cheaper than standard rates.
    """
    # In production: integrate with uShip, DAT Freight, or Convoy APIs
    # Simulating backhaul check with realistic structure
    backhaul_routes = {
        ("Los Angeles", "New York"): [
            {"carrier": "BackhaulExpress", "rate": 0.85, "transit_days": 5, "capacity_kg": 500},
        ],
        ("Chicago", "Dallas"): [
            {"carrier": "ReturnFreight", "rate": 0.72, "transit_days": 3, "capacity_kg": 300},
        ],
    }

    route_key = (origin, destination)
    opportunities = backhaul_routes.get(route_key, [])

    # Filter by weight capacity
    return [o for o in opportunities if o.get("capacity_kg", 0) >= weight_kg]


async def _get_spot_rates_from_marketplaces(
    origin: dict,
    destination: dict,
    weight_kg: float,
) -> list[dict]:
    """
    Ping freight spot rate marketplaces simultaneously.
    """
    spot_rates = []

    # Freightos integration (production)
    if settings.FREIGHTOS_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    "https://api.freightos.com/v1/quotes",
                    json={
                        "origin": origin,
                        "destination": destination,
                        "weight": weight_kg,
                    },
                    headers={"Authorization": f"Bearer {settings.FREIGHTOS_API_KEY}"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    for quote in data.get("quotes", []):
                        spot_rates.append({
                            "carrier": quote.get("carrier"),
                            "rate": float(quote.get("total_price", 0)),
                            "transit_days": quote.get("transit_days"),
                            "is_spot_rate": True,
                            "provider": "freightos",
                        })
        except Exception as e:
            logger.warning("freightos_failed", error=str(e))

    return spot_rates


class NegotiatorAgent(BaseAgent):
    agent_name = "NegotiatorAgent"

    async def run(self, input_data: dict) -> AgentDecision:
        """
        Find the best freight rate through negotiation and market scanning.

        input_data keys:
            - origin_address: dict
            - destination_address: dict
            - weight_kg: float
            - budget_usd: float
            - max_transit_days: int
            - estimated_duties_usd: float
        """
        logger.info("negotiator_agent_started", input=input_data)

        origin = input_data.get("origin_address", {})
        destination = input_data.get("destination_address", {})
        weight_kg = input_data.get("weight_kg", 1.0)
        budget_usd = input_data.get("budget_usd", 999999)
        max_transit_days = input_data.get("max_transit_days", 7)
        estimated_duties = input_data.get("estimated_duties_usd", 0.0)

        # Gather all rates simultaneously
        standard_rates_task = get_multi_carrier_rates.ainvoke({
            "origin_address": origin,
            "destination_address": destination,
            "weight_kg": weight_kg,
        })
        backhaul_task = _check_backhaul_opportunities(
            origin.get("city", ""),
            destination.get("city", ""),
            weight_kg,
        )
        spot_rates_task = _get_spot_rates_from_marketplaces(origin, destination, weight_kg)

        standard_result, backhaul_opps, spot_rates = await asyncio.gather(
            standard_rates_task, backhaul_task, spot_rates_task,
            return_exceptions=True,
        )

        all_quotes = []
        if isinstance(standard_result, dict):
            all_quotes.extend(standard_result.get("all_rates", []))
        if isinstance(spot_rates, list):
            all_quotes.extend(spot_rates)
        if isinstance(backhaul_opps, list):
            for b in backhaul_opps:
                all_quotes.append({**b, "is_backhaul": True, "rate": b.get("rate", 0) * weight_kg})

        # Filter by constraints
        viable_quotes = [
            q for q in all_quotes
            if q.get("rate", 999999) <= budget_usd
            and (q.get("transit_days") or 999) <= max_transit_days
        ]

        user_prompt = f"""
Freight Negotiation Analysis:

Origin: {json.dumps(origin)}
Destination: {json.dumps(destination)}
Weight: {weight_kg}kg
Budget: ${budget_usd}
Max Transit: {max_transit_days} days
Estimated Duties: ${estimated_duties}

All Available Quotes ({len(all_quotes)} total):
{json.dumps(all_quotes[:10], indent=2)}

Viable Quotes (within budget & time):
{json.dumps(viable_quotes[:5], indent=2)}

Backhaul Opportunities:
{json.dumps(backhaul_opps if isinstance(backhaul_opps, list) else [], indent=2)}

Tasks:
1. Select the best rate considering total landed cost (rate + duties)
2. Identify if any backhaul opportunity saves >30%
3. Recommend negotiation strategy if all rates exceed budget
4. Calculate savings vs. standard market rate
5. Assign confidence score

Return valid JSON matching the output format.
"""
        response_text, tokens = await self._call_llm(NEGOTIATOR_SYSTEM_PROMPT, user_prompt)

        try:
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                decision_data = json.loads(json_match.group())
            else:
                raise ValueError("No JSON")
        except Exception as e:
            logger.warning("negotiator_json_parse_failed", error=str(e))
            best = min(viable_quotes or all_quotes, key=lambda x: x.get("rate", 999999), default={})
            decision_data = {
                "best_rate": best,
                "negotiation_strategy": "Selected cheapest available rate",
                "backhaul_available": len(backhaul_opps) > 0 if isinstance(backhaul_opps, list) else False,
                "total_landed_cost": best.get("rate", 0) + estimated_duties,
                "confidence": 0.70,
                "reasoning": "Fallback: selected cheapest viable quote",
                "all_quotes": all_quotes[:5],
            }

        confidence = float(decision_data.get("confidence", 0.70))

        return AgentDecision(
            action="rate_negotiation",
            result=decision_data,
            confidence=confidence,
            reasoning=decision_data.get("reasoning", ""),
            tokens_used=tokens,
        )
