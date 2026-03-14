from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import os

def generate_invoice(filename, invoice_num, date, amount):
    if not os.path.exists("test_invoices"):
        os.makedirs("test_invoices")
    filepath = os.path.join("test_invoices", filename)
    c = canvas.Canvas(filepath, pagesize=letter)
    
    # Header
    c.setFont("Helvetica-Bold", 24)
    c.drawString(50, 750, "INVOICE")
    
    # Details
    c.setFont("Helvetica", 14)
    c.drawString(50, 700, f"Invoice Number: {invoice_num}")
    c.drawString(50, 670, f"Date: {date}")
    
    # Items (Mock)
    c.drawString(50, 600, "Description")
    c.drawString(400, 600, "Amount")
    
    c.line(50, 590, 500, 590)
    
    c.drawString(50, 570, "Consulting Services")
    c.drawString(400, 570, f"${amount}")
    
    c.line(50, 560, 500, 560)
    
    # Total
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, 530, f"Total Amount Due: ${amount}")
    
    c.save()
    print(f"Generated {filepath}")

if __name__ == "__main__":
    generate_invoice("invoice_01.pdf", "INV-1001", "2026-03-14", "1,500.00")
    generate_invoice("invoice_02.pdf", "INV-1002", "March 15, 2026", "249.99")
