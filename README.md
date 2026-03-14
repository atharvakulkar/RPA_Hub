# InvoiceRPA Hub

A production-grade, RPA-style invoice processing dashboard that orchestrates an automated workflow to extract structured data from unstructured PDF invoices.

## Features

- **Pydantic & FastAPI Backend**: Modular enterprise structure.
- **Layered Data Extraction Engine**:
  1. AI-powered multimodal extraction via **Gemini 2.0 Vision API**.
  2. Fallback text extraction via **pdfplumber**.
  3. Final regex pattern matching fallback.
- **Duplicate Detection**: Prevents processing the same invoice number twice.
- **Structured Storage**: Data is logged into `processed_invoices.csv` (Mock ERP Database).
- **Enterprise Dashboard**: Built with Vanilla JS and Tailwind CSS, featuring drag-and-drop operations, real-time activity logging, dynamic tables, and CSV export.

## Application Architecture

```
project-root
│
├── backend/
│   ├── main.py                  # FastAPI application entry point
│   ├── routes/
│   │    └── upload.py           # API endpoints (/upload, /invoices, /export)
│   ├── services/
│   │    └── invoice_processor.py# Orchestrates the RPA extraction workflow
│   ├── utils/
│   │    └── pdf_parser.py       # Layered extraction logic (Gemini + Regex)
│   ├── storage/
│   │    └── csv_store.py        # Thread-safe read/write/duplicate logic
│   ├── models/
│   │    └── invoice_model.py    # Pydantic schemas (InvoiceData, InvoiceRecord)
│   └── logs/
│        └── error.log           # Application logs
│
├── frontend/
│   ├── index.html               # Custom HTML dashboard
│   └── app.js                   # Client-side API integration
│
├── processed_invoices.csv       # The mock ERP structured database
└── requirements.txt             # Python dependencies
```

## Setup & Installation

**1. Clone the repository and navigate to the project directory:**
```bash
git clone <your-repo-url>
cd RPA_Stefan
```

**2. Create a virtual environment and install dependencies:**
```bash
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

**3. Configure Environment Variables (Optional but recommended):**
To use the primary Gemini AI extraction layer, set your API key in a `.env` file at the root:
```env
GEMINI_API_KEY=your_actual_api_key_here
```
If not provided, the application will gracefully fall back to local `pdfplumber` and Regex extraction.

**4. Start the Application:**
```bash
uvicorn backend.main:app --reload --port 8000
```

**5. Open the Dashboard:**
Navigate your browser to `http://localhost:8000`.

## Testing

A helper script is provided to generate sample PDF invoices locally without needing an actual invoice file:
```bash
pip install reportlab
python generate_samples.py
```
This generates mock PDFs inside a `test_invoices/` directory, which you can drag and drop into the dashboard.

## Production Considerations

While this is designed as an architectural template for an RPA hub:
- The persistent store (`csv_store.py`) should be replaced by a real SQL/NoSQL DB connection in production.
- Authentication/Authorization middleware should be implemented on the endpoints.
- Error logs are written locally but should ideally stream to a centralized logging platform (ELK, Datadog, etc.).
