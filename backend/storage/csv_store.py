"""CSV storage layer — read, write, and duplicate detection for processed invoices."""

import csv
import threading
from pathlib import Path
from typing import List

from backend.models.invoice_model import InvoiceRecord

# Resolve CSV path relative to project root
CSV_PATH = Path(__file__).resolve().parents[2] / "processed_invoices.csv"
FIELDNAMES = ["file_name", "invoice_number", "date", "total_amount", "status", "processed_at"]

_lock = threading.Lock()


def _ensure_csv_exists() -> None:
    """Create the CSV file with headers if it doesn't exist."""
    if not CSV_PATH.exists():
        with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
            writer.writeheader()


def read_all() -> List[dict]:
    """Read all invoice records from the CSV."""
    _ensure_csv_exists()
    with _lock:
        with open(CSV_PATH, "r", newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            return list(reader)


def append_record(record: InvoiceRecord) -> None:
    """Append a single invoice record to the CSV."""
    _ensure_csv_exists()
    with _lock:
        with open(CSV_PATH, "a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
            writer.writerow(record.model_dump())


def check_duplicate(invoice_number: str) -> bool:
    """Return True if an invoice with the given number already exists."""
    records = read_all()
    return any(
        r.get("invoice_number", "").strip().lower() == invoice_number.strip().lower()
        for r in records
    )


def get_csv_path() -> Path:
    """Return the absolute path to the CSV file."""
    _ensure_csv_exists()
    return CSV_PATH
