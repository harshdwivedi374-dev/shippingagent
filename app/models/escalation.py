from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, JSON, Text, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime
import uuid
import enum


class EscalationStatus(str, enum.Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"


class EscalationTask(Base):
    """Human-in-the-loop escalation tasks when agent confidence is below threshold."""
    __tablename__ = "escalation_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shipment_id = Column(UUID(as_uuid=True), ForeignKey("shipments.id"), nullable=False)
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    status = Column(SAEnum(EscalationStatus), default=EscalationStatus.PENDING)
    confidence_score = Column(Float, nullable=False)
    reason = Column(Text, nullable=False)

    # Agent pre-calculated options for human to choose from
    option_a = Column(JSON, nullable=True)
    option_b = Column(JSON, nullable=True)
    option_c = Column(JSON, nullable=True)
    selected_option = Column(String(1), nullable=True)  # A, B, or C

    # Full reasoning trace
    agent_reasoning_log = Column(JSON, nullable=True)
    human_notes = Column(Text, nullable=True)

    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    shipment = relationship("Shipment", back_populates="escalations")
    assigned_to_user = relationship("User", back_populates="escalations")


class AgentDecisionLog(Base):
    """Full audit trail of every agent decision for traceability."""
    __tablename__ = "agent_decision_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shipment_id = Column(String(100), nullable=True, index=True)
    agent_name = Column(String(100), nullable=False)
    action_type = Column(String(100), nullable=False)
    input_data = Column(JSON, nullable=True)
    output_data = Column(JSON, nullable=True)
    reasoning = Column(Text, nullable=True)
    confidence_score = Column(Float, nullable=True)
    tokens_used = Column(JSON, nullable=True)
    execution_time_ms = Column(Float, nullable=True)
    success = Column(Boolean, default=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
