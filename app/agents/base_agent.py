"""
Base Agent — shared infrastructure for all specialized agents.
Handles LLM initialization, confidence scoring, and decision logging.
"""
import time
import uuid
from abc import ABC, abstractmethod
from typing import Any, Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from app.core.config import settings
from app.core.logging import logger


def get_llm(fast: bool = False) -> ChatGoogleGenerativeAI:
    """Get the configured LLM instance."""
    model = settings.LLM_FAST_MODEL if fast else settings.LLM_MODEL
    return ChatGoogleGenerativeAI(
        model=model,
        google_api_key=settings.GOOGLE_API_KEY,
        temperature=0.1,
        convert_system_message_to_human=True,
    )


class AgentDecision:
    """Structured output from any agent decision."""

    def __init__(
        self,
        action: str,
        result: Any,
        confidence: float,
        reasoning: str,
        alternatives: Optional[list] = None,
        tokens_used: Optional[dict] = None,
        execution_time_ms: Optional[float] = None,
    ):
        self.action = action
        self.result = result
        self.confidence = confidence
        self.reasoning = reasoning
        self.alternatives = alternatives or []
        self.tokens_used = tokens_used or {}
        self.execution_time_ms = execution_time_ms
        self.decision_id = str(uuid.uuid4())

        # Determine disposition based on confidence thresholds
        if confidence >= settings.AGENT_AUTO_EXECUTE_THRESHOLD:
            self.disposition = "auto_execute"
        elif confidence >= settings.AGENT_ESCALATE_THRESHOLD:
            self.disposition = "escalate_to_human"
        else:
            self.disposition = "reject"

    def to_dict(self) -> dict:
        return {
            "decision_id": self.decision_id,
            "action": self.action,
            "result": self.result,
            "confidence": self.confidence,
            "disposition": self.disposition,
            "reasoning": self.reasoning,
            "alternatives": self.alternatives,
            "tokens_used": self.tokens_used,
            "execution_time_ms": self.execution_time_ms,
        }


class BaseAgent(ABC):
    """Abstract base class for all shipping agents."""

    agent_name: str = "BaseAgent"

    def __init__(self, fast_mode: bool = False):
        self.llm = get_llm(fast=fast_mode)
        self.fast_mode = fast_mode

    @abstractmethod
    async def run(self, input_data: dict) -> AgentDecision:
        """Execute the agent's primary task."""
        pass

    async def _call_llm(self, system_prompt: str, user_prompt: str) -> tuple[str, dict]:
        """Call the LLM and return (response_text, token_usage)."""
        start = time.time()
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]
        response = await self.llm.ainvoke(messages)
        elapsed_ms = (time.time() - start) * 1000

        token_usage = {}
        if hasattr(response, "usage_metadata") and response.usage_metadata:
            token_usage = {
                "input_tokens": response.usage_metadata.get("input_tokens", 0),
                "output_tokens": response.usage_metadata.get("output_tokens", 0),
            }

        logger.info(
            "llm_call_completed",
            agent=self.agent_name,
            elapsed_ms=round(elapsed_ms, 1),
            tokens=token_usage,
        )
        return response.content, token_usage

    def _parse_confidence(self, text: str) -> float:
        """Extract confidence score from LLM response text."""
        import re
        patterns = [
            r"confidence[:\s]+([0-9.]+)",
            r"confidence_score[:\s]+([0-9.]+)",
            r"([0-9.]+)\s*confidence",
        ]
        for pattern in patterns:
            match = re.search(pattern, text.lower())
            if match:
                val = float(match.group(1))
                return val if val <= 1.0 else val / 100.0
        return 0.75  # Default moderate confidence
