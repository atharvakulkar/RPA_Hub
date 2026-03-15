"""API routes for dashboard analytics."""

from datetime import datetime
from fastapi import APIRouter
from backend.storage.csv_store import read_all

router = APIRouter(prefix="/api")

@router.get("/analytics")
async def get_analytics():
    """Calculate and return dashboard analytics metrics."""
    records = read_all()
    
    today_str = datetime.now().strftime("%Y-%m-%d")
    
    invoices_today = 0
    total_revenue = 0.0
    failed_count = 0
    total_processing_time = 0.0
    processed_count_with_time = 0

    for r in records:
        status = r.get("status", "")
        processed_at = r.get("processed_at", "")
        
        # 1. Invoices Processed Today
        if status == "Processed" and processed_at.startswith(today_str):
            invoices_today += 1
            
        # 2. Total Revenue Processed
        if status == "Processed":
            amt_str = r.get("total_amount", "0")
            # Remove symbols and commas
            amt_clean = amt_str.replace("₹", "").replace("$", "").replace(",", "").replace(" ", "")
            try:
                total_revenue += float(amt_clean)
            except ValueError:
                pass
                
        # 3. Failures
        if status in ("Failed", "Duplicate"):  # considering duplicates as failures for rate calculation
            failed_count += 1
            
        # 4. Average Processing Time
        proc_time_str = r.get("processing_time", "")
        if proc_time_str and proc_time_str != "None":
            try:
                total_processing_time += float(proc_time_str)
                processed_count_with_time += 1
            except ValueError:
                pass

    total_invoices = len(records)
    failure_rate = (failed_count / total_invoices * 100) if total_invoices > 0 else 0.0
    avg_processing_time = (total_processing_time / processed_count_with_time) if processed_count_with_time > 0 else 0.0

    return {
        "success": True,
        "data": {
            "invoices_today": invoices_today,
            "total_revenue": total_revenue,
            "failure_rate": round(failure_rate, 1),
            "avg_processing_time": round(avg_processing_time, 2),
        }
    }
