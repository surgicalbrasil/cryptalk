const { EventEmitter } = require('events');
const { DockerStats } = require('../health-checks/docker-stats');

class MetricsCollector extends EventEmitter {
    constructor() {
        super();
        this.metrics = new Map();
        this.histograms = new Map();
        this.counters = new Map();
        this.gauges = new Map();
        this.dockerStats = new DockerStats();
        
        // Initialize metric collections
        this.initializeMetrics();
        
        // Start collection intervals
        this.startCollection();
    }

    initializeMetrics() {
        // System metrics
        this.registerGauge('system_cpu_usage', 'System CPU usage percentage');
        this.registerGauge('system_memory_usage', 'System memory usage percentage');
        this.registerGauge('system_disk_usage', 'System disk usage percentage');
        this.registerGauge('system_load_average', 'System load average');
        
        // Container metrics
        this.registerGauge('container_cpu_usage', 'Container CPU usage percentage', ['container_name']);
        this.registerGauge('container_memory_usage', 'Container memory usage percentage', ['container_name']);
        this.registerGauge('container_memory_bytes', 'Container memory usage in bytes', ['container_name']);
        this.registerGauge('container_network_rx_bytes', 'Container network received bytes', ['container_name']);
        this.registerGauge('container_network_tx_bytes', 'Container network transmitted bytes', ['container_name']);
        this.registerGauge('container_block_read_bytes', 'Container block device read bytes', ['container_name']);
        this.registerGauge('container_block_write_bytes', 'Container block device write bytes', ['container_name']);
        this.registerGauge('container_restart_count', 'Container restart count', ['container_name']);
        this.registerGauge('container_uptime_seconds', 'Container uptime in seconds', ['container_name']);
        
        // Application metrics
        this.registerCounter('health_check_total', 'Total health checks performed', ['check_name', 'status']);
        this.registerHistogram('health_check_duration_seconds', 'Health check duration in seconds', ['check_name']);
        this.registerCounter('alert_total', 'Total alerts sent', ['service', 'severity']);
        this.registerGauge('alert_active_count', 'Number of active alerts');
        
        // Service-specific metrics
        this.registerGauge('redis_connected_clients', 'Number of connected Redis clients');
        this.registerGauge('redis_memory_usage_bytes', 'Redis memory usage in bytes');
        this.registerGauge('postgres_connections', 'Number of PostgreSQL connections');
        this.registerGauge('postgres_database_size_bytes', 'PostgreSQL database size in bytes');
        this.registerGauge('nginx_active_connections', 'Number of active Nginx connections');
        this.registerGauge('nginx_requests_total', 'Total number of Nginx requests');
        this.registerGauge('elasticsearch_cluster_health', 'Elasticsearch cluster health status');
        this.registerGauge('elasticsearch_nodes_count', 'Number of Elasticsearch nodes');
        this.registerGauge('elasticsearch_shards_count', 'Number of Elasticsearch shards');
        
        // Performance metrics
        this.registerHistogram('http_request_duration_seconds', 'HTTP request duration', ['method', 'route', 'status_code']);
        this.registerCounter('http_requests_total', 'Total HTTP requests', ['method', 'route', 'status_code']);
        this.registerGauge('http_request_rate', 'HTTP request rate per second');
        this.registerGauge('error_rate', 'Error rate percentage');
        
        // Business metrics
        this.registerCounter('user_sessions_total', 'Total user sessions');
        this.registerGauge('active_users', 'Number of active users');
        this.registerCounter('documents_processed_total', 'Total documents processed');
        this.registerGauge('queue_length', 'Queue length', ['queue_name']);
    }

    registerGauge(name, description, labels = []) {
        this.gauges.set(name, {
            name,
            description,
            labels,
            values: new Map()
        });
    }

    registerCounter(name, description, labels = []) {
        this.counters.set(name, {
            name,
            description,
            labels,
            values: new Map()
        });
    }

