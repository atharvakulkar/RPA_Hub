/**
 * tableComponent.js - Renders the data table and handles badge styling.
 */

const TableComponent = {
    tbody: document.getElementById('invoice-table-body'),
    searchInput: document.getElementById('table-search'),
    
    records: [],

    init() {
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                this.filterTable(term);
            });
        }
    },

    updateData(records) {
        // Reverse to show newest first
        this.records = [...records].reverse();
        this.renderTable(this.records);
    },

    filterTable(term) {
        if (!term) {
            this.renderTable(this.records);
            return;
        }
        
        const filtered = this.records.filter(r => {
            return (r.file_name || '').toLowerCase().includes(term) ||
                   (r.invoice_number || '').toLowerCase().includes(term) ||
                   (r.status || '').toLowerCase().includes(term);
        });
        
        this.renderTable(filtered);
    },

    renderTable(data) {
        if (!this.tbody) return;

        if (!data.length) {
            this.tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-5 py-12 text-center text-dark-muted italic">
                        No invoices found
                    </td>
                </tr>`;
            return;
        }

        this.tbody.innerHTML = data.map((r, index) => `
            <tr class="row-hover animate-slide-up" style="animation-delay: ${index * 0.05}s">
                <td class="px-5 py-3.5 font-medium text-white max-w-[200px] truncate" title="${this.escape(r.file_name)}">
                    <div class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-brand-400 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
                        <span class="truncate">${this.escape(r.file_name)}</span>
                    </div>
                </td>
                <td class="px-5 py-3.5 text-dark-muted font-mono text-xs">${this.escape(r.invoice_number)}</td>
                <td class="px-5 py-3.5 text-dark-muted">${this.escape(r.date)}</td>
                <td class="px-5 py-3.5 text-white font-semibold">${this.escape(r.total_amount)}</td>
                <td class="px-5 py-3.5">${this.renderBadge(r.status)}</td>
                <td class="px-5 py-3.5 text-dark-muted text-xs text-right">${this.escape(r.processed_at)}</td>
            </tr>`
        ).join('');
    },

    renderBadge(status) {
        const map = {
            Processed:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(52,211,153,0.1)]',
            Failed:     'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(248,113,113,0.1)]',
            Processing: 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse',
            Queued:     'bg-sky-500/10 text-sky-400 border-sky-500/20',
            Duplicate:  'bg-purple-500/10 text-purple-400 border-purple-500/20',
        };
        const classes = map[status] || 'bg-zinc-800 text-zinc-400 border-zinc-700';
        return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${classes}">${this.escape(status)}</span>`;
    },

    escape(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};
