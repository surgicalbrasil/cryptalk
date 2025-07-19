const express = require('express');
const axios = require('axios');
const { promisify } = require('util');
const redis = require('redis');
const { Pool } = require('pg');
const { DockerStats } = require('./docker-stats');
const { AlertManager } = require('../alerts/alert-manager');
const { MetricsCollector } = require('../metrics/metrics-collector');

class HealthCheckManager {
    constructor(config) {
        this.config = config;
        this.checks = new Map();
        this.results = new Map();
        this.dockerStats = new DockerStats();
        this.alertManager = new AlertManager(config.alerts);
        this.metricsCollector = new MetricsCollector();
        
        // Initialize health check endpoints
        this.app = express();
        this.setupRoutes();
        
        // Initialize checks
        this.initializeChecks();
    }

    initializeChecks() {
        // Register standard health checks
        this.registerCheck('redis', this.checkRedis.bind(this));
        this.registerCheck('postgres', this.checkPostgres.bind(this));
        this.registerCheck('elasticsearch', this.checkElasticsearch.bind(this));
        this.registerCheck('nginx', this.checkNginx.bind(this));
        this.registerCheck('grafana', this.checkGrafana.bind(this));
        this.registerCheck('prometheus', this.checkPrometheus.bind(this));
        this.registerCheck('containers', this.checkContainers.bind(this));
        this.registerCheck('disk-space', this.checkDiskSpace.bind(this));
        this.registerCheck('memory', this.checkMemory.bind(this));
        this.registerCheck('cpu', this.checkCPU.bind(this));
    }

    registerCheck(name, checkFunction, options = {}) {
        this.checks.set(name, {
            name,
            function: checkFunction,
            interval: options.interval || 30000, // 30 seconds default
            timeout: options.timeout || 5000,    // 5 seconds default
            critical: options.critical || false,
            retries: options.retries || 3,
            lastCheck: null,
            consecutiveFailures: 0
        });
    }

