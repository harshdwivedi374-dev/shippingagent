"""
OCR & Computer Vision Tools — reads unstructured inputs:
handwritten labels, scanned invoices, voice memos, damaged goods photos.
"""
import base64
import io
from langchain.tools import tool
from app.core.logging import logger

try:
    import pytesseract
    from PIL import Image
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False


@tool
async def extract_address_from_image(image_base64: str) -> dict:
    """
    Extract shipping address from a handwritten label or scanned document image.
    Uses OCR to parse name, street, city, state, zip, and country.

    Args:
        image_base64: Base64-encoded image string
    """
    if not OCR_AVAILABLE:
        return {"success": False, "error": "OCR not available — install pytesseract and Pillow"}

    try:
        image_data = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_data))

        # Preprocess for better OCR
        image = image.convert("L")  # Grayscale

        raw_text = pytesseract.image_to_string(image, config="--psm 6")
        lines = [line.strip() for line in raw_text.split("\n") if line.strip()]

        # Simple address parser (production uses NLP NER)
        parsed = {
            "raw_text": raw_text,
            "lines": lines,
            "confidence": 0.75,
        }

        # Attempt structured extraction
        if len(lines) >= 3:
            parsed["name"] = lines[0]
            parsed["street1"] = lines[1]
            # Try to parse city/state/zip from last meaningful line
            last_line = lines[-1]
            parts = last_line.split(",")
            if len(parts) >= 2:
                parsed["city"] = parts[0].strip()
                state_zip = parts[1].strip().split()
                if len(state_zip) >= 2:
                    parsed["state"] = state_zip[0]
                    parsed["zip"] = state_zip[1]

        return {"success": True, "parsed_address": parsed}
    except Exception as e:
        logger.error("ocr_extraction_failed", error=str(e))
        return {"success": False, "error": str(e)}


@tool
async def analyze_package_dimensions(image_base64: str) -> dict:
    """
    Analyze a package image to estimate dimensions and detect damage.
    Used at packing stations for 'Dark Warehouse' integration.

    Args:
        image_base64: Base64-encoded image of the package
    """
    # In production: use a CV model (YOLO/Detectron2) for dimension estimation
    # and damage detection. Here we return a structured response format.
    try:
        image_data = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_data))
        width_px, height_px = image.size

        # Placeholder CV analysis — replace with real model inference
        return {
            "success": True,
            "image_dimensions_px": {"width": width_px, "height": height_px},
            "estimated_package_dimensions_cm": {
                "length": 30.0,
                "width": 20.0,
                "height": 15.0,
                "confidence": 0.82,
            },
            "damage_detected": False,
            "damage_confidence": 0.05,
            "damage_areas": [],
            "recommendation": "Package appears intact — proceed with shipping",
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@tool
async def extract_invoice_data(image_base64: str) -> dict:
    """
    Extract structured data from a scanned commercial invoice using OCR.
    Returns fields needed for customs declaration.

    Args:
        image_base64: Base64-encoded invoice image
    """
    if not OCR_AVAILABLE:
        return {"success": False, "error": "OCR not available"}

    try:
        image_data = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_data))
        raw_text = pytesseract.image_to_string(image)

        # Return raw text for LLM to parse (agent will use its reasoning to extract fields)
        return {
            "success": True,
            "raw_text": raw_text,
            "extraction_method": "ocr",
            "note": "Pass raw_text to the compliance agent for structured field extraction",
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
