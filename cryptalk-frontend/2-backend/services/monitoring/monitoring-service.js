const express = require('express');
const cors = require('cors');
const { HealthCheckManager } = require('./health-checks/health-check-manager');
const { AlertManager } = require('./alerts/alert-manager');
const { MetricsCollector } = require('./metrics/metrics-collector');
const { DashboardManager } = require('./dashboards/dashboard-manager');

class MonitoringService {
    constructor(config) {
        this.config = config || this.getDefaultConfig();
        this.app = express();
        
        // Initialize components
        this.healthCheckManager = new HealthCheckManager(this.config);
        this.alertManager = new AlertManager(this.config.alerts);
        this.metricsCollector = new MetricsCollector();
        this.dashboardManager = new DashboardManager(this.config);
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    getDefaultConfig() {
        return {
            port: process.env.MONITORING_PORT || 3003,
            
            // Health check configuration
            healthChecks: {
                interval: 30000, // 30 seconds
                timeout: 5000,   // 5 seconds
                retries: 3
            },
            
            // Alert configuration
            alerts: {
                email: {
                    enabled: process.env.ALERT_EMAIL_ENABLED === 'true',
                    smtp: {
                        host: process.env.SMTP_HOST,
                        port: parseInt(process.env.SMTP_PORT) || 587,
                        secure: process.env.SMTP_SECURE === 'true',
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS
                    },
                    from: process.env.ALERT_EMAIL_FROM,
                    to: process.env.ALERT_EMAIL_TO
                },
                slack: {
                    enabled: process.env.ALERT_SLACK_ENABLED === 'true',
                    webhook: process.env.SLACK_WEBHOOK_URL,
                    channel: process.env.SLACK_CHANNEL || '#alerts',
                    username: process.env.SLACK_USERNAME || 'CrysTalk Monitor'
                },
                webhook: {
                    enabled: process.env.ALERT_WEBHOOK_ENABLED === 'true',
                    url: process.env.ALERT_WEBHOOK_URL,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': process.env.ALERT_WEBHOOK_TOKEN
                    }
                },
                teams: {
                    enabled: process.env.ALERT_TEAMS_ENABLED === 'true',
                    webhook: process.env.TEAMS_WEBHOOK_URL
                }
            },
            
            // Metrics configuration
            metrics: {
                retention: '30d',
                scrapeInterval: 15000, // 15 seconds
                batchSize: 100
            },
            
            // Dashboard configuration
            dashboard: {
                enabled: true,
                autoRefresh: true,
                refreshInterval: 30000
            },
            
            // Database configuration
            database: {
                host: process.env.POSTGRES_HOST || 'postgres',
                port: parseInt(process.env.POSTGRES_PORT) || 5432,
                database: process.env.POSTGRES_DB || 'cryptalk',
                user: process.env.POSTGRES_USER || 'cryptalk_user',
                password: process.env.POSTGRES_PASSWORD
            },
            
            // Redis configuration
            redis: {
                host: process.env.REDIS_HOST || 'redis',
                port: parseInt(process.env.REDIS_PORT) || 6379,
                password: process.env.REDIS_PASSWORD
            },
            
            // Service endpoints
            services: {
                elasticsearch: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200',
                grafana: process.env.GRAFANA_URL || 'http://grafana:3000',
                prometheus: process.env.PROMETHEUS_URL || 'http://prometheus:9090',
                nginx: process.env.NGINX_URL || 'http://nginx'
            }
        };
    }

