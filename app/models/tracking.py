from sqlalchemy import Column, String, Float, DateTime, ForeignKey, JSON, Text, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime
import uuid
import enum


class TrackingEventType(str, enum.Enum):
    LABEL_CREATED = "label_created"
    PICKED_UP = "picked_up"
    IN_TRANSIT = "in_transit"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    EXCEPTION = "exception"
    DELAY_DETECTED = "delay_detected"
    REROUTED = "rerouted"
    CUSTOMS_HOLD = "customs_hold"
    WEATHER_DELAY = "weather_delay"
    RETURNED = "returned"


class TrackingEvent(Base):
    __tablename__ = "tracking_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shipment_id = Column(UUID(as_uuid=True), ForeignKey("shipments.id"), nullable=False)
    event_type = Column(SAEnum(TrackingEventType), nullable=False)
    description = Column(Text, nullable=True)
    location = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    carrier_event_code = Column(String(50), nullable=True)
    raw_carrier_data = Column(JSON, nullable=True)
    occurred_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    shipment = relationship("Shipment", back_populates="tracking_events")


class ShipmentException(Base):
    __tablename__ = "shipment_exceptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shipment_id = Column(UUID(as_uuid=True), ForeignKey("shipments.id"), nullable=False)
    exception_type = Column(String(100), nullable=False)
    severity = Column(String(20), default="medium")  # low, medium, high, critical
    description = Column(Text, nullable=False)
    agent_action_taken = Column(Text, nullable=True)
    resolution_status = Column(String(50), default="open")  # open, resolved, escalated
    resolution_notes = Column(Text, nullable=True)
    detected_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    shipment = relationship("Shipment", back_populates="exceptions")
