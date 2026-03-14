"""Pydantic models for invoice data."""

from enum import Enum
from pydantic import BaseModel
from typing import Optional


class InvoiceStatus(str, Enum):
    QUEUED = "Queued"
    PROCESSING = "Processing"
    PROCESSED = "Processed"
    FAILED = "Failed"
    DUPLICATE = "Duplicate"


class InvoiceData(BaseModel):
    """Extracted invoice fields."""
    invoice_number: Optional[str] = None
    date: Optional[str] = None
    total_amount: Optional[str] = None


class InvoiceRecord(BaseModel):
    """Full invoice record stored in CSV."""
    file_name: str
    invoice_number: str
    date: str
    total_amount: str
    status: InvoiceStatus
    processed_at: str
