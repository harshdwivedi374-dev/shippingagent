"""
Compliance Agent — Zero-Trust document auditing.
Generates customs docs, classifies HS codes, validates trade regulations.
Prevents shipments from being seized at customs.
"""
import json
import re
from app.agents.base_agent import BaseAgent, AgentDecision
from app.agents.tools.compliance_tools import (
    classify_hs_code,
    validate_customs_documents,
    calculate_duties_and_taxes,
)
from app.core.logging import logger


COMPLIANCE_SYSTEM_PROMPT = """You are the Compliance Agent for an elite agentic shipping system.
Your job is to ensure 100% customs compliance for every international shipment.

Responsibilities:
1. Classify products with correct HS codes
2. Validate all customs documents against current 2026 trade regulations
3. Calculate accurate duties and taxes
4. Flag dual-use goods, sanctioned countries, and missing certifications
5. Generate compliant commercial invoices and customs declarations

You operate under Zero-Trust principles: assume every document has errors until proven otherwise.

Output Format (JSON):
{
  "is_compliant": true/false,
  "hs_code": "...",
  "duty_rate_pct": 0.0,
  "estimated_duties_usd": 0.0,
  "estimated_vat_usd": 0.0,
  "compliance_flags": [...],
  "required_documents": [...],
  "generated_invoice_fields": {...},
  "risk_level": "low/medium/high/critical",
  "confidence": 0.0,
  "reasoning": "..."
}"""


class ComplianceAgent(BaseAgent):
    agent_name = "ComplianceAgent"

    async def run(self, input_data: dict) -> AgentDecision:
        """
        Validate and generate compliance documents for a shipment.

        input_data keys:
            - product_description: str
            - origin_country: str
            - destination_country: str
            - declared_value: float
            - currency: str
            - weight_kg: float
            - document_data: dict (existing invoice fields if any)
        """
        logger.info("compliance_agent_started", input=input_data)

        product_description = input_data.get("product_description", "")
        origin_country = input_data.get("origin_country", "US")
        destination_country = input_data.get("destination_country", "US")
        declared_value = input_data.get("declared_value", 0.0)
        currency = input_data.get("currency", "USD")
        weight_kg = input_data.get("weight_kg", 1.0)
        document_data = input_data.get("document_data", {})

        # Step 1: Classify HS code
        hs_result = await classify_hs_code.ainvoke({
            "product_description": product_description,
            "origin_country": origin_country,
            "destination_country": destination_country,
        })

        hs_code = hs_result.get("hs_code", "9999.99")

        # Step 2: Validate existing documents
        validation_result = await validate_customs_documents.ainvoke({
            "document_data": document_data,
            "origin_country": origin_country,
            "destination_country": destination_country,
            "hs_code": hs_code,
        })

        # Step 3: Calculate duties
        duty_result = await calculate_duties_and_taxes.ainvoke({
            "declared_value": declared_value,
            "currency": currency,
            "hs_code": hs_code,
            "origin_country": origin_country,
            "destination_country": destination_country,
            "weight_kg": weight_kg,
        })

        # Step 4: LLM reasoning for edge cases and document generation
        user_prompt = f"""
Shipment Compliance Analysis:

Product: {product_description}
Route: {origin_country} → {destination_country}
Declared Value: {declared_value} {currency}
Weight: {weight_kg}kg

HS Classification Result:
{json.dumps(hs_result, indent=2)}

Document Validation Result:
{json.dumps(validation_result, indent=2)}

Duty Calculation:
{json.dumps(duty_result, indent=2)}

Existing Document Data:
{json.dumps(document_data, indent=2)}

Tasks:
1. Confirm or correct the HS code classification
2. List ALL required documents for this route
3. Generate the missing invoice fields
4. Identify any 2026 trade regulation issues
5. Assign a compliance risk level and confidence score

Return valid JSON matching the output format.
"""
        response_text, tokens = await self._call_llm(COMPLIANCE_SYSTEM_PROMPT, user_prompt)

        try:
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                decision_data = json.loads(json_match.group())
            else:
                raise ValueError("No JSON in response")
        except Exception as e:
            logger.warning("compliance_json_parse_failed", error=str(e))
            all_flags = (
                hs_result.get("compliance_flags", [])
                + validation_result.get("compliance_flags", [])
            )
            decision_data = {
                "is_compliant": len(all_flags) == 0,
                "hs_code": hs_code,
                "duty_rate_pct": hs_result.get("duty_rate_pct", 5.0),
                "estimated_duties_usd": duty_result.get("import_duty", 0),
                "estimated_vat_usd": duty_result.get("vat", 0),
                "compliance_flags": all_flags,
                "required_documents": ["commercial_invoice", "packing_list"],
                "generated_invoice_fields": duty_result,
                "risk_level": validation_result.get("risk_level", "medium"),
                "confidence": 0.80,
                "reasoning": "Automated compliance check completed",
            }

        confidence = float(decision_data.get("confidence", 0.80))
        risk_level = decision_data.get("risk_level", "medium")

        # Lower confidence for high-risk shipments
        if risk_level == "critical":
            confidence = min(confidence, 0.50)
        elif risk_level == "high":
            confidence = min(confidence, 0.70)

        return AgentDecision(
            action="compliance_check",
            result=decision_data,
            confidence=confidence,
            reasoning=decision_data.get("reasoning", ""),
            tokens_used=tokens,
        )
