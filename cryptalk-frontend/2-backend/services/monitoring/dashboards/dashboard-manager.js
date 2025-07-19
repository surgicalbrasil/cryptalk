const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { MetricsCollector } = require('../metrics/metrics-collector');
const { HealthCheckManager } = require('../health-checks/health-check-manager');
const { AlertManager } = require('../alerts/alert-manager');

class DashboardManager {
    constructor(config) {
        this.config = config;
        this.app = express();
        this.metricsCollector = new MetricsCollector();
        this.healthCheckManager = new HealthCheckManager(config);
        this.alertManager = new AlertManager(config.alerts);
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupStaticFiles();
    }

    setupMiddleware() {
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        
        // CORS middleware
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
            
            if (req.method === 'OPTIONS') {
                res.sendStatus(200);
            } else {
                next();
            }
        });
    }

    setupStaticFiles() {
        // Serve static dashboard files
        this.app.use('/static', express.static(path.join(__dirname, 'static')));
    }

    setupRoutes() {
        // Main dashboard route
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'static', 'index.html'));
        });

        // API routes
        this.app.get('/api/health', async (req, res) => {
            try {
                const healthData = await this.getHealthData();
                res.json(healthData);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/metrics', async (req, res) => {
            try {
                const metricsData = await this.getMetricsData();
                res.json(metricsData);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/alerts', async (req, res) => {
            try {
                const alertsData = await this.getAlertsData();
                res.json(alertsData);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/containers', async (req, res) => {
            try {
                const containersData = await this.getContainersData();
                res.json(containersData);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/system', async (req, res) => {
            try {
                const systemData = await this.getSystemData();
                res.json(systemData);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/logs', async (req, res) => {
            try {
                const logsData = await this.getLogsData(req.query);
                res.json(logsData);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Alert management routes
        this.app.post('/api/alerts/suppress', async (req, res) => {
            try {
                const { alertKey, duration } = req.body;
                this.alertManager.suppressAlert(alertKey, duration);
                res.json({ success: true });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.post('/api/alerts/unsuppress', async (req, res) => {
            try {
                const { alertKey } = req.body;
                this.alertManager.unsuppressAlert(alertKey);
                res.json({ success: true });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Health check management routes
        this.app.post('/api/health/check/:checkName', async (req, res) => {
            try {
                const result = await this.healthCheckManager.runCheck(req.params.checkName);
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Dashboard configuration routes
        this.app.get('/api/dashboard/config', async (req, res) => {
            try {
                const config = await this.getDashboardConfig();
                res.json(config);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.put('/api/dashboard/config', async (req, res) => {
            try {
                await this.updateDashboardConfig(req.body);
                res.json({ success: true });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // WebSocket endpoint for real-time updates
        this.app.get('/api/stream', (req, res) => {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Cache-Control'
            });

            const clientId = Date.now();
            
            const sendData = async () => {
                try {
                    const data = await this.getRealtimeData();
                    res.write(`data: ${JSON.stringify(data)}\n\n`);
                } catch (error) {
                    console.error('Error sending realtime data:', error);
                }
            };

            // Send initial data
            sendData();

            // Send updates every 5 seconds
            const interval = setInterval(sendData, 5000);

            // Clean up on client disconnect
            req.on('close', () => {
                clearInterval(interval);
            });
        });

        // Export routes
        this.app.get('/api/export/metrics', async (req, res) => {
            try {
                const format = req.query.format || 'json';
                const metrics = await this.exportMetrics(format);
                
                if (format === 'csv') {
                    res.setHeader('Content-Type', 'text/csv');
                    res.setHeader('Content-Disposition', 'attachment; filename="metrics.csv"');
                } else {
                    res.setHeader('Content-Type', 'application/json');
                    res.setHeader('Content-Disposition', 'attachment; filename="metrics.json"');
                }
                
                res.send(metrics);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Status page route
        this.app.get('/status', async (req, res) => {
            try {
                const statusData = await this.getStatusPageData();
                res.json(statusData);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }

    async getHealthData() {
        const healthResults = await this.healthCheckManager.runAllChecks();
        const overallStatus = this.calculateOverallStatus(healthResults);
        
        return {
            overallStatus,
            checks: healthResults,
            timestamp: new Date().toISOString()
        };
    }

    async getMetricsData() {
        const metricsJSON = this.metricsCollector.getMetricsJSON();
        
        // Add calculated metrics
        const calculatedMetrics = await this.calculateAdditionalMetrics();
        
        return {
            ...metricsJSON,
            calculated: calculatedMetrics
        };
    }

    async getAlertsData() {
        const activeAlerts = this.alertManager.getActiveAlerts();
        const alertStats = this.alertManager.getAlertStats();
        const alertHistory = this.alertManager.getAllAlertHistory();
        
        return {
            active: activeAlerts,
            stats: alertStats,
            history: alertHistory,
            timestamp: new Date().toISOString()
        };
    }

    async getContainersData() {
        const dockerStats = this.healthCheckManager.dockerStats;
        const containerStats = await dockerStats.getAllContainerStats();
        
        return {
            containers: containerStats,
            summary: this.calculateContainerSummary(containerStats),
            timestamp: new Date().toISOString()
        };
    }

    async getSystemData() {
        const dockerStats = this.healthCheckManager.dockerStats;
        
        const [cpuStats, memoryStats, diskUsage] = await Promise.all([
            dockerStats.getSystemCPU(),
            dockerStats.getSystemMemory(),
            dockerStats.getDiskUsage()
        ]);
        
        return {
            cpu: cpuStats,
            memory: memoryStats,
            disk: diskUsage,
            timestamp: new Date().toISOString()
        };
    }

    async getLogsData(query) {
        // This would integrate with your logging system (ELK stack, etc.)
        // For now, return mock data
        return {
            logs: [
                {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    service: 'nginx',
                    message: 'Request processed successfully'
                },
                {
                    timestamp: new Date().toISOString(),
                    level: 'warning',
                    service: 'redis',
                    message: 'High memory usage detected'
                }
            ],
            total: 2,
            query: query
        };
    }

    async getRealtimeData() {
        const [health, metrics, alerts, containers, system] = await Promise.all([
            this.getHealthData(),
            this.getMetricsData(),
            this.getAlertsData(),
            this.getContainersData(),
            this.getSystemData()
        ]);

        return {
            health,
            metrics,
            alerts,
            containers,
            system,
            timestamp: new Date().toISOString()
        };
    }

    async getDashboardConfig() {
        try {
            const configPath = path.join(__dirname, 'config', 'dashboard-config.json');
            const configData = await fs.readFile(configPath, 'utf8');
            return JSON.parse(configData);
        } catch (error) {
            // Return default config if file doesn't exist
            return this.getDefaultDashboardConfig();
        }
    }

    async updateDashboardConfig(config) {
        const configPath = path.join(__dirname, 'config', 'dashboard-config.json');
        
        // Ensure config directory exists
        await fs.mkdir(path.dirname(configPath), { recursive: true });
        
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    }

    getDefaultDashboardConfig() {
        return {
            title: 'CrysTalk Monitoring Dashboard',
            theme: 'dark',
            refreshInterval: 5000,
            widgets: [
                {
                    id: 'system-overview',
                    type: 'system-overview',
                    title: 'System Overview',
                    size: 'large',
                    position: { x: 0, y: 0 }
                },
                {
                    id: 'container-status',
                    type: 'container-status',
                    title: 'Container Status',
                    size: 'medium',
                    position: { x: 1, y: 0 }
                },
                {
                    id: 'alerts-summary',
                    type: 'alerts-summary',
                    title: 'Active Alerts',
                    size: 'medium',
                    position: { x: 0, y: 1 }
                },
                {
                    id: 'metrics-chart',
                    type: 'metrics-chart',
                    title: 'Performance Metrics',
                    size: 'large',
                    position: { x: 1, y: 1 }
                }
            ]
        };
    }

    async calculateAdditionalMetrics() {
        // Calculate metrics that aren't directly collected
        const now = Date.now();
        const oneHourAgo = now - (60 * 60 * 1000);
        
        // This would normally query your metrics storage for historical data
        return {
            uptimePercentage: 99.9,
            averageResponseTime: 250,
            errorRate: 0.1,
            totalRequests: 10000,
            activeUsers: 150,
            resourceUtilization: {
                cpu: 45,
                memory: 68,
                disk: 32
            }
        };
    }

    calculateContainerSummary(containerStats) {
        const containers = Object.values(containerStats);
        
        return {
            total: containers.length,
            running: containers.filter(c => c.status === 'running').length,
            stopped: containers.filter(c => c.status === 'exited').length,
            restarting: containers.filter(c => c.status === 'restarting').length,
            averageCpuUsage: containers.reduce((sum, c) => sum + c.cpu, 0) / containers.length,
            averageMemoryUsage: containers.reduce((sum, c) => sum + c.memory.percentage, 0) / containers.length,
            totalMemoryUsage: containers.reduce((sum, c) => sum + c.memory.used, 0),
            highResourceContainers: containers.filter(c => c.cpu > 80 || c.memory.percentage > 80).length
        };
    }

    calculateOverallStatus(healthResults) {
        const statuses = healthResults.map(r => r.status);
        
        if (statuses.includes('critical') || statuses.includes('error')) {
            return 'critical';
        }
        if (statuses.includes('unhealthy')) {
            return 'unhealthy';
        }
        if (statuses.includes('warning')) {
            return 'warning';
        }
        
        return 'healthy';
    }

    async exportMetrics(format) {
        const metrics = this.metricsCollector.getMetricsJSON();
        
        if (format === 'csv') {
            return this.convertMetricsToCSV(metrics);
        }
        
        return JSON.stringify(metrics, null, 2);
    }

    convertMetricsToCSV(metrics) {
        const rows = [];
        rows.push(['timestamp', 'type', 'name', 'labels', 'value']);
        
        for (const [type, typeMetrics] of Object.entries(metrics)) {
            if (type === 'timestamp') continue;
            
            for (const [name, metric] of Object.entries(typeMetrics)) {
                for (const valueEntry of metric.values) {
                    rows.push([
                        metrics.timestamp,
                        type,
                        name,
                        JSON.stringify(valueEntry.labels),
                        valueEntry.value
                    ]);
                }
            }
        }
        
        return rows.map(row => row.join(',')).join('\n');
    }

    async getStatusPageData() {
        const [health, alerts, containers] = await Promise.all([
            this.getHealthData(),
            this.getAlertsData(),
            this.getContainersData()
        ]);

        // Generate status page data
        const services = [
            { name: 'Web Application', status: health.overallStatus },
            { name: 'Database', status: this.getServiceStatus(health.checks, 'postgres') },
            { name: 'Cache', status: this.getServiceStatus(health.checks, 'redis') },
            { name: 'Search', status: this.getServiceStatus(health.checks, 'elasticsearch') },
            { name: 'Monitoring', status: this.getServiceStatus(health.checks, 'prometheus') }
        ];

        return {
            overallStatus: health.overallStatus,
            services,
            activeIncidents: alerts.active,
            lastUpdate: new Date().toISOString(),
            uptime: '99.9%',
            responseTime: '250ms'
        };
    }

    getServiceStatus(checks, serviceName) {
        const check = checks.find(c => c.checkName === serviceName);
        return check ? check.status : 'unknown';
    }

    listen(port = 3003) {
        this.app.listen(port, () => {
            console.log(`Dashboard manager listening on port ${port}`);
        });
    }
}

module.exports = { DashboardManager };