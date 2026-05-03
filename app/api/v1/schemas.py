"""
Pydantic schemas for request/response validation.
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Any
from datetime import datetime
from enum import Enum
import uuid


# ─── Address ────────────────────────────────────────────────────────────────

class AddressSchema(BaseModel):
    name: str
    company: Optional[str] = None
    street1: str
    street2: Optional[str] = None
    city: str
    state: Optional[str] = None
    zip: str
    country: str = "US"
    phone: Optional[str] = None
    email: Optional[str] = None


# ─── Shipment ────────────────────────────────────────────────────────────────

class ShipmentCreateRequest(BaseModel):
    origin_address: AddressSchema
    destination_address: AddressSchema
    weight_kg: float = Field(..., gt=0, description="Package weight in kg")
    length_cm: Optional[float] = Field(None, gt=0)
    width_cm: Optional[float] = Field(None, gt=0)
    height_cm: Optional[float] = Field(None, gt=0)
    declared_value: float = Field(0.0, ge=0)
    currency: str = Field("USD", max_length=3)
    contents_description: Optional[str] = None
    is_hazmat: bool = False
    requires_signature: bool = False
    priority: str = Field("standard", pattern="^(standard|express|overnight|economy|freight)$")
    prefer_green: bool = False


class ShipmentResponse(BaseModel):
    id: uuid.UUID
    tracking_number: Optional[str]
    status: str
    priority: str
    origin_address: dict
    destination_address: dict
    weight_kg: float
    declared_value: float
    selected_carrier: Optional[str]
    selected_service: Optional[str]
    quoted_rate: Optional[float]
    agent_confidence_score: Optional[float]
    auto_executed: bool
    carbon_footprint_kg: Optional[float]
    is_green_route: bool
    created_at: datetime
    estimated_delivery: Optional[datetime]

    class Config:
        from_attributes = True


class ShipmentListResponse(BaseModel):
    total: int
    items: List[ShipmentResponse]


# ─── Agent ───────────────────────────────────────────────────────────────────

class AgentDecisionResponse(BaseModel):
    decision_id: str
    action: str
    result: Any
    confidence: float
    disposition: str
    reasoning: str
    alternatives: List[Any]


class ProcessShipmentRequest(BaseModel):
    """Direct agent processing request (bypasses DB for testing)."""
    origin_address: AddressSchema
    destination_address: AddressSchema
    weight_kg: float = Field(..., gt=0)
    declared_value: float = 0.0
    currency: str = "USD"
    contents_description: Optional[str] = None
    priority: str = "standard"
    prefer_green: bool = False


# ─── Escalation ──────────────────────────────────────────────────────────────

class EscalationResponse(BaseModel):
    id: uuid.UUID
    shipment_id: uuid.UUID
    status: str
    confidence_score: float
    reason: str
    option_a: Optional[dict]
    option_b: Optional[dict]
    option_c: Optional[dict]
    agent_reasoning_log: Optional[Any]
    expires_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class EscalationApproveRequest(BaseModel):
    selected_option: str = Field(..., pattern="^[ABCabc]$")
    human_notes: Optional[str] = None


# ─── Auth ────────────────────────────────────────────────────────────────────

class UserCreateRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str = Field(..., min_length=8)
    role: str = Field("operator", pattern="^(admin|operator|viewer)$")


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ─── Tracking ────────────────────────────────────────────────────────────────

class TrackingEventResponse(BaseModel):
    id: uuid.UUID
    event_type: str
    description: Optional[str]
    location: Optional[str]
    occurred_at: datetime

    class Config:
        from_attributes = True


# ─── Compliance ──────────────────────────────────────────────────────────────

class ComplianceCheckRequest(BaseModel):
    product_description: str
    origin_country: str = Field(..., min_length=2, max_length=2)
    destination_country: str = Field(..., min_length=2, max_length=2)
    declared_value: float = 0.0
    currency: str = "USD"
    weight_kg: float = 1.0
    document_data: Optional[dict] = None


# ─── Exception ───────────────────────────────────────────────────────────────

class ExceptionHandleRequest(BaseModel):
    shipment_id: str
    tracking_number: Optional[str] = None
    carrier: Optional[str] = None
    current_status: str
    last_location: Optional[str] = None
    expected_delivery: Optional[str] = None
    declared_value: float = 0.0
    weight_kg: float = 1.0
    origin_address: Optional[dict] = None
    destination_address: Optional[dict] = None
    exception_type: Optional[str] = None


# ─── Rates ───────────────────────────────────────────────────────────────────

class RateQuoteRequest(BaseModel):
    origin_address: AddressSchema
    destination_address: AddressSchema
    weight_kg: float = Field(..., gt=0)
    length_cm: float = 30.0
    width_cm: float = 20.0
    height_cm: float = 15.0
