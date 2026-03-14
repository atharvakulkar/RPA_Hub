/**
 * InvoiceRPA Hub — Frontend Client Logic
 * Handles drag-drop upload, data fetching, table rendering, activity log, and CSV export.
 */

// ──────────────────────────────────────────────
// DOM References
// ──────────────────────────────────────────────
const dropZone        = document.getElementById('drop-zone');
const fileInput       = document.getElementById('file-input');
const uploadIdle      = document.getElementById('upload-idle');
const uploadProcessing= document.getElementById('upload-processing');
const uploadSuccess   = document.getElementById('upload-success');
const uploadError     = document.getElementById('upload-error');
const successMsg      = document.getElementById('success-msg');
const errorMsg        = document.getElementById('error-msg');
const tableBody       = document.getElementById('invoice-table-body');
const activityLog     = document.getElementById('activity-log');
const logCount        = document.getElementById('log-count');
const metricCount     = document.getElementById('metric-count');

// Activity log entries (in-memory for current session)
let logEntries = [];

// ──────────────────────────────────────────────
// Initialisation
// ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    fetchInvoices();
    setupDragDrop();
    fileInput.addEventListener('change', handleFileSelect);
});

// ──────────────────────────────────────────────
// Drag & Drop
// ──────────────────────────────────────────────
function setupDragDrop() {
    ['dragenter', 'dragover'].forEach(evt =>
        dropZone.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); dropZone.classList.add('drop-active'); })
    );
    ['dragleave', 'drop'].forEach(evt =>
        dropZone.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); dropZone.classList.remove('drop-active'); })
    );
    dropZone.addEventListener('drop', e => {
        const files = e.dataTransfer.files;
        if (files.length > 0) uploadFile(files[0]);
    });
}

function handleFileSelect(e) {
    if (e.target.files.length > 0) {
        uploadFile(e.target.files[0]);
        e.target.value = '';           // reset so same file can be re-uploaded
    }
}

// ──────────────────────────────────────────────
// Upload
// ──────────────────────────────────────────────
async function uploadFile(file) {
    // Client-side validation
    if (!file.name.toLowerCase().endsWith('.pdf')) {
        showUploadState('error', 'Only PDF files are accepted.');
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        showUploadState('error', 'File exceeds the 10 MB limit.');
        return;
    }

    showUploadState('processing');

    const formData = new FormData();
    formData.append('file', file);

    try {
        const res  = await fetch('/api/upload', { method: 'POST', body: formData });
        const json = await res.json();

        if (!res.ok) {
            throw new Error(json.detail || 'Upload failed');
        }

        const data   = json.data;
        const status = data.status;

        showUploadState('success', `${file.name} — ${status}`);
        addLogEntry(file.name, status);
        fetchInvoices();

    } catch (err) {
        showUploadState('error', err.message || 'An unexpected error occurred.');
        addLogEntry(file.name, 'Failed');
    }
}

// ──────────────────────────────────────────────
// Upload Zone States
// ──────────────────────────────────────────────
function showUploadState(state, message = '') {
    uploadIdle.classList.add('hidden');
    uploadProcessing.classList.add('hidden');
    uploadSuccess.classList.add('hidden');
    uploadError.classList.add('hidden');

    switch (state) {
        case 'idle':
            uploadIdle.classList.remove('hidden');
            break;
        case 'processing':
            uploadProcessing.classList.remove('hidden');
            break;
        case 'success':
            uploadSuccess.classList.remove('hidden');
            successMsg.textContent = message;
            setTimeout(() => showUploadState('idle'), 3000);
            break;
        case 'error':
            uploadError.classList.remove('hidden');
            errorMsg.textContent = message;
            setTimeout(() => showUploadState('idle'), 4000);
            break;
    }
}

// ──────────────────────────────────────────────
// Fetch & Render Invoices
// ──────────────────────────────────────────────
async function fetchInvoices() {
    try {
        const res  = await fetch('/api/invoices');
        const json = await res.json();
        renderTable(json.data || []);
        updateMetric(json.data || []);
    } catch (err) {
        console.error('Failed to fetch invoices:', err);
    }
}

