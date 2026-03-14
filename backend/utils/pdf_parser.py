"""Layered PDF extraction engine.

Strategy:
1. Gemini Vision API (if GEMINI_API_KEY is set)
2. pdfplumber text extraction + regex
3. Broadened regex fallback
"""

import json
import logging
import os
import re
from pathlib import Path
from typing import Optional

import pdfplumber
from dotenv import load_dotenv

from backend.models.invoice_model import InvoiceData

load_dotenv()
logger = logging.getLogger("invoice_rpa")

# ---------------------------------------------------------------------------
# Regex patterns
# ---------------------------------------------------------------------------
INVOICE_NUM_PATTERNS = [
    re.compile(r"Invoice\s*(?:Number|No\.?|#)[:\s\-]*([A-Za-z0-9\-\/]+)", re.IGNORECASE),
    re.compile(r"Inv\s*(?:No\.?|#)[:\s\-]*([A-Za-z0-9\-\/]+)", re.IGNORECASE),
    re.compile(r"(?:Bill|Receipt)\s*(?:Number|No\.?|#)[:\s\-]*([A-Za-z0-9\-\/]+)", re.IGNORECASE),
]

DATE_PATTERNS = [
    re.compile(r"(?:Invoice\s*)?Date[:\s\-]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})", re.IGNORECASE),
    re.compile(r"Date[:\s\-]*([A-Za-z]+\s+\d{1,2},?\s+\d{4})", re.IGNORECASE),
    re.compile(r"(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})"),
    re.compile(r"(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})"),
]

AMOUNT_PATTERNS = [
    re.compile(r"(?:Total|Amount\s*Due|Grand\s*Total|Balance\s*Due|Total\s*Due)[:\s\-]*\$?\s*([\d,]+\.?\d*)", re.IGNORECASE),
    re.compile(r"(?:Total|Amount)[:\s\-]*(?:USD|INR|EUR|GBP)?\s*\$?\s*([\d,]+\.?\d*)", re.IGNORECASE),
    re.compile(r"\$\s*([\d,]+\.\d{2})"),
]


def _extract_with_regex(text: str) -> InvoiceData:
    """Extract invoice fields from raw text using regex patterns."""
    invoice_number = None
    date = None
    total_amount = None

    for pattern in INVOICE_NUM_PATTERNS:
        match = pattern.search(text)
        if match:
            invoice_number = match.group(1).strip()
            break

    for pattern in DATE_PATTERNS:
        match = pattern.search(text)
        if match:
            date = match.group(1).strip()
            break

    for pattern in AMOUNT_PATTERNS:
        match = pattern.search(text)
        if match:
            total_amount = match.group(1).strip()
            break

    return InvoiceData(
        invoice_number=invoice_number,
        date=date,
        total_amount=total_amount,
    )


def _extract_with_pdfplumber(file_path: str) -> Optional[InvoiceData]:
    """Extract text from PDF using pdfplumber, then apply regex."""
    try:
        full_text = ""
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    full_text += page_text + "\n"

        if not full_text.strip():
            logger.warning("pdfplumber extracted no text from %s", file_path)
            return None

        data = _extract_with_regex(full_text)

        # Check if we got at least one field
        if data.invoice_number or data.date or data.total_amount:
            return data

        logger.warning("Regex found no fields in pdfplumber text for %s", file_path)
        return None

    except Exception as e:
        logger.error("pdfplumber extraction failed for %s: %s", file_path, e)
        return None


def _extract_with_gemini(file_path: str) -> Optional[InvoiceData]:
    """Extract invoice data using Gemini Vision API."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.info("GEMINI_API_KEY not set — skipping Gemini extraction.")
        return None

    try:
        import google.generativeai as genai

        genai.configure(api_key=api_key)

        # Upload the PDF file
        uploaded_file = genai.upload_file(file_path)

        model = genai.GenerativeModel("gemini-2.0-flash")

        prompt = """Analyze this invoice document and extract the following information.
Return ONLY a valid JSON object with these exact keys:
{
  "invoice_number": "the invoice number or ID",
  "date": "the invoice date",
  "total_amount": "the total amount (numbers only, no currency symbols)"
}

If a field cannot be found, use null for its value.
Return ONLY the JSON object, no other text."""

        response = model.generate_content([prompt, uploaded_file])
        response_text = response.text.strip()

        # Clean up markdown code fences if present
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            # Remove first and last lines (```json and ```)
            lines = [l for l in lines if not l.strip().startswith("```")]
            response_text = "\n".join(lines).strip()

        parsed = json.loads(response_text)

        return InvoiceData(
            invoice_number=parsed.get("invoice_number"),
            date=parsed.get("date"),
            total_amount=str(parsed.get("total_amount")) if parsed.get("total_amount") else None,
        )

    except Exception as e:
        logger.error("Gemini extraction failed for %s: %s", file_path, e)
        return None


def extract_invoice_data(file_path: str) -> Optional[InvoiceData]:
    """Run the layered extraction strategy.

    1. Gemini Vision API
    2. pdfplumber + regex
    3. Returns None on total failure
    """
    # Layer 1 — Gemini
    data = _extract_with_gemini(file_path)
    if data and (data.invoice_number or data.total_amount):
        logger.info("Gemini extraction succeeded for %s", file_path)
        return data

    # Layer 2 — pdfplumber + regex
    data = _extract_with_pdfplumber(file_path)
    if data and (data.invoice_number or data.total_amount):
        logger.info("pdfplumber extraction succeeded for %s", file_path)
        return data

    logger.warning("All extraction methods failed for %s", file_path)
    return None