    registerHistogram(name, description, labels = [], buckets = [0.1, 0.5, 1, 2, 5, 10, 30, 60]) {
        this.histograms.set(name, {
            name,
            description,
            labels,
            buckets,
            values: new Map()
        });
    }

    setGauge(name, value, labels = {}) {
        const gauge = this.gauges.get(name);
        if (!gauge) {
            console.warn(`Gauge ${name} not found`);
            return;
        }

        const labelKey = this.createLabelKey(labels);
        gauge.values.set(labelKey, {
            value,
            labels,
            timestamp: Date.now()
        });
    }

    incrementCounter(name, labels = {}, value = 1) {
        const counter = this.counters.get(name);
        if (!counter) {
            console.warn(`Counter ${name} not found`);
            return;
        }

        const labelKey = this.createLabelKey(labels);
        const current = counter.values.get(labelKey) || { value: 0, labels, timestamp: Date.now() };
        
        counter.values.set(labelKey, {
            value: current.value + value,
            labels,
            timestamp: Date.now()
        });
    }

    observeHistogram(name, value, labels = {}) {
        const histogram = this.histograms.get(name);
        if (!histogram) {
            console.warn(`Histogram ${name} not found`);
            return;
        }

        const labelKey = this.createLabelKey(labels);
        const current = histogram.values.get(labelKey) || {
            buckets: new Map(),
            sum: 0,
            count: 0,
            labels,
            timestamp: Date.now()
        };

        // Update buckets
        for (const bucket of histogram.buckets) {
            if (value <= bucket) {
                const currentBucketValue = current.buckets.get(bucket) || 0;
                current.buckets.set(bucket, currentBucketValue + 1);
            }
        }

        // Update sum and count
        current.sum += value;
        current.count += 1;
        current.timestamp = Date.now();

        histogram.values.set(labelKey, current);
    }

    createLabelKey(labels) {
        return JSON.stringify(labels);
    }

    startCollection() {
        // Collect system metrics every 30 seconds
        setInterval(() => {
            this.collectSystemMetrics();
        }, 30000);

        // Collect container metrics every 15 seconds
        setInterval(() => {
            this.collectContainerMetrics();
        }, 15000);

        // Collect Docker system metrics every 60 seconds
        setInterval(() => {
            this.collectDockerSystemMetrics();
        }, 60000);

        // Calculate derived metrics every 30 seconds
        setInterval(() => {
            this.calculateDerivedMetrics();
        }, 30000);

        // Run initial collection
        this.collectSystemMetrics();
        this.collectContainerMetrics();
        this.collectDockerSystemMetrics();
    }

    async collectSystemMetrics() {
        try {
            // CPU metrics
            const cpuStats = await this.dockerStats.getSystemCPU();
            this.setGauge('system_cpu_usage', cpuStats.usage);
            this.setGauge('system_load_average', cpuStats.loadAverage[0]);

            // Memory metrics
            const memoryStats = await this.dockerStats.getSystemMemory();
            const memoryUsagePercent = (memoryStats.used / memoryStats.total) * 100;
            this.setGauge('system_memory_usage', memoryUsagePercent);

            // Disk metrics
            const diskUsage = await this.dockerStats.getDiskUsage();
            for (const mount of diskUsage) {
                this.setGauge('system_disk_usage', mount.usePercentage, { mount_point: mount.mountPoint });
            }
        } catch (error) {
            console.error('Error collecting system metrics:', error.message);
        }
    }

