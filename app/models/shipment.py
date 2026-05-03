from sqlalchemy import (
    Column, String, Float, Integer, Boolean, DateTime,
    ForeignKey, JSON, Text, Enum as SAEnum
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime
import uuid
import enum


class ShipmentStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING_AGENT = "pending_agent"
    AGENT_PROCESSING = "agent_processing"
    AWAITING_APPROVAL = "awaiting_approval"
    LABEL_CREATED = "label_created"
    PICKED_UP = "picked_up"
    IN_TRANSIT = "in_transit"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    EXCEPTION = "exception"
    REROUTED = "rerouted"
    CANCELLED = "cancelled"
    RETURNED = "returned"


class ShipmentPriority(str, enum.Enum):
    STANDARD = "standard"
    EXPRESS = "express"
    OVERNIGHT = "overnight"
    ECONOMY = "economy"
    FREIGHT = "freight"


class Shipment(Base):
    __tablename__ = "shipments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tracking_number = Column(String(100), unique=True, index=True, nullable=True)
    external_id = Column(String(100), index=True, nullable=True)  # EasyPost/Shippo ID

    # Status & Priority
    status = Column(SAEnum(ShipmentStatus), default=ShipmentStatus.DRAFT, nullable=False)
    priority = Column(SAEnum(ShipmentPriority), default=ShipmentPriority.STANDARD)

    # Addresses (stored as JSON for flexibility)
    origin_address = Column(JSON, nullable=False)
    destination_address = Column(JSON, nullable=False)

    # Package details
    weight_kg = Column(Float, nullable=False)
    length_cm = Column(Float, nullable=True)
    width_cm = Column(Float, nullable=True)
    height_cm = Column(Float, nullable=True)
    declared_value = Column(Float, default=0.0)
    currency = Column(String(3), default="USD")
    contents_description = Column(Text, nullable=True)
    hs_code = Column(String(20), nullable=True)
    is_hazmat = Column(Boolean, default=False)
    requires_signature = Column(Boolean, default=False)

    # Carrier & Rate
    selected_carrier = Column(String(50), nullable=True)
    selected_service = Column(String(100), nullable=True)
    quoted_rate = Column(Float, nullable=True)
    actual_cost = Column(Float, nullable=True)
    carrier_label_url = Column(String(500), nullable=True)

    # Agent Decision
    agent_confidence_score = Column(Float, nullable=True)
    agent_reasoning = Column(JSON, nullable=True)  # Full reasoning log
    agent_alternatives = Column(JSON, nullable=True)  # 3 pre-calculated options
    auto_executed = Column(Boolean, default=False)

    # Sustainability
    carbon_footprint_kg = Column(Float, nullable=True)
    carbon_credits_used = Column(Float, nullable=True)
    is_green_route = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    estimated_delivery = Column(DateTime, nullable=True)
    actual_delivery = Column(DateTime, nullable=True)

    # Relations
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_by_user = relationship("User", back_populates="shipments")
    tracking_events = relationship("TrackingEvent", back_populates="shipment", lazy="selectin")
    documents = relationship("ShippingDocument", back_populates="shipment", lazy="selectin")
    exceptions = relationship("ShipmentException", back_populates="shipment", lazy="selectin")
    escalations = relationship("EscalationTask", back_populates="shipment", lazy="selectin")