function renderTable(records) {
    if (!records.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-12 text-center text-slate-500 italic">
                    No invoices processed yet
                </td>
            </tr>`;
        return;
    }

    // Show newest first
    const sorted = [...records].reverse();

    tableBody.innerHTML = sorted.map(r => `
        <tr class="row-hover border-b border-slate-700/30 animate-slide-up">
            <td class="px-6 py-3.5 font-medium text-slate-200 max-w-[180px] truncate" title="${escapeHtml(r.file_name)}">${escapeHtml(r.file_name)}</td>
            <td class="px-6 py-3.5 text-slate-300 font-mono text-xs">${escapeHtml(r.invoice_number)}</td>
            <td class="px-6 py-3.5 text-slate-300">${escapeHtml(r.date)}</td>
            <td class="px-6 py-3.5 text-slate-200 font-semibold">${escapeHtml(r.total_amount)}</td>
            <td class="px-6 py-3.5">${statusBadge(r.status)}</td>
            <td class="px-6 py-3.5 text-slate-400 text-xs">${escapeHtml(r.processed_at)}</td>
        </tr>`
    ).join('');
}

function updateMetric(records) {
    const today = new Date().toISOString().slice(0, 10);   // YYYY-MM-DD
    const count = records.filter(r => (r.processed_at || '').startsWith(today)).length;
    metricCount.textContent = count;
}

// ──────────────────────────────────────────────
// Status Badges
// ──────────────────────────────────────────────
function statusBadge(status) {
    const map = {
        Processed:  'bg-emerald-500/15 text-emerald-400 ring-emerald-500/20',
        Failed:     'bg-red-500/15 text-red-400 ring-red-500/20',
        Processing: 'bg-amber-500/15 text-amber-400 ring-amber-500/20 badge-processing',
        Queued:     'bg-sky-500/15 text-sky-400 ring-sky-500/20',
        Duplicate:  'bg-purple-500/15 text-purple-400 ring-purple-500/20',
    };
    const classes = map[status] || 'bg-slate-500/15 text-slate-400 ring-slate-500/20';
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ring-1 ring-inset ${classes}">${escapeHtml(status)}</span>`;
}

// ──────────────────────────────────────────────
// Activity Log
// ──────────────────────────────────────────────
function addLogEntry(fileName, status) {
    const isSuccess = (status === 'Processed');
    const isDuplicate = (status === 'Duplicate');
    const icon = isSuccess ? '✔' : isDuplicate ? '⚠' : '✖';
    const colorClass = isSuccess
        ? 'text-emerald-400'
        : isDuplicate
            ? 'text-amber-400'
            : 'text-red-400';

    const time = new Date().toLocaleTimeString();
    const entry = { icon, colorClass, fileName, status, time };
    logEntries.unshift(entry);
    renderActivityLog();
}

function renderActivityLog() {
    if (!logEntries.length) return;
    logCount.textContent = `${logEntries.length} event${logEntries.length > 1 ? 's' : ''}`;
    activityLog.innerHTML = logEntries.map(e => `
        <div class="flex items-start gap-2 text-xs py-1.5 px-2 rounded-lg hover:bg-slate-700/30 transition-colors animate-slide-up">
            <span class="${e.colorClass} text-sm leading-none mt-0.5">${e.icon}</span>
            <div class="flex-1 min-w-0">
                <span class="text-slate-300 truncate block" title="${escapeHtml(e.fileName)}">${escapeHtml(e.fileName)}</span>
                <span class="text-slate-500">${e.status} • ${e.time}</span>
            </div>
        </div>`
    ).join('');
}

// ──────────────────────────────────────────────
// CSV Export
// ──────────────────────────────────────────────
function exportCSV() {
    window.location.href = '/api/export';
}

// ──────────────────────────────────────────────
// Utilities
// ──────────────────────────────────────────────
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
