const winston = require('winston');
const { ElasticsearchTransport } = require('winston-elasticsearch');
const fs = require('fs').promises;
const path = require('path');

class LogAggregator {
    constructor(config) {
        this.config = config || this.getDefaultConfig();
        this.logger = null;
        this.logBuffer = [];
        this.flushInterval = null;
        
        this.initializeLogger();
        this.startLogProcessing();
    }

    getDefaultConfig() {
        return {
            level: process.env.LOG_LEVEL || 'info',
            format: 'json',
            
            // File logging
            file: {
                enabled: true,
                filename: '/app/logs/application.log',
                maxSize: '20m',
                maxFiles: 10,
                tailable: true,
                zippedArchive: true
            },
            
            // Console logging
            console: {
                enabled: true,
                colorize: true,
                timestamp: true
            },
            
            // Elasticsearch logging
            elasticsearch: {
                enabled: process.env.ELASTICSEARCH_ENABLED === 'true',
                host: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200',
                index: 'cryptalk-logs',
                type: 'log',
                flushInterval: 2000,
                waitForActiveShards: 1,
                waitForStatus: 'yellow'
            },
            
            // Log rotation
            rotation: {
                enabled: true,
                frequency: 'daily',
                maxSize: '100m',
                maxFiles: 30
            },
            
            // Log filtering
            filters: {
                sensitiveFields: [
                    'password',
                    'token',
                    'apiKey',
                    'secret',
                    'authorization',
                    'cookie'
                ],
                excludePatterns: [
                    /healthcheck/i,
                    /ping/i
                ]
            }
        };
    }

