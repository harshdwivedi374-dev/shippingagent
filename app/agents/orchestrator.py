"""
Orchestrator — LangGraph-based multi-agent coordinator.
Manages the full shipping workflow:
  1. Compliance Check → 2. Route Selection → 3. Rate Negotiation → 4. Execution/Escalation

Uses a state machine to hand off between agents and handle confidence thresholds.
"""
import uuid
from typing import TypedDict, Annotated, Optional, Any
from langgraph.graph import StateGraph, END
from app.agents.router_agent import RouterAgent
from app.agents.compliance_agent import ComplianceAgent
from app.agents.negotiator_agent import NegotiatorAgent
from app.agents.exception_agent import ExceptionAgent
from app.agents.base_agent import AgentDecision
from app.core.config import settings
from app.core.logging import logger


class ShippingWorkflowState(TypedDict):
    """State passed between agents in the workflow graph."""
    shipment_id: str
    input_data: dict

    # Agent outputs
    compliance_decision: Optional[dict]
    routing_decision: Optional[dict]
    negotiation_decision: Optional[dict]
    exception_decision: Optional[dict]

    # Workflow control
    current_step: str
    errors: list[str]
    escalation_required: bool
    escalation_reason: str
    final_result: Optional[dict]

    # Audit trail
    decision_log: list[dict]


def _log_decision(state: ShippingWorkflowState, agent_name: str, decision: AgentDecision) -> None:
    """Append agent decision to the audit trail."""
    state["decision_log"].append({
        "agent": agent_name,
        "action": decision.action,
        "confidence": decision.confidence,
        "disposition": decision.disposition,
        "reasoning": decision.reasoning,
        "decision_id": decision.decision_id,
    })


async def compliance_node(state: ShippingWorkflowState) -> ShippingWorkflowState:
    """Run the Compliance Agent."""
    logger.info("orchestrator_compliance_node", shipment_id=state["shipment_id"])
    agent = ComplianceAgent()
    decision = await agent.run(state["input_data"])
    _log_decision(state, "ComplianceAgent", decision)

    state["compliance_decision"] = decision.to_dict()
    state["current_step"] = "compliance_done"

    # Block shipment if compliance is critical risk
    result = decision.result or {}
    if result.get("risk_level") == "critical":
        state["escalation_required"] = True
        state["escalation_reason"] = f"Critical compliance issue: {result.get('compliance_flags', [])}"

    return state


async def routing_node(state: ShippingWorkflowState) -> ShippingWorkflowState:
    """Run the Router Agent."""
    logger.info("orchestrator_routing_node", shipment_id=state["shipment_id"])

    # Enrich input with compliance data
    enriched_input = {**state["input_data"]}
    if state.get("compliance_decision"):
        comp = state["compliance_decision"].get("result", {})
        enriched_input["hs_code"] = comp.get("hs_code")
        enriched_input["estimated_duties"] = comp.get("estimated_duties_usd", 0)

    agent = RouterAgent()
    decision = await agent.run(enriched_input)
    _log_decision(state, "RouterAgent", decision)

    state["routing_decision"] = decision.to_dict()
    state["current_step"] = "routing_done"

    if decision.disposition == "escalate_to_human":
        state["escalation_required"] = True
        state["escalation_reason"] = f"Router confidence {decision.confidence:.0%} — needs human review"

    return state


async def negotiation_node(state: ShippingWorkflowState) -> ShippingWorkflowState:
    """Run the Negotiator Agent to optimize the rate."""
    logger.info("orchestrator_negotiation_node", shipment_id=state["shipment_id"])

    routing = state.get("routing_decision", {}).get("result", {})
    compliance = state.get("compliance_decision", {}).get("result", {})

    negotiation_input = {
        **state["input_data"],
        "budget_usd": routing.get("estimated_cost", 999999) * 1.2,  # 20% above quoted
        "max_transit_days": routing.get("estimated_transit_days", 7),
        "estimated_duties_usd": compliance.get("estimated_duties_usd", 0),
    }

    agent = NegotiatorAgent()
    decision = await agent.run(negotiation_input)
    _log_decision(state, "NegotiatorAgent", decision)

    state["negotiation_decision"] = decision.to_dict()
    state["current_step"] = "negotiation_done"

    return state


