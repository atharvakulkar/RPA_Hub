/**
 * uploadComponent.js - Handles the drag & drop upload widget and its UI states.
 */

const UploadComponent = {
    dropZone: document.getElementById('drop-zone'),
    fileInput: document.getElementById('file-input'),
    stateIdle: document.getElementById('upload-idle'),
    stateProcessing: document.getElementById('upload-processing'),
    stateSuccess: document.getElementById('upload-success'),
    stateError: document.getElementById('upload-error'),
    successMsg: document.getElementById('success-msg'),
    errorMsg: document.getElementById('error-msg'),

    init() {
        if (!this.dropZone || !this.fileInput) return;

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });

        // Highlight drop zone
        ['dragenter', 'dragover'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, () => this.dropZone.classList.add('drop-active'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, () => this.dropZone.classList.remove('drop-active'), false);
        });

        // Handle drop
        this.dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length) this.handleFiles(files);
        }, false);

        // Handle click input
        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                this.handleFiles(e.target.files);
                this.fileInput.value = ''; // reset
            }
        });
    },

    handleFiles(files) {
        const file = files[0];
        if (file) {
            this.uploadFile(file);
        }
    },

    async uploadFile(file) {
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            this.showState('error', 'Only PDF files are accepted.');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            this.showState('error', 'File exceeds the 10 MB limit.');
            return;
        }

        this.showState('processing');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.detail || 'Upload failed');
            }

            const data = json.data;
            const status = data.status;

            this.showState('success', `${file.name} — ${status}`);
            
            // Notify other components via global event or direct call
            if (window.App) {
                window.App.logActivity(file.name, status);
                window.App.refreshData();
            }

        } catch (err) {
            this.showState('error', err.message || 'An unexpected error occurred.');
            if (window.App) {
                window.App.logActivity(file.name, 'Failed');
            }
        }
    },

    showState(stateName, message = '') {
        // Hide all
        this.stateIdle.classList.add('hidden');
        this.stateProcessing.classList.add('hidden');
        this.stateSuccess.classList.add('hidden');
        this.stateError.classList.add('hidden');

        // Show requested
        switch (stateName) {
            case 'idle':
                this.stateIdle.classList.remove('hidden');
                break;
            case 'processing':
                this.stateProcessing.classList.remove('hidden');
                break;
            case 'success':
                this.stateSuccess.classList.remove('hidden');
                this.successMsg.textContent = message;
                setTimeout(() => this.showState('idle'), 3000);
                break;
            case 'error':
                this.stateError.classList.remove('hidden');
                this.errorMsg.textContent = message;
                setTimeout(() => this.showState('idle'), 4000);
                break;
        }
    }
};

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}
