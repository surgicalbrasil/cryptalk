const http = require('http');
const fs = require('fs');
const path = require('path');

class HealthChecker {
  constructor() {
    this.checks = [
      this.checkServer.bind(this),
      this.checkDiskSpace.bind(this),
      this.checkMemory.bind(this),
      this.checkDirectories.bind(this),
      this.checkLogFiles.bind(this)
    ];
  }

  async checkServer() {
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: process.env.PORT || 3000,
        path: '/health',
        method: 'GET',
        timeout: 5000
      }, (res) => {
        if (res.statusCode === 200) {
          resolve({ name: 'server', status: 'healthy' });
        } else {
          reject(new Error(`Server returned ${res.statusCode}`));
        }
      });

      req.on('error', (error) => {
        reject(new Error(`Server check failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Server check timeout'));
      });

      req.end();
    });
  }

  async checkDiskSpace() {
    try {
      const stats = fs.statSync(__dirname);
      const totalSpace = stats.size || 1000000000; // Default 1GB
      const usedSpace = this.calculateDirectorySize(path.join(__dirname, 'uploads'));
      const freeSpacePercent = ((totalSpace - usedSpace) / totalSpace) * 100;

      if (freeSpacePercent < 10) {
        throw new Error(`Low disk space: ${freeSpacePercent.toFixed(2)}% free`);
      }

      return {
        name: 'disk_space',
        status: 'healthy',
        details: {
          freeSpacePercent: freeSpacePercent.toFixed(2),
          usedSpace: Math.round(usedSpace / 1024 / 1024) + 'MB'
        }
      };
    } catch (error) {
      throw new Error(`Disk space check failed: ${error.message}`);
    }
  }

  async checkMemory() {
    try {
      const used = process.memoryUsage();
      const totalMemory = used.rss + used.heapUsed + used.external;
      const memoryLimitMB = 1024; // 1GB limit
      const memoryUsageMB = totalMemory / 1024 / 1024;

      if (memoryUsageMB > memoryLimitMB) {
        throw new Error(`High memory usage: ${memoryUsageMB.toFixed(2)}MB`);
      }

      return {
        name: 'memory',
        status: 'healthy',
        details: {
          rss: Math.round(used.rss / 1024 / 1024) + 'MB',
          heapUsed: Math.round(used.heapUsed / 1024 / 1024) + 'MB',
          external: Math.round(used.external / 1024 / 1024) + 'MB'
        }
      };
    } catch (error) {
      throw new Error(`Memory check failed: ${error.message}`);
    }
  }

  async checkDirectories() {
    const requiredDirs = [
      'uploads/pending',
      'uploads/processing',
      'uploads/completed',
      'uploads/failed',
      'logs'
    ];

    for (const dir of requiredDirs) {
      const dirPath = path.join(__dirname, dir);
      if (!fs.existsSync(dirPath)) {
        throw new Error(`Required directory missing: ${dir}`);
      }
    }

    return {
      name: 'directories',
      status: 'healthy',
      details: {
        checked: requiredDirs.length
      }
    };
  }

  async checkLogFiles() {
    try {
      const logDir = path.join(__dirname, 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const errorLogPath = path.join(logDir, 'error.log');
      const combinedLogPath = path.join(logDir, 'combined.log');

      // Verificar se os arquivos de log existem e não estão corrompidos
      if (fs.existsSync(errorLogPath)) {
        const errorLogSize = fs.statSync(errorLogPath).size;
        if (errorLogSize > 100 * 1024 * 1024) { // 100MB
          throw new Error('Error log file too large');
        }
      }

      if (fs.existsSync(combinedLogPath)) {
        const combinedLogSize = fs.statSync(combinedLogPath).size;
        if (combinedLogSize > 500 * 1024 * 1024) { // 500MB
          throw new Error('Combined log file too large');
        }
      }

      return {
        name: 'log_files',
        status: 'healthy',
        details: {
          errorLogExists: fs.existsSync(errorLogPath),
          combinedLogExists: fs.existsSync(combinedLogPath)
        }
      };
    } catch (error) {
      throw new Error(`Log files check failed: ${error.message}`);
    }
  }

  calculateDirectorySize(dirPath) {
    if (!fs.existsSync(dirPath)) return 0;

    let totalSize = 0;
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        totalSize += this.calculateDirectorySize(filePath);
      } else {
        totalSize += stats.size;
      }
    }

    return totalSize;
  }

  async runHealthChecks() {
    const results = [];
    let overallStatus = 'healthy';

    for (const check of this.checks) {
      try {
        const result = await check();
        results.push(result);
      } catch (error) {
        results.push({
          name: check.name || 'unknown',
          status: 'unhealthy',
          error: error.message
        });
        overallStatus = 'unhealthy';
      }
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: results
    };
  }
}

// Executar health check
async function main() {
  const checker = new HealthChecker();
  
  try {
    const result = await checker.runHealthChecks();
    
    if (result.status === 'healthy') {
      console.log('Health check passed');
      process.exit(0);
    } else {
      console.error('Health check failed:', JSON.stringify(result, null, 2));
      process.exit(1);
    }
  } catch (error) {
    console.error('Health check error:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = HealthChecker;