    async checkRedis() {
        try {
            const client = redis.createClient({
                host: process.env.REDIS_HOST || 'redis',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD
            });

            const ping = promisify(client.ping).bind(client);
            const info = promisify(client.info).bind(client);

            await new Promise((resolve, reject) => {
                client.on('connect', resolve);
                client.on('error', reject);
            });

            const pingResult = await ping();
            const infoResult = await info();
            
            client.quit();

            // Parse Redis info
            const memoryUsed = infoResult.match(/used_memory_human:(.+)/)?.[1] || 'unknown';
            const connectedClients = infoResult.match(/connected_clients:(\d+)/)?.[1] || '0';

            return {
                status: 'healthy',
                details: {
                    ping: pingResult,
                    memoryUsed,
                    connectedClients: parseInt(connectedClients),
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    async checkPostgres() {
        try {
            const pool = new Pool({
                host: process.env.POSTGRES_HOST || 'postgres',
                port: process.env.POSTGRES_PORT || 5432,
                database: process.env.POSTGRES_DB || 'cryptalk',
                user: process.env.POSTGRES_USER || 'cryptalk_user',
                password: process.env.POSTGRES_PASSWORD
            });

            const client = await pool.connect();
            
            // Check basic connectivity
            const result = await client.query('SELECT NOW() as current_time, version() as version');
            
            // Check database statistics
            const stats = await client.query(`
                SELECT 
                    pg_database_size(current_database()) as db_size,
                    (SELECT count(*) FROM pg_stat_activity) as active_connections,
                    (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_queries
            `);

            client.release();
            await pool.end();

            return {
                status: 'healthy',
                details: {
                    currentTime: result.rows[0].current_time,
                    version: result.rows[0].version,
                    databaseSize: this.formatBytes(stats.rows[0].db_size),
                    activeConnections: parseInt(stats.rows[0].active_connections),
                    activeQueries: parseInt(stats.rows[0].active_queries),
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    async checkElasticsearch() {
        try {
            const response = await axios.get('http://elasticsearch:9200/_cluster/health', {
                timeout: 5000
            });

            const clusterHealth = response.data;
            
            // Get additional node statistics
            const nodesResponse = await axios.get('http://elasticsearch:9200/_nodes/stats');
            const nodesStats = nodesResponse.data;

            return {
                status: clusterHealth.status === 'green' ? 'healthy' : 
                        clusterHealth.status === 'yellow' ? 'warning' : 'unhealthy',
                details: {
                    clusterName: clusterHealth.cluster_name,
                    clusterStatus: clusterHealth.status,
                    numberOfNodes: clusterHealth.number_of_nodes,
                    numberOfDataNodes: clusterHealth.number_of_data_nodes,
                    activePrimaryShards: clusterHealth.active_primary_shards,
                    activeShards: clusterHealth.active_shards,
                    relocatingShards: clusterHealth.relocating_shards,
                    initializingShards: clusterHealth.initializing_shards,
                    unassignedShards: clusterHealth.unassigned_shards,
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    async checkNginx() {
        try {
            // Check Nginx status endpoint
            const response = await axios.get('http://nginx/nginx_status', {
                timeout: 5000
            });

            // Parse nginx status
            const statusText = response.data;
            const activeConnections = statusText.match(/Active connections: (\d+)/)?.[1];
            const acceptsHandledRequests = statusText.match(/(\d+)\s+(\d+)\s+(\d+)/);

            return {
                status: 'healthy',
                details: {
                    activeConnections: parseInt(activeConnections) || 0,
                    accepts: parseInt(acceptsHandledRequests?.[1]) || 0,
                    handled: parseInt(acceptsHandledRequests?.[2]) || 0,
                    requests: parseInt(acceptsHandledRequests?.[3]) || 0,
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            // Try basic health check
            try {
                await axios.get('http://nginx/health', { timeout: 5000 });
                return {
                    status: 'healthy',
                    details: {
                        message: 'Basic health check passed',
                        timestamp: new Date().toISOString()
                    }
                };
            } catch (healthError) {
                return {
                    status: 'unhealthy',
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
            }
        }
    }

    async checkGrafana() {
        try {
            const response = await axios.get('http://grafana:3000/api/health', {
                timeout: 5000
            });

            return {
                status: response.data.database === 'ok' ? 'healthy' : 'unhealthy',
                details: {
                    database: response.data.database,
                    version: response.data.version,
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    async checkPrometheus() {
        try {
            const response = await axios.get('http://prometheus:9090/-/healthy', {
                timeout: 5000
            });

            // Get additional Prometheus metrics
            const targetsResponse = await axios.get('http://prometheus:9090/api/v1/targets');
            const targets = targetsResponse.data.data;

            const activeTargets = targets.activeTargets || [];
            const healthyTargets = activeTargets.filter(t => t.health === 'up').length;

            return {
                status: response.status === 200 ? 'healthy' : 'unhealthy',
                details: {
                    totalTargets: activeTargets.length,
                    healthyTargets,
                    unhealthyTargets: activeTargets.length - healthyTargets,
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    async checkContainers() {
        try {
            const stats = await this.dockerStats.getAllContainerStats();
            const unhealthyContainers = [];
            const containerMetrics = [];

            for (const [containerName, containerStats] of Object.entries(stats)) {
                const metrics = {
                    name: containerName,
                    status: containerStats.status,
                    cpu: containerStats.cpu,
                    memory: containerStats.memory,
                    network: containerStats.network,
                    restartCount: containerStats.restartCount
                };

                containerMetrics.push(metrics);

                // Check for unhealthy conditions
                if (containerStats.status !== 'running' || 
                    containerStats.restartCount > 5 ||
                    containerStats.cpu > 80 ||
                    containerStats.memory.percentage > 85) {
                    unhealthyContainers.push({
                        name: containerName,
                        issues: this.identifyContainerIssues(containerStats)
                    });
                }
            }

            return {
                status: unhealthyContainers.length === 0 ? 'healthy' : 'warning',
                details: {
                    totalContainers: containerMetrics.length,
                    runningContainers: containerMetrics.filter(c => c.status === 'running').length,
                    unhealthyContainers: unhealthyContainers.length,
                    containers: containerMetrics,
                    issues: unhealthyContainers,
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    async checkDiskSpace() {
        try {
            const diskUsage = await this.dockerStats.getDiskUsage();
            const criticalThreshold = 90;
            const warningThreshold = 80;

            const issues = [];
            for (const mount of diskUsage) {
                if (mount.usePercentage > criticalThreshold) {
                    issues.push({
                        mount: mount.mountPoint,
                        usage: mount.usePercentage,
                        severity: 'critical'
                    });
                } else if (mount.usePercentage > warningThreshold) {
                    issues.push({
                        mount: mount.mountPoint,
                        usage: mount.usePercentage,
                        severity: 'warning'
                    });
                }
            }

            return {
                status: issues.some(i => i.severity === 'critical') ? 'critical' :
                        issues.length > 0 ? 'warning' : 'healthy',
                details: {
                    mounts: diskUsage,
                    issues,
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    async checkMemory() {
        try {
            const memoryStats = await this.dockerStats.getSystemMemory();
            const usagePercentage = (memoryStats.used / memoryStats.total) * 100;

            return {
                status: usagePercentage > 90 ? 'critical' :
                        usagePercentage > 80 ? 'warning' : 'healthy',
                details: {
                    total: this.formatBytes(memoryStats.total),
                    used: this.formatBytes(memoryStats.used),
                    free: this.formatBytes(memoryStats.free),
                    available: this.formatBytes(memoryStats.available),
                    usagePercentage: usagePercentage.toFixed(2),
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    async checkCPU() {
        try {
            const cpuStats = await this.dockerStats.getSystemCPU();

            return {
                status: cpuStats.usage > 90 ? 'critical' :
                        cpuStats.usage > 80 ? 'warning' : 'healthy',
                details: {
                    cores: cpuStats.cores,
                    usage: cpuStats.usage.toFixed(2),
                    loadAverage: cpuStats.loadAverage,
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    identifyContainerIssues(stats) {
        const issues = [];
        
        if (stats.status !== 'running') {
            issues.push(`Container is ${stats.status}`);
        }
        if (stats.restartCount > 5) {
            issues.push(`High restart count: ${stats.restartCount}`);
        }
        if (stats.cpu > 80) {
            issues.push(`High CPU usage: ${stats.cpu}%`);
        }
        if (stats.memory.percentage > 85) {
            issues.push(`High memory usage: ${stats.memory.percentage}%`);
        }
        
        return issues;
    }

    async runCheck(checkName) {
        const check = this.checks.get(checkName);
        if (!check) {
            throw new Error(`Check ${checkName} not found`);
        }

        try {
            const startTime = Date.now();
            const result = await Promise.race([
                check.function(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Check timeout')), check.timeout)
                )
            ]);

            const duration = Date.now() - startTime;
            
            // Record metrics
            this.metricsCollector.recordHealthCheck(checkName, result.status, duration);

            // Update check status
            check.lastCheck = new Date();
            check.consecutiveFailures = result.status === 'unhealthy' ? 
                check.consecutiveFailures + 1 : 0;

            // Store result
            this.results.set(checkName, {
                ...result,
                duration,
                checkName
            });

            // Handle alerts
            if (result.status === 'unhealthy' || result.status === 'critical') {
                await this.handleUnhealthyCheck(check, result);
            }

            return result;
        } catch (error) {
            const result = {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };

            check.consecutiveFailures++;
            this.results.set(checkName, result);
            
            await this.handleUnhealthyCheck(check, result);
            
            return result;
        }
    }

    async handleUnhealthyCheck(check, result) {
        // Send alert if threshold is reached
        if (check.consecutiveFailures >= check.retries) {
            await this.alertManager.sendAlert({
                severity: check.critical ? 'critical' : 'warning',
                service: check.name,
                message: `Health check failed: ${check.name}`,
                details: result,
                consecutiveFailures: check.consecutiveFailures
            });
        }
    }

    async runAllChecks() {
        const results = await Promise.allSettled(
            Array.from(this.checks.keys()).map(name => this.runCheck(name))
        );

        return results.map((result, index) => ({
            checkName: Array.from(this.checks.keys())[index],
            ...(result.status === 'fulfilled' ? result.value : { 
                status: 'error', 
                error: result.reason.message 
            })
        }));
    }

    startScheduledChecks() {
        // Run checks based on their intervals
        for (const [name, check] of this.checks) {
            setInterval(() => {
                this.runCheck(name).catch(error => {
                    console.error(`Error running check ${name}:`, error);
                });
            }, check.interval);
        }

        // Run all checks immediately
        this.runAllChecks();
    }

    setupRoutes() {
        // Overall health endpoint
        this.app.get('/health', async (req, res) => {
            const results = await this.runAllChecks();
            const overallStatus = this.calculateOverallStatus(results);

            res.status(overallStatus === 'healthy' ? 200 : 503).json({
                status: overallStatus,
                timestamp: new Date().toISOString(),
                checks: results
            });
        });

        // Individual check endpoint
        this.app.get('/health/:check', async (req, res) => {
            try {
                const result = await this.runCheck(req.params.check);
                res.status(result.status === 'healthy' ? 200 : 503).json(result);
            } catch (error) {
                res.status(404).json({
                    error: error.message
                });
            }
        });

        // Get all stored results
        this.app.get('/health/results/all', (req, res) => {
            const results = {};
            for (const [name, result] of this.results) {
                results[name] = result;
            }
            res.json(results);
        });

        // Metrics endpoint for Prometheus
        this.app.get('/metrics', (req, res) => {
            res.set('Content-Type', 'text/plain');
            res.send(this.metricsCollector.getPrometheusMetrics());
        });
    }

    calculateOverallStatus(results) {
        const statuses = results.map(r => r.status);
        
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

    formatBytes(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 Bytes';
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    }

    listen(port = 3002) {
        this.app.listen(port, () => {
            console.log(`Health check manager listening on port ${port}`);
            this.startScheduledChecks();
        });
    }
}

module.exports = { HealthCheckManager };