    async collectContainerMetrics() {
        try {
            const containerStats = await this.dockerStats.getAllContainerStats();
            
            for (const [containerName, stats] of Object.entries(containerStats)) {
                const labels = { container_name: containerName };
                
                // CPU metrics
                this.setGauge('container_cpu_usage', stats.cpu, labels);
                
                // Memory metrics
                this.setGauge('container_memory_usage', stats.memory.percentage, labels);
                this.setGauge('container_memory_bytes', stats.memory.used, labels);
                
                // Network metrics
                this.setGauge('container_network_rx_bytes', stats.network.rx, labels);
                this.setGauge('container_network_tx_bytes', stats.network.tx, labels);
                
                // Block I/O metrics
                this.setGauge('container_block_read_bytes', stats.blockIO.read, labels);
                this.setGauge('container_block_write_bytes', stats.blockIO.write, labels);
                
                // Container lifecycle metrics
                this.setGauge('container_restart_count', stats.restartCount, labels);
                this.setGauge('container_uptime_seconds', stats.uptime, labels);
            }
        } catch (error) {
            console.error('Error collecting container metrics:', error.message);
        }
    }

    async collectDockerSystemMetrics() {
        try {
            const systemInfo = await this.dockerStats.getDockerSystemInfo();
            
            // This would need to be implemented based on your Docker system info structure
            // For now, we'll just log that we're collecting this data
            console.log('Collecting Docker system metrics...');
        } catch (error) {
            console.error('Error collecting Docker system metrics:', error.message);
        }
    }

    calculateDerivedMetrics() {
        try {
            // Calculate HTTP request rate
            const httpRequestsCounter = this.counters.get('http_requests_total');
            if (httpRequestsCounter) {
                // This is a simplified calculation - in a real system you'd track time windows
                const totalRequests = Array.from(httpRequestsCounter.values.values())
                    .reduce((sum, entry) => sum + entry.value, 0);
                
                // Store the rate (this is simplified - normally you'd calculate per-second rate)
                this.setGauge('http_request_rate', totalRequests);
            }

            // Calculate error rate
            const errorCount = this.getCounterValue('http_requests_total', { status_code: '5xx' });
            const totalCount = this.getCounterValue('http_requests_total');
            
            if (totalCount > 0) {
                const errorRate = (errorCount / totalCount) * 100;
                this.setGauge('error_rate', errorRate);
            }

            // Calculate active alerts
            const alertCounter = this.counters.get('alert_total');
            if (alertCounter) {
                const activeAlerts = Array.from(alertCounter.values.values())
                    .filter(entry => Date.now() - entry.timestamp < 15 * 60 * 1000) // 15 minutes
                    .length;
                
                this.setGauge('alert_active_count', activeAlerts);
            }
        } catch (error) {
            console.error('Error calculating derived metrics:', error.message);
        }
    }

    getCounterValue(name, labels = {}) {
        const counter = this.counters.get(name);
        if (!counter) return 0;

        const labelKey = this.createLabelKey(labels);
        const entry = counter.values.get(labelKey);
        return entry ? entry.value : 0;
    }

    // Public methods for recording metrics
    recordHealthCheck(checkName, status, duration) {
        this.incrementCounter('health_check_total', { check_name: checkName, status });
        this.observeHistogram('health_check_duration_seconds', duration / 1000, { check_name: checkName });
    }

    recordAlert(service, severity) {
        this.incrementCounter('alert_total', { service, severity });
    }

    recordHttpRequest(method, route, statusCode, duration) {
        this.incrementCounter('http_requests_total', { method, route, status_code: statusCode });
        this.observeHistogram('http_request_duration_seconds', duration / 1000, { method, route, status_code: statusCode });
    }

    recordUserSession() {
        this.incrementCounter('user_sessions_total');
    }

    recordDocumentProcessed() {
        this.incrementCounter('documents_processed_total');
    }

    updateActiveUsers(count) {
        this.setGauge('active_users', count);
    }

    updateQueueLength(queueName, length) {
        this.setGauge('queue_length', length, { queue_name: queueName });
    }

    // Service-specific metric updates
    updateRedisMetrics(clients, memoryUsage) {
        this.setGauge('redis_connected_clients', clients);
        this.setGauge('redis_memory_usage_bytes', memoryUsage);
    }

