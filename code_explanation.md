# Code Explanation: InvoiceRPA Hub

This document explains the architectural decisions, design patterns, and flow of the InvoiceRPA Hub platform.

## 1. System Flow Overview

The application simulates a Robotic Process Automation (RPA) bot executing a document processing job:

1. **User Upload**: A PDF file is dropped on the frontend drop zone. `app.js` catches the event and POSTs the file via `FormData` to `/api/upload`.
2. **Job Queued**: `backend.routes.upload` receives the file, drops it into a temporary OS directory, and hands it off to `services.invoice_processor`.
3. **Data Extraction**: The processor triggers `utils.pdf_parser`.
4. **Resilience Check**: The parser tries Google Gemini. If it fails or is unconfigured, it drops to `pdfplumber`. If `pdfplumber` fails, it returns `None`. Let's assume it succeeds; we now have an `InvoiceData` Pydantic object.
5. **Business Logic (Duplicate Validation)**: The processor takes the extracted `invoice_number` and queries `storage.csv_store`. If it exists, the state is marked as `DUPLICATE`.
6. **Storage**: The processor formats the final `InvoiceRecord`, appends it to `processed_invoices.csv`, and returns success to the route.
7. **UI Update**: The React-like Vanilla JS frontend catches the successful HTTP 200, updates the 'Activity Log', and re-fetches `/api/invoices` to update the data table.

## 2. Key Architectural Decisions

### A. Layered Extraction Engine (`utils/pdf_parser.py`)
PDF parsers are notoriously brittle. We employ a "Fallback Pattern":
*   **Layer 1 (AI Contextual)**: `google-generativeai` processes the document natively as an image/document blob. It asks for strict JSON. This handles highly unstructured or "scanned" image PDFs visually.
*   **Layer 2 (Deterministic Text)**: `pdfplumber` reads the embedded text layer of true digital PDFs. We then pipe that plain string into a list of compiled Regular Expressions looking for common invoice terms (`Invoice No`, `Total Due`, etc).

### B. Scalable Backend Structure
We avoid writing all code in one `main.py` (which is common but bad practice in FastAPI apps). Instead, we enforce separation of concerns:
*   **Models**: Domain definitions (`invoice_model.py`).
*   **Routes**: Strictly HTTP request/response handlers, no business logic (`upload.py`).
*   **Services**: The core business rules and orchestration (`invoice_processor.py`).
*   **Storage**: Database interaction layer (`csv_store.py`), simulating the Repository Pattern.

### C. Thread-Safe CSV Storage (`storage/csv_store.py`)
Since FastAPI handles requests concurrently (async), writing to a single CSV file could lead to race conditions (data corruption/interleaving lines). We mitigate this by wrapping the `append_record` and `read_all` methods in Python's standard `threading.Lock`. While not suitable for heavy multi-node scale, it is the safest pure-Python way to handle file concurrency.

### D. Frontend State Management (`frontend/app.js`)
We deliberately chose **Vanilla JavaScript** combined with **Tailwind CSS classes** avoiding heavyweight frameworks like React/Vue for this dashboard to maintain simplicity while proving complex UI logic is possible:
*   **State Machine Functions**: Functions like `showUploadState('processing')` act as declarative state transitions, hiding and showing DOM classes cleanly instead of inline style manipulation.
*   **Data Binding**: `renderTable()` and `renderActivityLog()` act as poor-man's virtual DOM diffs, completely re-stringifying template literals over the parent DOM nodes.

## 3. Notable Code Patterns

**Pydantic Enum Models**:
In `invoice_model.py`, the `InvoiceStatus` class uses `str, Enum`. This ensures that across the stack (Python validation -> JSON serialization -> Swagger UI -> Frontend parsing), the status strings (e.g., `"Duplicate"`) evaluate cleanly without magic strings causing typos.

**FastAPI Static Mounting**:
In `main.py`, the line `app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")` natively serves our `index.html`/`app.js`. This eliminates the need for a separate frontend Node server during development, turning the stack into a monolithic deployment.
