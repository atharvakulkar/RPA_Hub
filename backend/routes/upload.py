"""API routes for invoice upload, listing, and export."""

import logging
import os
import tempfile
import time
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from backend.services.invoice_processor import process_invoice
from backend.storage.csv_store import get_csv_path, read_all

logger = logging.getLogger("invoice_rpa")
router = APIRouter(prefix="/api")

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/upload")
async def upload_invoice(file: UploadFile = File(...)):
    """Upload and process a PDF invoice."""

    # --- Validate file type ---
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only PDF files are accepted.",
        )

    if file.content_type and file.content_type != "application/pdf":
        # Some browsers may not send content_type — rely on extension above
        pass

    # --- Read file content and validate size ---
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is 10 MB.",
        )

    # --- Save to temp file ---
    tmp_dir = tempfile.mkdtemp()
    tmp_path = os.path.join(tmp_dir, file.filename)
    with open(tmp_path, "wb") as f:
        f.write(content)

    try:
        # --- Process the invoice ---
        start_time = time.time()
        record = process_invoice(tmp_path, file.filename, start_time)
        return {
            "success": True,
            "message": f"Invoice processed with status: {record.status.value}",
            "data": record.model_dump(),
        }
    except Exception as e:
        logger.error("Processing error for %s: %s", file.filename, e)
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
    finally:
        # Clean up temp file
        try:
            os.remove(tmp_path)
            os.rmdir(tmp_dir)
        except OSError:
            pass


@router.get("/invoices")
async def get_invoices():
    """Fetch all processed invoice records."""
    records = read_all()
    return {"success": True, "data": records}


@router.get("/export")
async def export_csv():
    """Download the processed invoices CSV file."""
    csv_path = get_csv_path()
    if not csv_path.exists():
        raise HTTPException(status_code=404, detail="No data to export.")
    return FileResponse(
        path=str(csv_path),
        filename="processed_invoices.csv",
        media_type="text/csv",
    )
