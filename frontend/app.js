/**
 * app.js - Main entry point that coordinates components layer.
 */

const App = {
    init() {
        // Initialize Components
        DashboardCards.init();
        UploadComponent.init();
        TableComponent.init();
        ActivityLog.init();

        // Initial Data Fetch
        this.refreshData();
        
        // Expose globally for HTML event handlers if needed
        window.App = this;

        // Auto-refresh data every 5 seconds
        setInterval(() => {
            this.refreshData();
        }, 5000);
    },

    async refreshData() {
        try {
            const [invoicesRes, analyticsRes] = await Promise.all([
                fetch('/api/invoices'),
                fetch('/api/analytics')
            ]);
            
            const invoicesJson = await invoicesRes.json();
            const analyticsJson = await analyticsRes.json();
            
            const records = invoicesJson.data || [];
            const analytics = analyticsJson.data || {};
            
            // Calculate if there are new records to log
            if (this._lastRecordsLength !== undefined && records.length > this._lastRecordsLength) {
                const newRecords = records.slice(this._lastRecordsLength);
                newRecords.forEach(r => {
                    // Only log newly detected files automatically if they weren't manually uploaded
                    if (!r.file_name.includes('manual_upload')) {
                        ActivityLog.addEntry(r.file_name, r.status);
                    }
                });
            }
            this._lastRecordsLength = records.length;

            // Update Components
            DashboardCards.updateAnalytics(analytics);
            TableComponent.updateData(records);
            
        } catch (err) {
            console.error('Failed to fetch dashboard data:', err);
        }
    },

    logActivity(fileName, status) {
        ActivityLog.addEntry(fileName, status);
    }
};

// Global exportCSV for HTML button
window.exportCSV = function() {
    window.location.href = '/api/export';
};

// Application Boot
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
