"""Invoice processing orchestrator — manages the full RPA-style workflow."""

import logging
from datetime import datetime
from typing import Optional

from backend.models.invoice_model import InvoiceData, InvoiceRecord, InvoiceStatus
from backend.storage import csv_store
from backend.utils.pdf_parser import extract_invoice_data

logger = logging.getLogger("invoice_rpa")


def process_invoice(file_path: str, file_name: str) -> InvoiceRecord:
    """Process a single invoice PDF through the full RPA pipeline.

    Steps:
        1. Status = Queued  (job created)
        2. Status = Processing  (extraction starts)
        3. Extract data via layered strategy
        4. Check for duplicates
        5. Store record in CSV
        6. Return final InvoiceRecord
    """
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # --- Step 1 & 2: Queued → Processing (logged only) ---
    logger.info("[%s] Job created — status: Queued", file_name)
    logger.info("[%s] Starting extraction — status: Processing", file_name)

    # --- Step 3: Extract data ---
    data: Optional[InvoiceData] = extract_invoice_data(file_path)

    if data is None or (not data.invoice_number and not data.total_amount):
        # Extraction failed
        record = InvoiceRecord(
            file_name=file_name,
            invoice_number="N/A",
            date="N/A",
            total_amount="N/A",
            status=InvoiceStatus.FAILED,
            processed_at=now,
        )
        csv_store.append_record(record)
        logger.error("[%s] Extraction failed — status: Failed", file_name)
        return record

    # Fill in defaults for missing fields
    inv_number = data.invoice_number or "N/A"
    inv_date = data.date or "N/A"
    inv_amount = data.total_amount or "N/A"

    # --- Step 4: Duplicate check ---
    if inv_number != "N/A" and csv_store.check_duplicate(inv_number):
        record = InvoiceRecord(
            file_name=file_name,
            invoice_number=inv_number,
            date=inv_date,
            total_amount=inv_amount,
            status=InvoiceStatus.DUPLICATE,
            processed_at=now,
        )
        csv_store.append_record(record)
        logger.warning("[%s] Duplicate detected (Invoice #%s) — status: Duplicate", file_name, inv_number)
        return record

    # --- Step 5: Store as Processed ---
    record = InvoiceRecord(
        file_name=file_name,
        invoice_number=inv_number,
        date=inv_date,
        total_amount=inv_amount,
        status=InvoiceStatus.PROCESSED,
        processed_at=now,
    )
    csv_store.append_record(record)
    logger.info("[%s] Successfully processed — Invoice #%s", file_name, inv_number)
    return record
