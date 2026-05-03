from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, JSON, Text, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime
import uuid
import enum


class DocumentType(str, enum.Enum):
    COMMERCIAL_INVOICE = "commercial_invoice"
    PACKING_LIST = "packing_list"
    BILL_OF_LADING = "bill_of_lading"
    CUSTOMS_DECLARATION = "customs_declaration"
    CERTIFICATE_OF_ORIGIN = "certificate_of_origin"
    DANGEROUS_GOODS = "dangerous_goods"
    INSURANCE_CERTIFICATE = "insurance_certificate"
    SHIPPING_LABEL = "shipping_label"
    RETURN_LABEL = "return_label"
    CLAIM_FORM = "claim_form"


class DocumentStatus(str, enum.Enum):
    PENDING = "pending"
    GENERATED = "generated"
    VALIDATED = "validated"
    FLAGGED = "flagged"
    SUBMITTED = "submitted"
    REJECTED = "rejected"


class ShippingDocument(Base):
    __tablename__ = "shipping_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shipment_id = Column(UUID(as_uuid=True), ForeignKey("shipments.id"), nullable=False)
    document_type = Column(SAEnum(DocumentType), nullable=False)
    status = Column(SAEnum(DocumentStatus), default=DocumentStatus.PENDING)
    file_url = Column(String(500), nullable=True)
    file_name = Column(String(255), nullable=True)
    content_json = Column(JSON, nullable=True)  # Structured document data
    ocr_raw_text = Column(Text, nullable=True)  # OCR extracted text
    compliance_flags = Column(JSON, default=list)  # Issues found by compliance agent
    is_auto_generated = Column(Boolean, default=False)
    generated_at = Column(DateTime, nullable=True)
    validated_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    shipment = relationship("Shipment", back_populates="documents")


class ComplianceRule(Base):
    """Trade compliance rules updated by the Compliance Agent."""
    __tablename__ = "compliance_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rule_code = Column(String(100), unique=True, nullable=False)
    origin_country = Column(String(3), nullable=True)
    destination_country = Column(String(3), nullable=True)
    hs_code_pattern = Column(String(50), nullable=True)
    rule_description = Column(Text, nullable=False)
    action_required = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    effective_date = Column(DateTime, nullable=True)
    expiry_date = Column(DateTime, nullable=True)
    source_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
