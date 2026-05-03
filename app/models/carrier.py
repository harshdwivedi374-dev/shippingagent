from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, JSON, Text
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
from datetime import datetime
import uuid


class CarrierProfile(Base):
    """Stores carrier metadata and real-time performance metrics."""
    __tablename__ = "carrier_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    carrier_code = Column(String(50), unique=True, nullable=False, index=True)
    carrier_name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    supported_services = Column(JSON, default=list)
    api_provider = Column(String(50), nullable=True)  # easypost, shippo, direct

    # Performance metrics (updated by agent memory)
    avg_on_time_rate = Column(Float, default=0.95)
    avg_delay_hours = Column(Float, default=0.0)
    reliability_score = Column(Float, default=1.0)  # 0-1
    last_performance_update = Column(DateTime, nullable=True)

    # Pricing
    base_rate_per_kg = Column(Float, nullable=True)
    fuel_surcharge_pct = Column(Float, default=0.0)

    # Sustainability
    avg_carbon_per_kg_km = Column(Float, default=0.0)
    has_ev_fleet = Column(Boolean, default=False)
    green_certified = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SpotRateQuote(Base):
    """Stores spot rate quotes fetched by the Negotiator Agent."""
    __tablename__ = "spot_rate_quotes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shipment_id = Column(String(100), nullable=True)
    carrier_code = Column(String(50), nullable=False)
    service_level = Column(String(100), nullable=False)
    quoted_rate = Column(Float, nullable=False)
    currency = Column(String(3), default="USD")
    transit_days = Column(Integer, nullable=True)
    is_backhaul = Column(Boolean, default=False)
    is_spot_rate = Column(Boolean, default=True)
    valid_until = Column(DateTime, nullable=True)
    raw_response = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