    updatePostgresMetrics(connections, dbSize) {
        this.setGauge('postgres_connections', connections);
        this.setGauge('postgres_database_size_bytes', dbSize);
    }

    updateNginxMetrics(activeConnections, totalRequests) {
        this.setGauge('nginx_active_connections', activeConnections);
        this.setGauge('nginx_requests_total', totalRequests);
    }

    updateElasticsearchMetrics(health, nodes, shards) {
        const healthValue = health === 'green' ? 1 : health === 'yellow' ? 0.5 : 0;
        this.setGauge('elasticsearch_cluster_health', healthValue);
        this.setGauge('elasticsearch_nodes_count', nodes);
        this.setGauge('elasticsearch_shards_count', shards);
    }

    // Export metrics in Prometheus format
    getPrometheusMetrics() {
        let output = '';

        // Export gauges
        for (const [name, gauge] of this.gauges) {
            output += `# HELP ${name} ${gauge.description}\n`;
            output += `# TYPE ${name} gauge\n`;
            
            for (const [labelKey, entry] of gauge.values) {
                const labelString = this.formatLabels(entry.labels);
                output += `${name}${labelString} ${entry.value}\n`;
            }
        }

        // Export counters
        for (const [name, counter] of this.counters) {
            output += `# HELP ${name} ${counter.description}\n`;
            output += `# TYPE ${name} counter\n`;
            
            for (const [labelKey, entry] of counter.values) {
                const labelString = this.formatLabels(entry.labels);
                output += `${name}${labelString} ${entry.value}\n`;
            }
        }

        // Export histograms
        for (const [name, histogram] of this.histograms) {
            output += `# HELP ${name} ${histogram.description}\n`;
            output += `# TYPE ${name} histogram\n`;
            
            for (const [labelKey, entry] of histogram.values) {
                const labelString = this.formatLabels(entry.labels);
                
                // Export buckets
                for (const [bucket, count] of entry.buckets) {
                    const bucketLabels = { ...entry.labels, le: bucket };
                    const bucketLabelString = this.formatLabels(bucketLabels);
                    output += `${name}_bucket${bucketLabelString} ${count}\n`;
                }
                
                // Export sum and count
                output += `${name}_sum${labelString} ${entry.sum}\n`;
                output += `${name}_count${labelString} ${entry.count}\n`;
            }
        }

        return output;
    }

    formatLabels(labels) {
        if (!labels || Object.keys(labels).length === 0) {
            return '';
        }

        const labelPairs = Object.entries(labels)
            .map(([key, value]) => `${key}="${value}"`)
            .join(',');
        
        return `{${labelPairs}}`;
    }

    // Get metrics as JSON
    getMetricsJSON() {
        return {
            gauges: this.serializeMetrics(this.gauges),
            counters: this.serializeMetrics(this.counters),
            histograms: this.serializeMetrics(this.histograms),
            timestamp: new Date().toISOString()
        };
    }

    serializeMetrics(metricsMap) {
        const result = {};
        
        for (const [name, metric] of metricsMap) {
            result[name] = {
                description: metric.description,
                labels: metric.labels,
                values: Array.from(metric.values.entries()).map(([key, value]) => ({
                    labels: value.labels,
                    value: value.value || value,
                    timestamp: value.timestamp
                }))
            };
        }
        
        return result;
    }

    // Reset all metrics
    reset() {
        this.gauges.clear();
        this.counters.clear();
        this.histograms.clear();
        this.initializeMetrics();
    }

    // Get metric by name
    getMetric(name) {
        return this.gauges.get(name) || this.counters.get(name) || this.histograms.get(name);
    }

    // List all metric names
    listMetrics() {
        return {
            gauges: Array.from(this.gauges.keys()),
            counters: Array.from(this.counters.keys()),
            histograms: Array.from(this.histograms.keys())
        };
    }
}

module.exports = { MetricsCollector };