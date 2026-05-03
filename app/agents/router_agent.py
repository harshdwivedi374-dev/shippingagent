"""
Router Agent — The "Command Center" brain.
Monitors carrier APIs, weather, port congestion, and selects optimal routes.
Implements Reflexion (self-critique before execution).
"""
import json
from app.agents.base_agent import BaseAgent, AgentDecision
from app.agents.tools.carrier_tools import get_multi_carrier_rates
from app.agents.tools.weather_tools import get_weather_disruptions, get_port_congestion
from app.agents.tools.memory_tools import query_carrier_memory
from app.agents.tools.sustainability_tools import get_green_route_options
from app.core.logging import logger


ROUTER_SYSTEM_PROMPT = """You are the Router Agent for an elite agentic shipping system.
Your job is to select the OPTIMAL shipping route and carrier for each shipment.

You have access to:
- Real-time carrier rates from multiple providers
- Weather disruption data along the route
- Port congestion levels
- Historical carrier performance (long-term memory)
- Green route options with carbon footprint data

Decision Framework:
1. GATHER: Collect all available data (rates, weather, memory, sustainability)
2. ANALYZE: Identify risks, cost-benefit tradeoffs, and carrier reliability
3. CRITIQUE: Run an internal self-check — what could go wrong with your recommendation?
4. DECIDE: Select the best option and provide 2 alternatives
5. SCORE: Assign a confidence score (0.0-1.0) based on data quality and risk level

Output Format (JSON):
{
  "recommended_carrier": "...",
  "recommended_service": "...",
  "estimated_cost": 0.0,
  "estimated_transit_days": 0,
  "confidence": 0.0,
  "reasoning": "...",
  "self_critique": "...",
  "risk_factors": [...],
  "alternative_a": {...},
  "alternative_b": {...},
  "carbon_footprint_kg": 0.0,
  "is_green_route": false
}"""


class RouterAgent(BaseAgent):
    agent_name = "RouterAgent"

    async def run(self, input_data: dict) -> AgentDecision:
        """
        Select optimal shipping route.

        input_data keys:
            - origin_address: dict
            - destination_address: dict
            - weight_kg: float
            - priority: str
            - declared_value: float
            - prefer_green: bool
        """
        logger.info("router_agent_started", shipment_data=input_data)

        origin = input_data.get("origin_address", {})
        destination = input_data.get("destination_address", {})
        weight_kg = input_data.get("weight_kg", 1.0)
        priority = input_data.get("priority", "standard")
        prefer_green = input_data.get("prefer_green", False)

        # Step 1: Gather data in parallel
        rates_result = await get_multi_carrier_rates.ainvoke({
            "origin_address": origin,
            "destination_address": destination,
            "weight_kg": weight_kg,
        })

        weather_result = await get_weather_disruptions.ainvoke({
            "origin_city": origin.get("city", ""),
            "destination_city": destination.get("city", ""),
        })

        green_result = await get_green_route_options.ainvoke({
            "origin_country": origin.get("country", "US"),
            "destination_country": destination.get("country", "US"),
            "weight_kg": weight_kg,
            "max_transit_days": 30 if priority == "economy" else 7 if priority == "standard" else 2,
            "budget_usd": input_data.get("declared_value", 100) * 0.15,
        })

        # Step 2: Query carrier memory for historical performance
        all_rates = rates_result.get("all_rates", [])
        memory_insights = {}
        for rate in all_rates[:3]:
            carrier = rate.get("carrier", "")
            if carrier:
                mem = await query_carrier_memory.ainvoke({
                    "carrier_code": carrier,
                    "route": f"{origin.get('city', '')}-{destination.get('city', '')}",
                })
                memory_insights[carrier] = mem

        # Step 3: Ask LLM to reason and decide
        user_prompt = f"""
Shipment Details:
- Origin: {json.dumps(origin)}
- Destination: {json.dumps(destination)}
- Weight: {weight_kg}kg
- Priority: {priority}
- Prefer Green: {prefer_green}

Available Rates (top 5):
{json.dumps(all_rates[:5], indent=2)}

Weather Disruptions:
{json.dumps(weather_result, indent=2)}

Green Route Options:
{json.dumps(green_result.get('all_options', [])[:3], indent=2)}

Historical Carrier Performance:
{json.dumps(memory_insights, indent=2)}

Based on ALL this data, select the optimal carrier and route.
Apply the Reflexion framework: critique your own recommendation before finalizing.
Return your response as valid JSON matching the output format.
"""
        response_text, tokens = await self._call_llm(ROUTER_SYSTEM_PROMPT, user_prompt)

        # Parse LLM response
        try:
            # Extract JSON from response
            import re
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                decision_data = json.loads(json_match.group())
            else:
                raise ValueError("No JSON found in response")
        except Exception as e:
            logger.warning("router_json_parse_failed", error=str(e))
            # Fallback to cheapest rate
            cheapest = rates_result.get("cheapest") or {}
            decision_data = {
                "recommended_carrier": cheapest.get("carrier", "UNKNOWN"),
                "recommended_service": cheapest.get("service", "STANDARD"),
                "estimated_cost": cheapest.get("rate", 0),
                "estimated_transit_days": cheapest.get("transit_days", 5),
                "confidence": 0.65,
                "reasoning": "Fallback to cheapest available rate due to parsing error",
                "self_critique": "Limited data available",
                "risk_factors": ["Parsing error in LLM response"],
                "alternative_a": rates_result.get("fastest", {}),
                "alternative_b": green_result.get("greenest_option", {}),
                "carbon_footprint_kg": 0.0,
                "is_green_route": False,
            }

        confidence = float(decision_data.get("confidence", 0.75))

        return AgentDecision(
            action="route_selection",
            result=decision_data,
            confidence=confidence,
            reasoning=decision_data.get("reasoning", ""),
            alternatives=[
                decision_data.get("alternative_a", {}),
                decision_data.get("alternative_b", {}),
            ],
            tokens_used=tokens,
        )
