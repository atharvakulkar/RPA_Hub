"""FastAPI application entry point for InvoiceRPA Hub."""

import logging
from pathlib import Path

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.routes.upload import router as upload_router
from backend.routes.analytics import router as analytics_router
from backend.folder_watcher import watcher_instance

# ---------------------------------------------------------------------------
# Logging configuration
# ---------------------------------------------------------------------------
LOG_DIR = Path(__file__).resolve().parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    handlers=[
        logging.FileHandler(LOG_DIR / "error.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger("invoice_rpa")

# ---------------------------------------------------------------------------
# FastAPI app & Lifespan
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing background folder watcher...")
    watcher_instance.start()
    yield
    # Shutdown
    logger.info("Shutting down background folder watcher...")
    watcher_instance.stop()

app = FastAPI(
    title="InvoiceRPA Hub",
    description="Smart Invoice Processing — RPA-style Dashboard",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow all for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(upload_router)
app.include_router(analytics_router)

# Serve frontend static files
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
    logger.info("Serving frontend from %s", FRONTEND_DIR)
else:
    logger.warning("Frontend directory not found at %s", FRONTEND_DIR)
