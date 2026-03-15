"""Background service to monitor a folder for new invoice PDFs and trigger processing."""

import logging
import os
import shutil
import time
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

from backend.services.invoice_processor import process_invoice
from backend.models.invoice_model import InvoiceStatus

logger = logging.getLogger("invoice_rpa")

# Define folder paths
BASE_DIR = Path(__file__).resolve().parent.parent
TEST_INVOICES_DIR = BASE_DIR / "test_invoices"
PROCESSED_INVOICES_DIR = BASE_DIR / "processed_invoices"

# Ensure directories exist
TEST_INVOICES_DIR.mkdir(exist_ok=True)
PROCESSED_INVOICES_DIR.mkdir(exist_ok=True)

class InvoiceHandler(FileSystemEventHandler):
    """Handles file creation events in the monitored folder."""

    def on_created(self, event):
        # Ignore directories
        if event.is_directory:
            return

        file_path = Path(event.src_path)
        
        # Ignore non-PDFs and hidden files
        if file_path.suffix.lower() != ".pdf" or file_path.name.startswith("."):
            return

        logger.info("[Watcher] Detected new file: %s", file_path.name)
        
        # Give the filesystem a moment to finish writing the file to disk
        time.sleep(2)

        if not file_path.exists():
            logger.warning("[Watcher] File disappeared before processing: %s", file_path.name)
            return

        try:
            # Trigger the RPA processing pipeline
            logger.info("[Watcher] Triggering processing for: %s", file_path.name)
            start_time = time.time()
            record = process_invoice(str(file_path), file_path.name, start_time)

            # Move the file to prevent reprocessing
            dest_path = PROCESSED_INVOICES_DIR / file_path.name
            
            # Handle naming collision if the file already exists in processed_invoices
            if dest_path.exists():
                timestamp = int(time.time())
                dest_path = PROCESSED_INVOICES_DIR / f"{file_path.stem}_{timestamp}{file_path.suffix}"

            shutil.move(str(file_path), str(dest_path))
            logger.info("[Watcher] Moved %s to processed_invoices/", file_path.name)

        except Exception as e:
            logger.error("[Watcher] Unexpected error processing %s: %s", file_path.name, str(e), exc_info=True)


class DirectoryWatcher:
    """Manages the watchdog Observer lifecycle."""
    
    def __init__(self, watch_dir: Path):
        self.watch_dir = watch_dir
        self.observer = Observer()
        self.handler = InvoiceHandler()

    def start(self):
        """Start monitoring the directory."""
        if not self.watch_dir.exists():
            self.watch_dir.mkdir(parents=True, exist_ok=True)

        self.observer.schedule(self.handler, str(self.watch_dir), recursive=False)
        self.observer.start()
        logger.info("[Watcher] Started monitoring %s for new invoices...", self.watch_dir)

    def stop(self):
        """Stop monitoring."""
        if self.observer.is_alive():
            logger.info("[Watcher] Stopping folder monitor...")
            self.observer.stop()
            self.observer.join()
            logger.info("[Watcher] Folder monitor stopped.")

# Global instance
watcher_instance = DirectoryWatcher(TEST_INVOICES_DIR)