    initializeLogger() {
        const transports = [];
        
        // Console transport
        if (this.config.console.enabled) {
            transports.push(new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.timestamp(),
                    winston.format.printf(({ timestamp, level, message, ...meta }) => {
                        const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
                        return `${timestamp} [${level}]: ${message} ${metaStr}`;
                    })
                )
            }));
        }
        
        // File transport
        if (this.config.file.enabled) {
            transports.push(new winston.transports.File({
                filename: this.config.file.filename,
                maxsize: this.parseSize(this.config.file.maxSize),
                maxFiles: this.config.file.maxFiles,
                tailable: this.config.file.tailable,
                zippedArchive: this.config.file.zippedArchive,
                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.json()
                )
            }));
        }
        
        // Elasticsearch transport
        if (this.config.elasticsearch.enabled) {
            const esTransport = new ElasticsearchTransport({
                level: this.config.level,
                clientOpts: {
                    node: this.config.elasticsearch.host,
                    requestTimeout: 30000,
                    sniffOnStart: false
                },
                index: this.config.elasticsearch.index,
                type: this.config.elasticsearch.type,
                flushInterval: this.config.elasticsearch.flushInterval,
                waitForActiveShards: this.config.elasticsearch.waitForActiveShards,
                waitForStatus: this.config.elasticsearch.waitForStatus
            });
            
            transports.push(esTransport);
        }
        
        this.logger = winston.createLogger({
            level: this.config.level,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json(),
                this.createSanitizeFormat()
            ),
            transports,
            exceptionHandlers: [
                new winston.transports.File({ filename: '/app/logs/exceptions.log' })
            ],
            rejectionHandlers: [
                new winston.transports.File({ filename: '/app/logs/rejections.log' })
            ]
        });
    }

    createSanitizeFormat() {
        return winston.format.printf((info) => {
            // Remove sensitive fields
            const sanitized = this.sanitizeLog(info);
            return JSON.stringify(sanitized);
        });
    }

    sanitizeLog(logData) {
        const sanitized = { ...logData };
        
        // Remove sensitive fields
        for (const field of this.config.filters.sensitiveFields) {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        }
        
        // Recursively sanitize nested objects
        for (const [key, value] of Object.entries(sanitized)) {
            if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitizeLog(value);
            }
        }
        
        return sanitized;
    }

    parseSize(sizeStr) {
        const units = {
            'b': 1,
            'kb': 1024,
            'mb': 1024 * 1024,
            'gb': 1024 * 1024 * 1024
        };
        
        const match = sizeStr.toLowerCase().match(/^(\d+)\s*([kmg]?b)$/);
        if (!match) return 20 * 1024 * 1024; // Default 20MB
        
        const [, size, unit] = match;
        return parseInt(size) * (units[unit] || 1);
    }

    startLogProcessing() {
        // Start periodic log processing
        this.flushInterval = setInterval(() => {
            this.processLogBuffer();
        }, 1000);
        
        // Setup log rotation
        if (this.config.rotation.enabled) {
            this.setupLogRotation();
        }
        
        // Setup log monitoring
        this.setupLogMonitoring();
    }

    async processLogBuffer() {
        if (this.logBuffer.length === 0) return;
        
        const logsToProcess = this.logBuffer.splice(0, 100); // Process in batches
        
        for (const logEntry of logsToProcess) {
            try {
                await this.processLogEntry(logEntry);
            } catch (error) {
                console.error('Error processing log entry:', error);
                // Re-queue failed log entries
                this.logBuffer.unshift(logEntry);
            }
        }
    }

    async processLogEntry(logEntry) {
        // Apply filters
        if (this.shouldFilterLog(logEntry)) {
            return;
        }
        
        // Enrich log entry
        const enrichedLog = await this.enrichLogEntry(logEntry);
        
        // Send to configured destinations
        this.logger.log(enrichedLog.level, enrichedLog.message, enrichedLog.meta);
    }

    shouldFilterLog(logEntry) {
        // Check exclude patterns
        for (const pattern of this.config.filters.excludePatterns) {
            if (pattern.test(logEntry.message)) {
                return true;
            }
        }
        
        return false;
    }

    async enrichLogEntry(logEntry) {
        const enriched = {
            ...logEntry,
            meta: {
                ...logEntry.meta,
                hostname: process.env.HOSTNAME || 'unknown',
                service: process.env.SERVICE_NAME || 'cryptalk',
                version: process.env.SERVICE_VERSION || '1.0.0',
                environment: process.env.NODE_ENV || 'development',
                containerId: process.env.CONTAINER_ID || 'unknown',
                timestamp: new Date().toISOString()
            }
        };
        
        // Add request ID if available
        if (logEntry.requestId) {
            enriched.meta.requestId = logEntry.requestId;
        }
        
        // Add user ID if available
        if (logEntry.userId) {
            enriched.meta.userId = logEntry.userId;
        }
        
        return enriched;
    }

    setupLogRotation() {
        // This would typically use a cron job or external tool
        // For now, we'll implement basic rotation
        setInterval(async () => {
            await this.rotateLogFiles();
        }, 24 * 60 * 60 * 1000); // Daily rotation
    }

    async rotateLogFiles() {
        try {
            const logFile = this.config.file.filename;
            const logDir = path.dirname(logFile);
            const logName = path.basename(logFile, path.extname(logFile));
            const logExt = path.extname(logFile);
            
            // Get current log file stats
            const stats = await fs.stat(logFile);
            const maxSize = this.parseSize(this.config.rotation.maxSize);
            
            // Check if rotation is needed
            if (stats.size > maxSize) {
                const timestamp = new Date().toISOString().split('T')[0];
                const rotatedFile = path.join(logDir, `${logName}-${timestamp}${logExt}`);
                
                // Rename current log file
                await fs.rename(logFile, rotatedFile);
                
                // Create new log file
                await fs.writeFile(logFile, '');
                
                // Clean up old log files
                await this.cleanupOldLogs(logDir, logName, logExt);
                
                this.logger.info('Log file rotated', {
                    oldFile: logFile,
                    rotatedFile: rotatedFile,
                    size: stats.size
                });
            }
        } catch (error) {
            console.error('Error rotating log files:', error);
        }
    }

    async cleanupOldLogs(logDir, logName, logExt) {
        try {
            const files = await fs.readdir(logDir);
            const logFiles = files
                .filter(file => file.startsWith(logName) && file.endsWith(logExt))
                .map(file => ({
                    name: file,
                    path: path.join(logDir, file),
                    stats: null
                }));
            
            // Get file stats
            for (const file of logFiles) {
                file.stats = await fs.stat(file.path);
            }
            
            // Sort by modification time (newest first)
            logFiles.sort((a, b) => b.stats.mtime - a.stats.mtime);
            
            // Keep only the configured number of files
            const filesToDelete = logFiles.slice(this.config.rotation.maxFiles);
            
            for (const file of filesToDelete) {
                await fs.unlink(file.path);
                this.logger.info('Old log file deleted', { file: file.name });
            }
        } catch (error) {
            console.error('Error cleaning up old logs:', error);
        }
    }

    setupLogMonitoring() {
        // Monitor log levels and send alerts for errors
        const originalLog = this.logger.log.bind(this.logger);
        
        this.logger.log = (level, message, meta) => {
            // Call original log function
            originalLog(level, message, meta);
            
            // Monitor for error conditions
            if (level === 'error' || level === 'critical') {
                this.handleErrorLog(level, message, meta);
            }
        };
    }

    handleErrorLog(level, message, meta) {
        // This would typically send alerts or notifications
        console.error(`Critical log detected: ${level} - ${message}`, meta);
        
        // You could integrate with your alert system here
        // this.alertManager.sendAlert({
        //     severity: level === 'critical' ? 'critical' : 'warning',
        //     service: 'logging',
        //     message: `Critical log: ${message}`,
        //     details: meta
        // });
    }

    // Public API methods
    log(level, message, meta = {}) {
        const logEntry = {
            level,
            message,
            meta,
            timestamp: new Date().toISOString()
        };
        
        this.logBuffer.push(logEntry);
    }

    info(message, meta = {}) {
        this.log('info', message, meta);
    }

    warn(message, meta = {}) {
        this.log('warn', message, meta);
    }

    error(message, meta = {}) {
        this.log('error', message, meta);
    }

    debug(message, meta = {}) {
        this.log('debug', message, meta);
    }

    // Express middleware for request logging
    createRequestLogger() {
        return (req, res, next) => {
            const startTime = Date.now();
            const requestId = req.headers['x-request-id'] || this.generateRequestId();
            
            // Add request ID to request object
            req.requestId = requestId;
            
            // Log request start
            this.info('Request started', {
                requestId,
                method: req.method,
                url: req.url,
                userAgent: req.get('User-Agent'),
                ip: req.ip,
                headers: this.sanitizeHeaders(req.headers)
            });
            
            // Override res.end to log response
            const originalEnd = res.end;
            res.end = function(chunk, encoding) {
                const duration = Date.now() - startTime;
                
                // Log request completion
                this.info('Request completed', {
                    requestId,
                    method: req.method,
                    url: req.url,
                    statusCode: res.statusCode,
                    duration,
                    contentLength: res.get('Content-Length')
                });
                
                originalEnd.call(this, chunk, encoding);
            }.bind(this);
            
            next();
        };
    }

    sanitizeHeaders(headers) {
        const sanitized = { ...headers };
        
        for (const field of this.config.filters.sensitiveFields) {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        }
        
        return sanitized;
    }

    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Container log collection
    async collectContainerLogs() {
        try {
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);
            
            // Get all running containers
            const { stdout } = await execAsync('docker ps --format "{{.Names}}"');
            const containerNames = stdout.trim().split('\n').filter(name => name);
            
            for (const containerName of containerNames) {
                await this.collectContainerLog(containerName);
            }
        } catch (error) {
            this.error('Error collecting container logs', { error: error.message });
        }
    }

    async collectContainerLog(containerName) {
        try {
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);
            
            // Get recent logs from container
            const { stdout } = await execAsync(
                `docker logs --since=1m --timestamps ${containerName} 2>&1`
            );
            
            if (stdout.trim()) {
                const logLines = stdout.trim().split('\n');
                
                for (const line of logLines) {
                    const parsed = this.parseContainerLogLine(line);
                    if (parsed) {
                        this.log(parsed.level, parsed.message, {
                            container: containerName,
                            ...parsed.meta
                        });
                    }
                }
            }
        } catch (error) {
            this.error('Error collecting container log', {
                container: containerName,
                error: error.message
            });
        }
    }

    parseContainerLogLine(line) {
        // Parse Docker log format: timestamp message
        const match = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)\s+(.+)$/);
        if (!match) return null;
        
        const [, timestamp, message] = match;
        
        // Determine log level based on message content
        let level = 'info';
        if (message.toLowerCase().includes('error')) {
            level = 'error';
        } else if (message.toLowerCase().includes('warn')) {
            level = 'warn';
        } else if (message.toLowerCase().includes('debug')) {
            level = 'debug';
        }
        
        return {
            level,
            message,
            meta: {
                timestamp: timestamp,
                source: 'container'
            }
        };
    }

    // Shutdown and cleanup
    async shutdown() {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
        }
        
        // Process remaining logs
        await this.processLogBuffer();
        
        // Close logger
        if (this.logger) {
            this.logger.close();
        }
    }
}

module.exports = { LogAggregator };