"""
Document Routes — OCR ingestion, customs document generation, compliance validation.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
import base64

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.document import ShippingDocument, DocumentType, DocumentStatus
from app.agents.tools.ocr_tools import extract_address_from_image, extract_invoice_data, analyze_package_dimensions
from app.agents.compliance_agent import ComplianceAgent

router = APIRouter(prefix="/documents", tags=["Documents & OCR"])


@router.post("/ocr/address")
async def extract_address_ocr(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    """
    Upload a handwritten label or scanned address image.
    The agent extracts and structures the address using OCR.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    content = await file.read()
    image_b64 = base64.b64encode(content).decode()

    result = await extract_address_from_image.ainvoke({"image_base64": image_b64})
    return result


@router.post("/ocr/invoice")
async def extract_invoice_ocr(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    """
    Upload a scanned commercial invoice.
    OCR extracts the text; the Compliance Agent structures the fields.
    """
    content = await file.read()
    image_b64 = base64.b64encode(content).decode()

    ocr_result = await extract_invoice_data.ainvoke({"image_base64": image_b64})
    return ocr_result


@router.post("/ocr/package-scan")
async def scan_package(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    """
    Dark Warehouse integration: scan a package at the packing station.
    Estimates dimensions and detects damage using computer vision.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    content = await file.read()
    image_b64 = base64.b64encode(content).decode()

    result = await analyze_package_dimensions.ainvoke({"image_base64": image_b64})
    return result


@router.get("/shipment/{shipment_id}")
async def get_shipment_documents(
    shipment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Get all documents associated with a shipment."""
    result = await db.execute(
        select(ShippingDocument).where(ShippingDocument.shipment_id == shipment_id)
    )
    docs = result.scalars().all()
    return [
        {
            "id": str(d.id),
            "document_type": d.document_type,
            "status": d.status,
            "file_url": d.file_url,
            "compliance_flags": d.compliance_flags,
            "is_auto_generated": d.is_auto_generated,
            "generated_at": d.generated_at,
        }
        for d in docs
    ]