async def finalize_node(state: ShippingWorkflowState) -> ShippingWorkflowState:
    """Compile final result from all agent decisions."""
    logger.info("orchestrator_finalize_node", shipment_id=state["shipment_id"])

    routing = state.get("routing_decision", {}).get("result", {})
    compliance = state.get("compliance_decision", {}).get("result", {})
    negotiation = state.get("negotiation_decision", {}).get("result", {})

    best_rate = negotiation.get("best_rate") or {}
    final_carrier = best_rate.get("carrier") or routing.get("recommended_carrier", "UNKNOWN")
    final_service = best_rate.get("service") or routing.get("recommended_service", "STANDARD")
    final_cost = best_rate.get("rate_usd") or routing.get("estimated_cost", 0)

    # Calculate overall confidence (geometric mean of all agent confidences)
    confidences = []
    for key in ["compliance_decision", "routing_decision", "negotiation_decision"]:
        d = state.get(key, {})
        if d and d.get("confidence"):
            confidences.append(d["confidence"])

    overall_confidence = (
        (confidences[0] * confidences[1] * confidences[2]) ** (1 / 3)
        if len(confidences) == 3
        else sum(confidences) / len(confidences) if confidences else 0.5
    )

    state["final_result"] = {
        "shipment_id": state["shipment_id"],
        "recommended_carrier": final_carrier,
        "recommended_service": final_service,
        "estimated_cost_usd": final_cost,
        "estimated_transit_days": best_rate.get("transit_days") or routing.get("estimated_transit_days"),
        "hs_code": compliance.get("hs_code"),
        "estimated_duties_usd": compliance.get("estimated_duties_usd", 0),
        "total_landed_cost": final_cost + compliance.get("estimated_duties_usd", 0),
        "carbon_footprint_kg": routing.get("carbon_footprint_kg", 0),
        "is_green_route": routing.get("is_green_route", False),
        "compliance_flags": compliance.get("compliance_flags", []),
        "overall_confidence": round(overall_confidence, 3),
        "disposition": (
            "auto_execute" if overall_confidence >= settings.AGENT_AUTO_EXECUTE_THRESHOLD
            else "escalate_to_human" if overall_confidence >= settings.AGENT_ESCALATE_THRESHOLD
            else "reject"
        ),
        "decision_log": state["decision_log"],
        "alternatives": [
            routing.get("alternative_a", {}),
            routing.get("alternative_b", {}),
        ],
        "savings_vs_standard": negotiation.get("best_rate", {}).get("savings_vs_standard", 0),
    }

    state["current_step"] = "completed"
    return state


def should_escalate(state: ShippingWorkflowState) -> str:
    """Routing condition: check if escalation is needed after compliance."""
    if state.get("escalation_required"):
        return "escalate"
    return "continue"


def build_shipping_workflow() -> StateGraph:
    """Build the LangGraph workflow for shipping automation."""
    workflow = StateGraph(ShippingWorkflowState)

    # Add nodes
    workflow.add_node("compliance", compliance_node)
    workflow.add_node("routing", routing_node)
    workflow.add_node("negotiation", negotiation_node)
    workflow.add_node("finalize", finalize_node)

    # Define flow
    workflow.set_entry_point("compliance")
    workflow.add_conditional_edges(
        "compliance",
        should_escalate,
        {"escalate": "finalize", "continue": "routing"},
    )
    workflow.add_edge("routing", "negotiation")
    workflow.add_edge("negotiation", "finalize")
    workflow.add_edge("finalize", END)

    return workflow.compile()


class ShippingOrchestrator:
    """High-level interface for running the full shipping workflow."""

    def __init__(self):
        self.workflow = build_shipping_workflow()

    async def process_shipment(self, shipment_data: dict) -> dict:
        """
        Run the full agentic shipping workflow for a shipment.

        Returns the final result with carrier selection, compliance status,
        confidence score, and disposition (auto_execute / escalate / reject).
        """
        shipment_id = shipment_data.get("shipment_id") or str(uuid.uuid4())

        initial_state: ShippingWorkflowState = {
            "shipment_id": shipment_id,
            "input_data": shipment_data,
            "compliance_decision": None,
            "routing_decision": None,
            "negotiation_decision": None,
            "exception_decision": None,
            "current_step": "started",
            "errors": [],
            "escalation_required": False,
            "escalation_reason": "",
            "final_result": None,
            "decision_log": [],
        }

        logger.info("orchestrator_workflow_started", shipment_id=shipment_id)

        try:
            final_state = await self.workflow.ainvoke(initial_state)
            logger.info(
                "orchestrator_workflow_completed",
                shipment_id=shipment_id,
                disposition=final_state.get("final_result", {}).get("disposition"),
            )
            return final_state.get("final_result", {})
        except Exception as e:
            logger.error("orchestrator_workflow_failed", shipment_id=shipment_id, error=str(e))
            return {
                "shipment_id": shipment_id,
                "error": str(e),
                "disposition": "reject",
                "overall_confidence": 0.0,
            }

    async def handle_exception(self, exception_data: dict) -> dict:
        """Run the Exception Agent for an in-transit shipment issue."""
        agent = ExceptionAgent()
        decision = await agent.run(exception_data)
        return decision.to_dict()
