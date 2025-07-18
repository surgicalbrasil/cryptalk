// Dashboard JavaScript
class MonitoringDashboard {
    constructor() {
        this.charts = {};
        this.eventSource = null;
        this.autoRefresh = true;
        this.refreshInterval = 30000; // 30 seconds
        this.refreshTimer = null;
        
        this.initializeDashboard();
    }

    initializeDashboard() {
        this.setupEventSource();
        this.setupCharts();
        this.loadInitialData();
        this.startAutoRefresh();
    }

    setupEventSource() {
        if (this.eventSource) {
            this.eventSource.close();
        }

        this.eventSource = new EventSource('/api/stream');
        
        this.eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.updateDashboard(data);
            } catch (error) {
                console.error('Error parsing realtime data:', error);
            }
        };

        this.eventSource.onerror = (error) => {
            console.error('EventSource error:', error);
            // Reconnect after 5 seconds
            setTimeout(() => this.setupEventSource(), 5000);
        };
    }

    setupCharts() {
        // System Metrics Chart
        const systemCtx = document.getElementById('systemMetricsChart').getContext('2d');
        this.charts.systemMetrics = new Chart(systemCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'CPU Usage %',
                        data: [],
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        tension: 0.1
                    },
                    {
                        label: 'Memory Usage %',
                        data: [],
                        borderColor: 'rgb(54, 162, 235)',
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        tension: 0.1
                    },
                    {
                        label: 'Disk Usage %',
                        data: [],
                        borderColor: 'rgb(255, 205, 86)',
                        backgroundColor: 'rgba(255, 205, 86, 0.2)',
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'System Resource Usage',
                        color: '#fff'
                    },
                    legend: {
                        labels: {
                            color: '#fff'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            color: '#fff'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#fff'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });

        // Performance Chart
        const performanceCtx = document.getElementById('performanceChart').getContext('2d');
        this.charts.performance = new Chart(performanceCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Response Time (ms)',
                        data: [],
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        yAxisID: 'y'
                    },
                    {
                        label: 'Requests/sec',
                        data: [],
                        borderColor: 'rgb(153, 102, 255)',
                        backgroundColor: 'rgba(153, 102, 255, 0.2)',
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Application Performance',
                        color: '#fff'
                    },
                    legend: {
                        labels: {
                            color: '#fff'
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        ticks: {
                            color: '#fff'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        ticks: {
                            color: '#fff'
                        },
                        grid: {
                            drawOnChartArea: false,
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#fff'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });
    }

    async loadInitialData() {
        try {
            const [health, metrics, alerts, containers, system] = await Promise.all([
                this.fetchData('/api/health'),
                this.fetchData('/api/metrics'),
                this.fetchData('/api/alerts'),
                this.fetchData('/api/containers'),
                this.fetchData('/api/system')
            ]);

            this.updateDashboard({
                health,
                metrics,
                alerts,
                containers,
                system
            });
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    async fetchData(endpoint) {
        const response = await fetch(endpoint);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    }

    updateDashboard(data) {
        this.updateOverviewCards(data);
        this.updateHealthChecks(data.health);
        this.updateContainers(data.containers);
        this.updateAlerts(data.alerts);
        this.updateSystemMetrics(data.system);
        this.updatePerformanceChart(data.metrics);
        this.updateLogs(data.logs);
        this.updateLastUpdateTime();
    }

    updateOverviewCards(data) {
        // Overall Status
        const overallStatusEl = document.getElementById('overallStatus');
        const status = data.health?.overallStatus || 'unknown';
        overallStatusEl.className = `metric-value ${this.getStatusClass(status)}`;
        overallStatusEl.innerHTML = `<i class="fas ${this.getStatusIcon(status)}"></i>`;

        // Total Containers
        const totalContainers = data.containers?.summary?.total || 0;
        document.getElementById('totalContainers').textContent = totalContainers;

        // Active Alerts
        const activeAlerts = data.alerts?.active?.length || 0;
        document.getElementById('activeAlerts').textContent = activeAlerts;

        // Uptime
        const uptime = data.metrics?.calculated?.uptimePercentage || 0;
        document.getElementById('uptimePercentage').textContent = `${uptime.toFixed(1)}%`;
    }

    updateHealthChecks(health) {
        const container = document.getElementById('healthChecksList');
        if (!health || !health.checks) {
            container.innerHTML = '<div class="text-center text-muted">No health check data available</div>';
            return;
        }

        const html = health.checks.map(check => {
            const statusClass = this.getStatusClass(check.status);
            const statusIcon = this.getStatusIcon(check.status);
            
            return `
                <div class="d-flex align-items-center mb-3">
                    <span class="status-indicator status-${check.status}"></span>
                    <div class="flex-grow-1">
                        <div class="fw-bold">${check.checkName}</div>
                        <small class="text-muted">${check.message || 'No message'}</small>
                    </div>
                    <div class="text-end">
                        <i class="fas ${statusIcon} ${statusClass}"></i>
                        ${check.duration ? `<small class="d-block text-muted">${check.duration}ms</small>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    updateContainers(containers) {
        const container = document.getElementById('containersList');
        if (!containers || !containers.containers) {
            container.innerHTML = '<div class="text-center text-muted">No container data available</div>';
            return;
        }

        const html = Object.entries(containers.containers).map(([name, stats]) => {
            const statusClass = stats.status === 'running' ? 'container-running' : 
                               stats.status === 'exited' ? 'container-stopped' : 'container-restarting';
            
            return `
                <div class="container-item">
                    <div class="flex-grow-1">
                        <div class="fw-bold">${name}</div>
                        <small class="text-muted">
                            CPU: ${stats.cpu?.toFixed(1) || 0}% | 
                            Memory: ${stats.memory?.percentage?.toFixed(1) || 0}% |
                            Restarts: ${stats.restartCount || 0}
                        </small>
                    </div>
                    <span class="container-status ${statusClass}">
                        ${stats.status}
                    </span>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    updateAlerts(alerts) {
        const container = document.getElementById('alertsList');
        if (!alerts || !alerts.active || alerts.active.length === 0) {
            container.innerHTML = '<div class="text-center text-success">No active alerts</div>';
            return;
        }

        const html = alerts.active.map(alert => {
            const severityClass = alert.severity === 'critical' ? 'alert-item' : 'alert-item warning';
            
            return `
                <div class="${severityClass}">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <div class="fw-bold">${alert.service}</div>
                            <div class="small">${alert.message}</div>
                        </div>
                        <div class="text-end">
                            <span class="badge bg-${alert.severity === 'critical' ? 'danger' : 'warning'}">
                                ${alert.severity}
                            </span>
                            <div class="small text-muted mt-1">
                                ${this.formatTimeAgo(alert.timestamp)}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    updateSystemMetrics(system) {
        if (!system) return;

        // Update metric values
        if (system.cpu) {
            document.getElementById('cpuUsage').textContent = `${system.cpu.usage?.toFixed(1) || 0}%`;
        }

        if (system.memory) {
            const memoryPercent = (system.memory.used / system.memory.total) * 100;
            document.getElementById('memoryUsage').textContent = `${memoryPercent?.toFixed(1) || 0}%`;
        }

        if (system.disk && system.disk.length > 0) {
            const avgDiskUsage = system.disk.reduce((sum, disk) => sum + disk.usePercentage, 0) / system.disk.length;
            document.getElementById('diskUsage').textContent = `${avgDiskUsage?.toFixed(1) || 0}%`;
        }

        // Update chart
        this.updateSystemChart(system);
    }

    updateSystemChart(system) {
        const chart = this.charts.systemMetrics;
        if (!chart) return;

        const now = new Date();
        const timeLabel = now.toLocaleTimeString();

        // Add new data point
        chart.data.labels.push(timeLabel);
        
        if (system.cpu) {
            chart.data.datasets[0].data.push(system.cpu.usage || 0);
        }
        
        if (system.memory) {
            const memoryPercent = (system.memory.used / system.memory.total) * 100;
            chart.data.datasets[1].data.push(memoryPercent || 0);
        }
        
        if (system.disk && system.disk.length > 0) {
            const avgDiskUsage = system.disk.reduce((sum, disk) => sum + disk.usePercentage, 0) / system.disk.length;
            chart.data.datasets[2].data.push(avgDiskUsage || 0);
        }

        // Keep only last 20 data points
        const maxDataPoints = 20;
        if (chart.data.labels.length > maxDataPoints) {
            chart.data.labels.shift();
            chart.data.datasets.forEach(dataset => dataset.data.shift());
        }

        chart.update('none');
    }

    updatePerformanceChart(metrics) {
        const chart = this.charts.performance;
        if (!chart || !metrics) return;

        const now = new Date();
        const timeLabel = now.toLocaleTimeString();

        // Add new data point
        chart.data.labels.push(timeLabel);
        
        const responseTime = metrics.calculated?.averageResponseTime || 0;
        const requestRate = metrics.calculated?.requestRate || 0;
        
        chart.data.datasets[0].data.push(responseTime);
        chart.data.datasets[1].data.push(requestRate);

        // Keep only last 20 data points
        const maxDataPoints = 20;
        if (chart.data.labels.length > maxDataPoints) {
            chart.data.labels.shift();
            chart.data.datasets.forEach(dataset => dataset.data.shift());
        }

        chart.update('none');
    }

    updateLogs(logs) {
        const container = document.getElementById('logsList');
        if (!logs || !logs.logs || logs.logs.length === 0) {
            container.innerHTML = '<div class="text-center text-muted">No recent logs</div>';
            return;
        }

        const html = logs.logs.map(log => {
            const levelClass = `log-${log.level}`;
            const timestamp = new Date(log.timestamp).toLocaleTimeString();
            
            return `
                <div class="log-entry ${levelClass}">
                    <div class="d-flex justify-content-between">
                        <strong>${log.service}</strong>
                        <small>${timestamp}</small>
                    </div>
                    <div class="small">${log.message}</div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    updateLastUpdateTime() {
        const now = new Date();
        document.getElementById('lastUpdate').textContent = now.toLocaleTimeString();
    }

    getStatusClass(status) {
        switch (status) {
            case 'healthy': return 'text-success';
            case 'warning': return 'text-warning';
            case 'critical':
            case 'unhealthy': return 'text-danger';
            default: return 'text-muted';
        }
    }

    getStatusIcon(status) {
        switch (status) {
            case 'healthy': return 'fa-check-circle';
            case 'warning': return 'fa-exclamation-triangle';
            case 'critical':
            case 'unhealthy': return 'fa-times-circle';
            default: return 'fa-question-circle';
        }
    }

    formatTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diff = now - time;

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return `${seconds}s ago`;
    }

    startAutoRefresh() {
        if (this.autoRefresh) {
            this.refreshTimer = setInterval(() => {
                this.refreshDashboard();
            }, this.refreshInterval);
        }
    }

    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    async refreshDashboard() {
        const refreshIcon = document.getElementById('refreshIcon');
        refreshIcon.classList.add('refresh-indicator');
        
        try {
            await this.loadInitialData();
        } catch (error) {
            console.error('Error refreshing dashboard:', error);
        } finally {
            refreshIcon.classList.remove('refresh-indicator');
        }
    }

    toggleAutoRefresh() {
        this.autoRefresh = !this.autoRefresh;
        const statusEl = document.getElementById('autoRefreshStatus');
        
        if (this.autoRefresh) {
            statusEl.textContent = 'ON';
            this.startAutoRefresh();
        } else {
            statusEl.textContent = 'OFF';
            this.stopAutoRefresh();
        }
    }

    async exportMetrics() {
        try {
            const response = await fetch('/api/export/metrics?format=json');
            const data = await response.json();
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `metrics-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting metrics:', error);
        }
    }

    showSettings() {
        // This would open a settings modal
        alert('Settings panel would open here');
    }

    async refreshSystemMetrics() {
        try {
            const system = await this.fetchData('/api/system');
            this.updateSystemMetrics(system);
        } catch (error) {
            console.error('Error refreshing system metrics:', error);
        }
    }

    async refreshHealthChecks() {
        try {
            const health = await this.fetchData('/api/health');
            this.updateHealthChecks(health);
        } catch (error) {
            console.error('Error refreshing health checks:', error);
        }
    }

    async refreshContainers() {
        try {
            const containers = await this.fetchData('/api/containers');
            this.updateContainers(containers);
        } catch (error) {
            console.error('Error refreshing containers:', error);
        }
    }

    async refreshAlerts() {
        try {
            const alerts = await this.fetchData('/api/alerts');
            this.updateAlerts(alerts);
        } catch (error) {
            console.error('Error refreshing alerts:', error);
        }
    }

    async refreshLogs() {
        try {
            const logs = await this.fetchData('/api/logs');
            this.updateLogs(logs);
        } catch (error) {
            console.error('Error refreshing logs:', error);
        }
    }

    updatePerformanceChart() {
        const timeRange = document.getElementById('timeRange').value;
        // This would fetch data for the selected time range
        console.log('Updating performance chart for time range:', timeRange);
    }
}

// Global functions
let dashboard;

function refreshDashboard() {
    if (dashboard) {
        dashboard.refreshDashboard();
    }
}

function toggleAutoRefresh() {
    if (dashboard) {
        dashboard.toggleAutoRefresh();
    }
}

function exportMetrics() {
    if (dashboard) {
        dashboard.exportMetrics();
    }
}

function showSettings() {
    if (dashboard) {
        dashboard.showSettings();
    }
}

function refreshSystemMetrics() {
    if (dashboard) {
        dashboard.refreshSystemMetrics();
    }
}

function refreshHealthChecks() {
    if (dashboard) {
        dashboard.refreshHealthChecks();
    }
}

function refreshContainers() {
    if (dashboard) {
        dashboard.refreshContainers();
    }
}

function refreshAlerts() {
    if (dashboard) {
        dashboard.refreshAlerts();
    }
}

function refreshLogs() {
    if (dashboard) {
        dashboard.refreshLogs();
    }
}

function updatePerformanceChart() {
    if (dashboard) {
        dashboard.updatePerformanceChart();
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    dashboard = new MonitoringDashboard();
});