    setupMiddleware() {
        // Basic middleware
        this.app.use(cors());
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
        
        // Request logging
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
            next();
        });
        
        // Security headers
        this.app.use((req, res, next) => {
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            next();
        });
    }

    setupRoutes() {
        // Health check routes
        this.app.get('/health', async (req, res) => {
            try {
                const result = await this.healthCheckManager.runAllChecks();
                const overallStatus = this.calculateOverallStatus(result);
                
                res.status(overallStatus === 'healthy' ? 200 : 503).json({
                    status: overallStatus,
                    timestamp: new Date().toISOString(),
                    checks: result
                });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/health/:checkName', async (req, res) => {
            try {
                const result = await this.healthCheckManager.runCheck(req.params.checkName);
                res.status(result.status === 'healthy' ? 200 : 503).json(result);
            } catch (error) {
                res.status(404).json({ error: error.message });
            }
        });

        // Metrics routes
        this.app.get('/metrics', (req, res) => {
            res.set('Content-Type', 'text/plain');
            res.send(this.metricsCollector.getPrometheusMetrics());
        });

        this.app.get('/metrics/json', (req, res) => {
            res.json(this.metricsCollector.getMetricsJSON());
        });

        // Alert routes
        this.app.get('/alerts', (req, res) => {
            const alerts = this.alertManager.getActiveAlerts();
            const stats = this.alertManager.getAlertStats();
            
            res.json({
                active: alerts,
                stats: stats,
                timestamp: new Date().toISOString()
            });
        });

        this.app.post('/alerts/suppress', (req, res) => {
            const { alertKey, duration } = req.body;
            this.alertManager.suppressAlert(alertKey, duration);
            res.json({ success: true });
        });

        this.app.post('/alerts/unsuppress', (req, res) => {
            const { alertKey } = req.body;
            this.alertManager.unsuppressAlert(alertKey);
            res.json({ success: true });
        });

        // Dashboard routes (proxy to dashboard manager)
        this.app.use('/dashboard', this.dashboardManager.app);
        
        // API routes
        this.app.use('/api', this.createAPIRoutes());
        
        // Root redirect
        this.app.get('/', (req, res) => {
            res.redirect('/dashboard');
        });
    }

    createAPIRoutes() {
        const router = express.Router();
        
        // System information
        router.get('/info', (req, res) => {
            res.json({
                service: 'CrysTalk Monitoring Service',
                version: '1.0.0',
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                cpu: process.cpuUsage(),
                platform: process.platform,
                nodeVersion: process.version,
                timestamp: new Date().toISOString()
            });
        });
        
        // Container information
        router.get('/containers', async (req, res) => {
            try {
                const stats = await this.healthCheckManager.dockerStats.getAllContainerStats();
                res.json({
                    containers: stats,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        // System resources
        router.get('/system', async (req, res) => {
            try {
                const [cpu, memory, disk] = await Promise.all([
                    this.healthCheckManager.dockerStats.getSystemCPU(),
                    this.healthCheckManager.dockerStats.getSystemMemory(),
                    this.healthCheckManager.dockerStats.getDiskUsage()
                ]);
                
                res.json({
                    cpu,
                    memory,
                    disk,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        // Configuration
        router.get('/config', (req, res) => {
            // Return non-sensitive configuration
            const safeConfig = {
                healthChecks: this.config.healthChecks,
                metrics: this.config.metrics,
                dashboard: this.config.dashboard,
                alerts: {
                    email: { enabled: this.config.alerts.email.enabled },
                    slack: { enabled: this.config.alerts.slack.enabled },
                    webhook: { enabled: this.config.alerts.webhook.enabled },
                    teams: { enabled: this.config.alerts.teams.enabled }
                }
            };
            
            res.json(safeConfig);
        });
        
        // Manual operations
        router.post('/operations/restart-check', async (req, res) => {
            try {
                const { checkName } = req.body;
                const result = await this.healthCheckManager.runCheck(checkName);
                res.json({ success: true, result });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        router.post('/operations/clear-metrics', (req, res) => {
            this.metricsCollector.reset();
            res.json({ success: true });
        });
        
        router.post('/operations/clear-alerts', (req, res) => {
            this.alertManager.clearAlertHistory();
            res.json({ success: true });
        });
        
        return router;
    }

    setupErrorHandling() {
        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({
                error: 'Not Found',
                message: `Cannot ${req.method} ${req.url}`,
                timestamp: new Date().toISOString()
            });
        });

        // Error handler
        this.app.use((error, req, res, next) => {
            console.error('Error:', error);
            
            res.status(error.status || 500).json({
                error: error.message || 'Internal Server Error',
                timestamp: new Date().toISOString(),
                ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
            });
        });
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

    async start() {
        try {
            // Start health checks
            this.healthCheckManager.startScheduledChecks();
            
            // Start metrics collection
            this.metricsCollector.startCollection();
            
            // Start the server
            const port = this.config.port;
            this.server = this.app.listen(port, () => {
                console.log(`🚀 Monitoring service started on port ${port}`);
                console.log(`📊 Dashboard available at: http://localhost:${port}/dashboard`);
                console.log(`🔍 Health checks available at: http://localhost:${port}/health`);
                console.log(`📈 Metrics available at: http://localhost:${port}/metrics`);
                console.log(`🚨 Alerts API available at: http://localhost:${port}/alerts`);
            });
            
            // Graceful shutdown
            process.on('SIGTERM', () => this.shutdown());
            process.on('SIGINT', () => this.shutdown());
            
        } catch (error) {
            console.error('Failed to start monitoring service:', error);
            process.exit(1);
        }
    }

    async shutdown() {
        console.log('Shutting down monitoring service...');
        
        try {
            // Stop health checks
            if (this.healthCheckManager) {
                // Stop any running intervals
                console.log('Stopping health checks...');
            }
            
            // Stop metrics collection
            if (this.metricsCollector) {
                console.log('Stopping metrics collection...');
            }
            
            // Close server
            if (this.server) {
                await new Promise((resolve) => {
                    this.server.close(resolve);
                });
                console.log('Server closed');
            }
            
            console.log('Monitoring service shut down successfully');
            process.exit(0);
            
        } catch (error) {
            console.error('Error during shutdown:', error);
            process.exit(1);
        }
    }
}

module.exports = { MonitoringService };

// Start the service if this file is run directly
if (require.main === module) {
    const service = new MonitoringService();
    service.start();
}