const express = require('express');
const promClient = require('prom-client');
const Docker = require('dockerode');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { EventEmitter } = require('events');

class HealthMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      port: options.port || 9090,
      interval: options.interval || 30000,
      thresholds: {
        memoryUsage: 80,
        diskUsage: 80,
        cpuUsage: 80,
        containerCount: 50,
        responseTime: 5000
      },
      ...options
    };
    
    this.docker = new Docker();
    this.app = express();
    this.metrics = this.initializeMetrics();
    this.healthStatus = 'healthy';
    this.lastCheck = null;
    this.alerts = [];
    
    this.initializeRoutes();
    this.startMonitoring();
  }

  initializeMetrics() {
    // Configurar registro de métricas
    const register = new promClient.Registry();
    
    // Métricas do sistema
    const systemMetrics = {
      memoryUsage: new promClient.Gauge({
        name: 'claude_memory_usage_percent',
        help: 'Percentage of memory usage',
        registers: [register]
      }),
      
      diskUsage: new promClient.Gauge({
        name: 'claude_disk_usage_percent',
        help: 'Percentage of disk usage',
        registers: [register]
      }),
      
      cpuUsage: new promClient.Gauge({
        name: 'claude_cpu_usage_percent',
        help: 'Percentage of CPU usage',
        registers: [register]
      }),
      
      containerCount: new promClient.Gauge({
        name: 'claude_container_count',
        help: 'Number of active containers',
        registers: [register]
      }),
      
      responseTime: new promClient.Histogram({
        name: 'claude_response_time_seconds',
        help: 'Response time in seconds',
        buckets: [0.1, 0.5, 1, 2, 5, 10],
        registers: [register]
      }),
      
      jobsProcessing: new promClient.Gauge({
        name: 'claude_jobs_processing',
        help: 'Number of jobs currently processing',
        registers: [register]
      }),
      
      jobsCompleted: new promClient.Counter({
        name: 'claude_jobs_completed_total',
        help: 'Total number of completed jobs',
        registers: [register]
      }),
      
      jobsFailed: new promClient.Counter({
        name: 'claude_jobs_failed_total',
        help: 'Total number of failed jobs',
        registers: [register]
      }),
      
      uploadedFiles: new promClient.Counter({
        name: 'claude_uploaded_files_total',
        help: 'Total number of uploaded files',
        registers: [register]
      }),
      
      uploadedBytes: new promClient.Counter({
        name: 'claude_uploaded_bytes_total',
        help: 'Total bytes uploaded',
        registers: [register]
      }),
      
      healthStatus: new promClient.Gauge({
        name: 'claude_health_status',
        help: 'Health status (1 = healthy, 0 = unhealthy)',
        registers: [register]
      })
    };

    // Métricas padrão do Node.js
    promClient.collectDefaultMetrics({ register });
    
    return { ...systemMetrics, register };
  }

  initializeRoutes() {
    // Endpoint de métricas para Prometheus
    this.app.get('/metrics', async (req, res) => {
      try {
        res.set('Content-Type', this.metrics.register.contentType);
        res.end(await this.metrics.register.metrics());
      } catch (error) {
        res.status(500).end(error.message);
      }
    });

    // Endpoint de health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: this.healthStatus,
        timestamp: new Date().toISOString(),
        lastCheck: this.lastCheck,
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    // Endpoint de health check detalhado
    this.app.get('/health/detailed', async (req, res) => {
      try {
        const health = await this.performHealthCheck();
        res.json(health);
      } catch (error) {
        res.status(500).json({
          status: 'error',
          error: error.message
        });
      }
    });

    // Endpoint de alertas
    this.app.get('/alerts', (req, res) => {
      res.json({
        alerts: this.alerts,
        count: this.alerts.length
      });
    });

    // Endpoint de informações do sistema
    this.app.get('/system', async (req, res) => {
      try {
        const systemInfo = await this.getSystemInfo();
        res.json(systemInfo);
      } catch (error) {
        res.status(500).json({
          error: error.message
        });
      }
    });
  }

  async performHealthCheck() {
    const checks = await Promise.allSettled([
      this.checkMemoryUsage(),
      this.checkDiskUsage(),
      this.checkCpuUsage(),
      this.checkContainerHealth(),
      this.checkServiceHealth(),
      this.checkDatabaseHealth()
    ]);

    const results = checks.map((check, index) => ({
      name: ['memory', 'disk', 'cpu', 'containers', 'service', 'database'][index],
      status: check.status === 'fulfilled' ? 'healthy' : 'unhealthy',
      value: check.status === 'fulfilled' ? check.value : null,
      error: check.status === 'rejected' ? check.reason.message : null
    }));

    const overallStatus = results.every(r => r.status === 'healthy') ? 'healthy' : 'unhealthy';
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: results
    };
  }

  async checkMemoryUsage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const usagePercent = (usedMemory / totalMemory) * 100;

    this.metrics.memoryUsage.set(usagePercent);

    if (usagePercent > this.options.thresholds.memoryUsage) {
      this.addAlert('high_memory_usage', `Memory usage is ${usagePercent.toFixed(2)}%`);
    }

    return {
      usagePercent: usagePercent.toFixed(2),
      usedMemory: Math.round(usedMemory / 1024 / 1024),
      totalMemory: Math.round(totalMemory / 1024 / 1024)
    };
  }

  async checkDiskUsage() {
    const stats = await fs.stat(process.cwd());
    const totalSpace = stats.size || 1000000000; // Default se não conseguir obter
    const usedSpace = await this.calculateDirectorySize(path.join(process.cwd(), 'uploads'));
    const usagePercent = (usedSpace / totalSpace) * 100;

    this.metrics.diskUsage.set(usagePercent);

    if (usagePercent > this.options.thresholds.diskUsage) {
      this.addAlert('high_disk_usage', `Disk usage is ${usagePercent.toFixed(2)}%`);
    }

    return {
      usagePercent: usagePercent.toFixed(2),
      usedSpace: Math.round(usedSpace / 1024 / 1024),
      totalSpace: Math.round(totalSpace / 1024 / 1024)
    };
  }

  async checkCpuUsage() {
    const cpus = os.cpus();
    const usage = process.cpuUsage();
    const totalUsage = (usage.user + usage.system) / 1000000; // Convert to seconds
    const usagePercent = (totalUsage / (cpus.length * 1000)) * 100; // Rough estimate

    this.metrics.cpuUsage.set(usagePercent);

    if (usagePercent > this.options.thresholds.cpuUsage) {
      this.addAlert('high_cpu_usage', `CPU usage is ${usagePercent.toFixed(2)}%`);
    }

    return {
      usagePercent: usagePercent.toFixed(2),
      cores: cpus.length,
      model: cpus[0].model
    };
  }

  async checkContainerHealth() {
    try {
      const containers = await this.docker.listContainers({
        all: true,
        filters: { name: ['claude-user-'] }
      });

      const activeContainers = containers.filter(c => c.State === 'running');
      const failedContainers = containers.filter(c => c.State === 'exited');

      this.metrics.containerCount.set(activeContainers.length);

      if (activeContainers.length > this.options.thresholds.containerCount) {
        this.addAlert('high_container_count', `${activeContainers.length} containers running`);
      }

      if (failedContainers.length > 10) {
        this.addAlert('many_failed_containers', `${failedContainers.length} failed containers`);
      }

      return {
        total: containers.length,
        active: activeContainers.length,
        failed: failedContainers.length
      };
    } catch (error) {
      throw new Error(`Container health check failed: ${error.message}`);
    }
  }

  async checkServiceHealth() {
    const startTime = Date.now();
    
    try {
      const response = await fetch('http://localhost:3000/health', {
        timeout: this.options.thresholds.responseTime
      });
      
      const responseTime = Date.now() - startTime;
      this.metrics.responseTime.observe(responseTime / 1000);

      if (response.ok) {
        return {
          status: 'healthy',
          responseTime: responseTime
        };
      } else {
        throw new Error(`Service returned ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Service health check failed: ${error.message}`);
    }
  }

  async checkDatabaseHealth() {
    // Placeholder para verificação de banco de dados
    // Implementar se usando banco de dados
    return {
      status: 'not_configured'
    };
  }

  async getSystemInfo() {
    return {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      uptime: os.uptime(),
      loadAverage: os.loadavg(),
      nodeVersion: process.version,
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem()
      },
      cpu: {
        count: os.cpus().length,
        model: os.cpus()[0].model
      }
    };
  }

  async calculateDirectorySize(dirPath) {
    if (!await fs.pathExists(dirPath)) return 0;

    let totalSize = 0;
    const files = await fs.readdir(dirPath);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = await fs.stat(filePath);

      if (stats.isDirectory()) {
        totalSize += await this.calculateDirectorySize(filePath);
      } else {
        totalSize += stats.size;
      }
    }

    return totalSize;
  }

  addAlert(type, message, severity = 'warning') {
    const alert = {
      id: Date.now().toString(),
      type,
      message,
      severity,
      timestamp: new Date().toISOString(),
      active: true
    };

    this.alerts.unshift(alert);
    
    // Manter apenas os últimos 100 alertas
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(0, 100);
    }

    // Emitir evento de alerta
    this.emit('alert', alert);

    console.log(`[ALERT] ${severity.toUpperCase()}: ${message}`);
  }

  clearOldAlerts() {
    const oneHourAgo = new Date(Date.now() - 3600000);
    this.alerts = this.alerts.filter(alert => 
      new Date(alert.timestamp) > oneHourAgo
    );
  }

  async startMonitoring() {
    console.log('Starting health monitoring...');
    
    // Verificação inicial
    await this.runHealthChecks();
    
    // Executar verificações periodicamente
    setInterval(async () => {
      await this.runHealthChecks();
      this.clearOldAlerts();
    }, this.options.interval);
  }

  async runHealthChecks() {
    try {
      const health = await this.performHealthCheck();
      this.healthStatus = health.status;
      this.lastCheck = health.timestamp;
      
      // Atualizar métrica de status
      this.metrics.healthStatus.set(health.status === 'healthy' ? 1 : 0);
      
      // Emitir evento de status
      this.emit('health_check', health);
      
    } catch (error) {
      console.error('Health check failed:', error);
      this.healthStatus = 'unhealthy';
      this.addAlert('health_check_failed', error.message, 'error');
    }
  }

  // Métodos para atualizar métricas de aplicação
  recordJobCompleted() {
    this.metrics.jobsCompleted.inc();
  }

  recordJobFailed() {
    this.metrics.jobsFailed.inc();
  }

  recordFileUploaded(bytes) {
    this.metrics.uploadedFiles.inc();
    this.metrics.uploadedBytes.inc(bytes);
  }

  setJobsProcessing(count) {
    this.metrics.jobsProcessing.set(count);
  }

  start() {
    this.app.listen(this.options.port, () => {
      console.log(`Health monitor running on port ${this.options.port}`);
    });
  }
}

module.exports = HealthMonitor;