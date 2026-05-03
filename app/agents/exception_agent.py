"""
Exception Agent — The "Self-Healer".
Detects shipment exceptions and autonomously intervenes.
Handles: delays, damage, customs holds, weather disruptions.
"""
import json
import re
from app.agents.base_agent import BaseAgent, AgentDecision
from app.agents.tools.weather_tools import get_weather_disruptions, get_port_congestion
from app.agents.tools.carrier_tools import get_multi_carrier_rates, track_shipment
from app.core.logging import logger


EXCEPTION_SYSTEM_PROMPT = """You are the Exception Agent for an elite agentic shipping system.
You are the "Self-Healer" — when shipments go wrong, you fix them autonomously.

Exception Types You Handle:
1. DELAY: Carrier delay detected (>24 hours behind schedule)
2. WEATHER: Severe weather blocking transit route
3. PORT_CONGESTION: Port wait time >48 hours
4. CUSTOMS_HOLD: Shipment held at customs
5. DAMAGE: Package damage detected
6. ADDRESS_ERROR: Invalid or undeliverable address
7. CARRIER_FAILURE: Carrier unable to complete delivery

For each exception, you must:
1. Assess severity (low/medium/high/critical)
2. Calculate cost-benefit of intervention options
3. Select the best autonomous action OR escalate to human
4. Generate customer communication if needed

Output Format (JSON):
{
  "exception_type": "...",
  "severity": "...",
  "detected_issue": "...",
  "autonomous_action": "...",
  "action_details": {...},
  "estimated_delay_hours": 0,
  "cost_of_intervention": 0.0,
  "cost_of_inaction": 0.0,
  "customer_message": "...",
  "requires_human": false,
  "confidence": 0.0,
  "reasoning": "..."
}"""


class ExceptionAgent(BaseAgent):
    agent_name = "ExceptionAgent"

    async def run(self, input_data: dict) -> AgentDecision:
        """
        Detect and resolve shipment exceptions autonomously.

        input_data keys:
            - shipment_id: str
            - tracking_number: str
            - carrier: str
            - current_status: str
            - last_location: str
            - expected_delivery: str
            - origin_address: dict
            - destination_address: dict
            - declared_value: float
            - exception_type: str (optional, if already detected)
        """
        logger.info("exception_agent_started", shipment_id=input_data.get("shipment_id"))

        tracking_number = input_data.get("tracking_number", "")
        carrier = input_data.get("carrier", "")
        current_status = input_data.get("current_status", "")
        last_location = input_data.get("last_location", "")
        origin = input_data.get("origin_address", {})
        destination = input_data.get("destination_address", {})
        declared_value = input_data.get("declared_value", 0.0)

        # Gather context data
        tracking_data = {}
        if tracking_number and carrier:
            tracking_data = await track_shipment.ainvoke({
                "tracking_number": tracking_number,
                "carrier": carrier,
            })

        weather_data = await get_weather_disruptions.ainvoke({
            "origin_city": origin.get("city", ""),
            "destination_city": destination.get("city", ""),
        })

        # Get alternative rates for potential re-routing
        alt_rates = {}
        if origin and destination:
            alt_rates = await get_multi_carrier_rates.ainvoke({
                "origin_address": origin,
                "destination_address": destination,
                "weight_kg": input_data.get("weight_kg", 1.0),
            })

        user_prompt = f"""
Shipment Exception Analysis:

Shipment ID: {input_data.get('shipment_id')}
Carrier: {carrier}
Current Status: {current_status}
Last Known Location: {last_location}
Expected Delivery: {input_data.get('expected_delivery')}
Declared Value: ${declared_value}
Exception Type Detected: {input_data.get('exception_type', 'auto-detect')}

Live Tracking Data:
{json.dumps(tracking_data, indent=2)}

Weather Conditions:
{json.dumps(weather_data, indent=2)}

Alternative Carrier Options (for re-routing):
{json.dumps(alt_rates.get('all_rates', [])[:3], indent=2)}

Tasks:
1. Identify the root cause of the exception
2. Calculate: cost of re-routing vs. cost of waiting
3. If delay >48h AND re-route cost < 30% of declared value → recommend re-route
4. Generate a proactive customer message (empathetic, offers solution)
5. Determine if human escalation is needed
6. Assign confidence score

Return valid JSON matching the output format.
"""
        response_text, tokens = await self._call_llm(EXCEPTION_SYSTEM_PROMPT, user_prompt)

        try:
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                decision_data = json.loads(json_match.group())
            else:
                raise ValueError("No JSON")
        except Exception as e:
            logger.warning("exception_json_parse_failed", error=str(e))
            decision_data = {
                "exception_type": input_data.get("exception_type", "DELAY"),
                "severity": "medium",
                "detected_issue": f"Shipment status: {current_status}",
                "autonomous_action": "monitor_and_notify",
                "action_details": {"tracking_data": tracking_data},
                "estimated_delay_hours": 24,
                "cost_of_intervention": 0.0,
                "cost_of_inaction": declared_value * 0.05,
                "customer_message": (
                    f"Your shipment is experiencing a delay. "
                    f"We're actively monitoring and will update you shortly."
                ),
                "requires_human": False,
                "confidence": 0.65,
                "reasoning": "Fallback exception handling",
            }

        confidence = float(decision_data.get("confidence", 0.65))
        requires_human = decision_data.get("requires_human", False)

        # Force escalation for critical exceptions
        if decision_data.get("severity") == "critical":
            confidence = min(confidence, 0.60)

        return AgentDecision(
            action="exception_resolution",
            result=decision_data,
            confidence=confidence,
            reasoning=decision_data.get("reasoning", ""),
            tokens_used=tokens,
        )
