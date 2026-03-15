/**
 * activityLog.js - Displays live activity feed on the dashboard.
 */

const ActivityLog = {
    container: document.getElementById('activity-log'),
    countBadge: document.getElementById('log-count'),
    
    entries: [],

    init() {
        this.render();
    },

    addEntry(fileName, status) {
        const isSuccess = (status === 'Processed');
        const isDuplicate = (status === 'Duplicate');
        
        let iconHtml = '';
        if (isSuccess) {
            iconHtml = `<svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
        } else if (isDuplicate) {
            iconHtml = `<svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2.25m0 2.25h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
        } else {
            iconHtml = `<svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2.25m0 2.25h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
        }

        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        this.entries.unshift({
            iconHtml,
            fileName,
            status,
            time
        });
        
        // Keep max 50 entries
        if (this.entries.length > 50) this.entries.pop();

        this.render();
    },

    render() {
        if (!this.container || !this.countBadge) return;

        this.countBadge.textContent = this.entries.length;

        if (this.entries.length === 0) {
            this.container.innerHTML = `<p class="text-xs text-dark-muted flex items-center justify-center h-full italic">No recent activity.</p>`;
            return;
        }

        this.container.innerHTML = this.entries.map((e, index) => `
            <div class="flex items-start gap-3 p-2 rounded-lg bg-dark-bg border border-transparent hover:border-dark-border transition-colors animate-slide-up" style="animation-delay: ${Math.min(index * 0.05, 0.5)}s">
                <div class="mt-0.5 bg-dark-panel rounded-full p-1 border border-dark-border shadow-sm">
                    ${e.iconHtml}
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-white truncate" title="${this.escape(e.fileName)}">${this.escape(e.fileName)}</p>
                    <p class="text-xs text-dark-muted flex items-center justify-between mt-0.5">
                        <span>${this.escape(e.status)}</span>
                        <span>${e.time}</span>
                    </p>
                </div>
            </div>
        `).join('');
    },

    escape(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};
