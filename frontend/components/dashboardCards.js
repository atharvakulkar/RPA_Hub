/**
 * dashboardCards.js - Manages the 4 analytics cards at the top of the dashboard.
 */

const DashboardCards = {
    container: document.getElementById('dashboard-cards-container'),
    
    metrics: {
        invoices_today: 0,
        total_revenue: 0,
        failure_rate: 0.0,
        avg_processing_time: 0.0
    },

    init() {
        this.render();
    },

    updateAnalytics(analyticsData) {
        if (!analyticsData) return;
        this.metrics = {
            invoices_today: analyticsData.invoices_today || 0,
            total_revenue: analyticsData.total_revenue || 0,
            failure_rate: analyticsData.failure_rate || 0.0,
            avg_processing_time: analyticsData.avg_processing_time || 0.0
        };
        this.render();
    },

    formatCurrency(value) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(value);
    },

    render() {
        if (!this.container) return;
        
        const cards = [
            {
                title: 'Invoices Processed Today',
                value: this.metrics.invoices_today.toString(),
                icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>',
                trend: 'Live updates',
                color: 'text-brand-400',
                bg: 'bg-brand-500/10 border-brand-500/20 shadow-brand-500/5'
            },
            {
                title: 'Total Revenue Processed',
                value: this.formatCurrency(this.metrics.total_revenue),
                icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
                trend: 'All time',
                color: 'text-emerald-400',
                bg: 'bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/5'
            },
            {
                title: 'Failure Rate',
                value: this.metrics.failure_rate.toString() + '%',
                icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2.25m0 2.25h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
                trend: 'Requires review',
                color: 'text-red-400',
                bg: 'bg-red-500/10 border-red-500/20 shadow-red-500/5'
            },
            {
                title: 'Avg Processing Time',
                value: this.metrics.avg_processing_time.toString() + 's',
                icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>',
                trend: 'System performance',
                color: 'text-amber-400',
                bg: 'bg-amber-500/10 border-amber-500/20 shadow-amber-500/5'
            }
        ];

        this.container.innerHTML = cards.map(c => `
            <div class="panel p-5 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 shadow-lg ${c.bg.split(' ').pop()} hover:shadow-xl">
                <div class="flex items-start justify-between">
                    <div>
                        <p class="text-xs font-medium text-dark-muted mb-1">${c.title}</p>
                        <h4 class="text-2xl font-bold text-white tracking-tight">${c.value}</h4>
                    </div>
                    <div class="w-10 h-10 rounded-xl ${c.bg} border flex items-center justify-center">
                        <svg class="w-5 h-5 ${c.color}" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">${c.icon}</svg>
                    </div>
                </div>
                <div class="mt-4 flex items-center text-xs text-dark-muted">
                    <span>${c.trend}</span>
                </div>
            </div>
        `).join('');
    }
};
