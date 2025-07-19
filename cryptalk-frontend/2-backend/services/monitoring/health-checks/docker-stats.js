const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;

const execAsync = promisify(exec);

class DockerStats {
    constructor() {
        this.cachedStats = new Map();
        this.cacheTimeout = 5000; // 5 seconds
    }

    async getAllContainerStats() {
        try {
            // Get all container IDs
            const { stdout: containerIds } = await execAsync(
                'docker ps --format "{{.ID}}" 2>/dev/null || echo ""'
            );

            if (!containerIds.trim()) {
                return {};
            }

            const ids = containerIds.trim().split('\n').filter(id => id);
            const stats = {};

            // Get stats for each container
            for (const id of ids) {
                try {
                    const containerStats = await this.getContainerStats(id);
                    if (containerStats) {
                        stats[containerStats.name] = containerStats;
                    }
                } catch (error) {
                    console.warn(`Failed to get stats for container ${id}:`, error.message);
                }
            }

            return stats;
        } catch (error) {
            console.error('Error getting container stats:', error.message);
            return {};
        }
    }

    async getContainerStats(containerId) {
        try {
            // Check cache first
            const cacheKey = `container_${containerId}`;
            const cached = this.cachedStats.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }

            // Get container info
            const { stdout: inspectData } = await execAsync(
                `docker inspect ${containerId} --format '{{json .}}'`
            );
            const containerInfo = JSON.parse(inspectData);

            // Get stats
            const { stdout: statsData } = await execAsync(
                `docker stats ${containerId} --no-stream --format "{{json .}}"`
            );
            const stats = JSON.parse(statsData);

            // Parse CPU usage
            const cpuPercent = parseFloat(stats.CPUPerc?.replace('%', '')) || 0;

            // Parse memory usage
            const memoryUsage = this.parseMemoryUsage(stats.MemUsage);

            // Parse network I/O
            const networkIO = this.parseNetworkIO(stats.NetIO);

            // Parse block I/O
            const blockIO = this.parseBlockIO(stats.BlockIO);

            // Get restart count
            const restartCount = containerInfo.RestartCount || 0;

            // Get container status
            const status = containerInfo.State.Status;
            const health = containerInfo.State.Health?.Status || 'unknown';

            const result = {
                id: containerId,
                name: containerInfo.Name.replace('/', ''),
                status,
                health,
                cpu: cpuPercent,
                memory: memoryUsage,
                network: networkIO,
                blockIO,
                restartCount,
                uptime: this.calculateUptime(containerInfo.State.StartedAt),
                image: containerInfo.Config.Image,
                created: containerInfo.Created,
                ports: this.extractPorts(containerInfo.NetworkSettings?.Ports || {}),
                labels: containerInfo.Config.Labels || {},
                timestamp: new Date().toISOString()
            };

            // Cache the result
            this.cachedStats.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });

            return result;
        } catch (error) {
            console.error(`Error getting stats for container ${containerId}:`, error.message);
            return null;
        }
    }

    parseMemoryUsage(memUsage) {
        if (!memUsage || typeof memUsage !== 'string') {
            return { used: 0, total: 0, percentage: 0 };
        }

        // Format: "1.5GiB / 8GiB"
        const parts = memUsage.split(' / ');
        if (parts.length !== 2) {
            return { used: 0, total: 0, percentage: 0 };
        }

        const used = this.parseMemoryValue(parts[0]);
        const total = this.parseMemoryValue(parts[1]);
        const percentage = total > 0 ? (used / total) * 100 : 0;

        return {
            used,
            total,
            percentage: Math.round(percentage * 100) / 100
        };
    }

    parseMemoryValue(value) {
        if (!value || typeof value !== 'string') return 0;

        const match = value.match(/^(\d+\.?\d*)\s*([KMGT]?i?B)$/);
        if (!match) return 0;

        const number = parseFloat(match[1]);
        const unit = match[2];

        const multipliers = {
            'B': 1,
            'KB': 1000,
            'MB': 1000000,
            'GB': 1000000000,
            'TB': 1000000000000,
            'KiB': 1024,
            'MiB': 1024 * 1024,
            'GiB': 1024 * 1024 * 1024,
            'TiB': 1024 * 1024 * 1024 * 1024
        };

        return number * (multipliers[unit] || 1);
    }

    parseNetworkIO(netIO) {
        if (!netIO || typeof netIO !== 'string') {
            return { rx: 0, tx: 0 };
        }

        // Format: "1.5MB / 2.1MB"
        const parts = netIO.split(' / ');
        if (parts.length !== 2) {
            return { rx: 0, tx: 0 };
        }

        return {
            rx: this.parseMemoryValue(parts[0]),
            tx: this.parseMemoryValue(parts[1])
        };
    }

    parseBlockIO(blockIO) {
        if (!blockIO || typeof blockIO !== 'string') {
            return { read: 0, write: 0 };
        }

        // Format: "1.5MB / 2.1MB"
        const parts = blockIO.split(' / ');
        if (parts.length !== 2) {
            return { read: 0, write: 0 };
        }

        return {
            read: this.parseMemoryValue(parts[0]),
            write: this.parseMemoryValue(parts[1])
        };
    }

    calculateUptime(startedAt) {
        if (!startedAt) return 0;
        
        const started = new Date(startedAt);
        const now = new Date();
        return Math.floor((now - started) / 1000); // seconds
    }

    extractPorts(ports) {
        const result = [];
        for (const [containerPort, hostBindings] of Object.entries(ports)) {
            if (hostBindings && hostBindings.length > 0) {
                for (const binding of hostBindings) {
                    result.push({
                        container: containerPort,
                        host: binding.HostPort,
                        hostIP: binding.HostIp || '0.0.0.0'
                    });
                }
            }
        }
        return result;
    }

    async getDiskUsage() {
        try {
            const { stdout } = await execAsync('df -h --output=target,size,used,avail,pcent');
            const lines = stdout.trim().split('\n').slice(1); // Skip header

            return lines.map(line => {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 5) {
                    return {
                        mountPoint: parts[0],
                        size: parts[1],
                        used: parts[2],
                        available: parts[3],
                        usePercentage: parseInt(parts[4].replace('%', ''))
                    };
                }
                return null;
            }).filter(item => item !== null);
        } catch (error) {
            console.error('Error getting disk usage:', error.message);
            return [];
        }
    }

    async getSystemMemory() {
        try {
            const meminfo = await fs.readFile('/proc/meminfo', 'utf8');
            const lines = meminfo.split('\n');
            
            const memory = {};
            for (const line of lines) {
                const match = line.match(/^(\w+):\s*(\d+)\s*kB$/);
                if (match) {
                    memory[match[1]] = parseInt(match[2]) * 1024; // Convert to bytes
                }
            }

            return {
                total: memory.MemTotal || 0,
                free: memory.MemFree || 0,
                available: memory.MemAvailable || memory.MemFree || 0,
                used: (memory.MemTotal || 0) - (memory.MemFree || 0),
                buffers: memory.Buffers || 0,
                cached: memory.Cached || 0
            };
        } catch (error) {
            console.error('Error getting system memory:', error.message);
            return { total: 0, free: 0, available: 0, used: 0, buffers: 0, cached: 0 };
        }
    }

    async getSystemCPU() {
        try {
            // Get CPU info
            const cpuinfo = await fs.readFile('/proc/cpuinfo', 'utf8');
            const cores = (cpuinfo.match(/processor\s*:/g) || []).length;

            // Get load average
            const loadavg = await fs.readFile('/proc/loadavg', 'utf8');
            const loads = loadavg.trim().split(' ').slice(0, 3).map(parseFloat);

            // Calculate CPU usage (simplified)
            const stat1 = await this.getCPUStat();
            await new Promise(resolve => setTimeout(resolve, 1000));
            const stat2 = await this.getCPUStat();

            const idle1 = stat1.idle + stat1.iowait;
            const idle2 = stat2.idle + stat2.iowait;
            const total1 = stat1.total;
            const total2 = stat2.total;

            const idleDelta = idle2 - idle1;
            const totalDelta = total2 - total1;
            const usage = totalDelta > 0 ? (1 - idleDelta / totalDelta) * 100 : 0;

            return {
                cores,
                usage: Math.max(0, Math.min(100, usage)),
                loadAverage: loads
            };
        } catch (error) {
            console.error('Error getting system CPU:', error.message);
            return { cores: 1, usage: 0, loadAverage: [0, 0, 0] };
        }
    }

    async getCPUStat() {
        try {
            const stat = await fs.readFile('/proc/stat', 'utf8');
            const cpuLine = stat.split('\n')[0];
            const values = cpuLine.split(/\s+/).slice(1).map(Number);

            return {
                user: values[0] || 0,
                nice: values[1] || 0,
                system: values[2] || 0,
                idle: values[3] || 0,
                iowait: values[4] || 0,
                irq: values[5] || 0,
                softirq: values[6] || 0,
                steal: values[7] || 0,
                guest: values[8] || 0,
                guest_nice: values[9] || 0,
                total: values.reduce((sum, val) => sum + val, 0)
            };
        } catch (error) {
            console.error('Error getting CPU stat:', error.message);
            return { user: 0, nice: 0, system: 0, idle: 0, iowait: 0, irq: 0, softirq: 0, steal: 0, guest: 0, guest_nice: 0, total: 0 };
        }
    }

    async getDockerSystemInfo() {
        try {
            const { stdout } = await execAsync('docker system df --format "{{json .}}"');
            const lines = stdout.trim().split('\n');
            
            return lines.map(line => {
                try {
                    return JSON.parse(line);
                } catch (error) {
                    return null;
                }
            }).filter(item => item !== null);
        } catch (error) {
            console.error('Error getting Docker system info:', error.message);
            return [];
        }
    }

    clearCache() {
        this.cachedStats.clear();
    }
}

module.exports = { DockerStats };