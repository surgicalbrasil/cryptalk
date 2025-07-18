const nodemailer = require('nodemailer');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class AlertManager {
    constructor(config) {
        this.config = config || {};
        this.alertHistory = new Map();
        this.suppressedAlerts = new Set();
        this.alertRules = new Map();
        
        // Initialize notification channels
        this.initializeChannels();
        
        // Load alert rules
        this.loadAlertRules();
    }

    initializeChannels() {
        this.channels = {
            email: this.config.email ? this.createEmailChannel() : null,
            slack: this.config.slack ? this.createSlackChannel() : null,
            webhook: this.config.webhook ? this.createWebhookChannel() : null,
            teams: this.config.teams ? this.createTeamsChannel() : null
        };
    }

    createEmailChannel() {
        if (!this.config.email.smtp) return null;

        return nodemailer.createTransporter({
            host: this.config.email.smtp.host,
            port: this.config.email.smtp.port,
            secure: this.config.email.smtp.secure,
            auth: {
                user: this.config.email.smtp.user,
                pass: this.config.email.smtp.pass
            }
        });
    }

    createSlackChannel() {
        return {
            webhook: this.config.slack.webhook,
            channel: this.config.slack.channel || '#alerts',
            username: this.config.slack.username || 'CrysTalk Monitor'
        };
    }

    createWebhookChannel() {
        return {
            url: this.config.webhook.url,
            headers: this.config.webhook.headers || {}
        };
    }

    createTeamsChannel() {
        return {
            webhook: this.config.teams.webhook
        };
    }

    async loadAlertRules() {
        try {
            const rulesPath = path.join(__dirname, 'alert-rules.json');
            const rulesData = await fs.readFile(rulesPath, 'utf8');
            const rules = JSON.parse(rulesData);

            for (const rule of rules) {
                this.alertRules.set(rule.name, rule);
            }
        } catch (error) {
            console.warn('Could not load alert rules:', error.message);
            this.loadDefaultRules();
        }
    }

    loadDefaultRules() {
        const defaultRules = [
            {
                name: 'high_cpu_usage',
                condition: 'cpu > 80',
                severity: 'warning',
                duration: 300, // 5 minutes
                message: 'High CPU usage detected'
            },
            {
                name: 'critical_cpu_usage',
                condition: 'cpu > 95',
                severity: 'critical',
                duration: 60, // 1 minute
                message: 'Critical CPU usage detected'
            },
            {
                name: 'high_memory_usage',
                condition: 'memory > 85',
                severity: 'warning',
                duration: 300,
                message: 'High memory usage detected'
            },
            {
                name: 'critical_memory_usage',
                condition: 'memory > 95',
                severity: 'critical',
                duration: 60,
                message: 'Critical memory usage detected'
            },
            {
                name: 'disk_space_low',
                condition: 'disk_usage > 80',
                severity: 'warning',
                duration: 600,
                message: 'Low disk space detected'
            },
            {
                name: 'disk_space_critical',
                condition: 'disk_usage > 90',
                severity: 'critical',
                duration: 300,
                message: 'Critical disk space detected'
            },
            {
                name: 'service_down',
                condition: 'status == "unhealthy"',
                severity: 'critical',
                duration: 60,
                message: 'Service is down'
            },
            {
                name: 'container_restart_loop',
                condition: 'restart_count > 5',
                severity: 'warning',
                duration: 300,
                message: 'Container restart loop detected'
            }
        ];

        for (const rule of defaultRules) {
            this.alertRules.set(rule.name, rule);
        }
    }

    async sendAlert(alert) {
        try {
            // Check if alert should be suppressed
            const alertKey = `${alert.service}_${alert.severity}`;
            if (this.shouldSuppressAlert(alertKey, alert)) {
                console.log(`Alert suppressed: ${alertKey}`);
                return;
            }

            // Create formatted alert
            const formattedAlert = this.formatAlert(alert);

            // Send to all configured channels
            const promises = [];
            
            if (this.channels.email) {
                promises.push(this.sendEmailAlert(formattedAlert));
            }
            
            if (this.channels.slack) {
                promises.push(this.sendSlackAlert(formattedAlert));
            }
            
            if (this.channels.webhook) {
                promises.push(this.sendWebhookAlert(formattedAlert));
            }
            
            if (this.channels.teams) {
                promises.push(this.sendTeamsAlert(formattedAlert));
            }

            await Promise.allSettled(promises);

            // Record alert in history
            this.recordAlert(alertKey, formattedAlert);

            console.log(`Alert sent: ${alert.service} - ${alert.severity}`);
        } catch (error) {
            console.error('Error sending alert:', error.message);
        }
    }

    formatAlert(alert) {
        const timestamp = new Date().toISOString();
        const duration = alert.duration ? this.formatDuration(alert.duration) : 'N/A';

        return {
            id: this.generateAlertId(),
            timestamp,
            service: alert.service,
            severity: alert.severity,
            message: alert.message,
            details: alert.details,
            consecutiveFailures: alert.consecutiveFailures || 0,
            duration,
            hostname: process.env.HOSTNAME || 'unknown',
            environment: process.env.NODE_ENV || 'development',
            runbook: this.getRunbookUrl(alert.service),
            dashboardUrl: this.getDashboardUrl(alert.service)
        };
    }

    generateAlertId() {
        return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    formatDuration(seconds) {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
        return `${Math.floor(seconds / 86400)}d`;
    }

    getRunbookUrl(service) {
        const runbooks = {
            redis: 'https://docs.cryptalk.com/runbooks/redis',
            postgres: 'https://docs.cryptalk.com/runbooks/postgres',
            nginx: 'https://docs.cryptalk.com/runbooks/nginx',
            elasticsearch: 'https://docs.cryptalk.com/runbooks/elasticsearch'
        };
        return runbooks[service] || 'https://docs.cryptalk.com/runbooks/general';
    }

    getDashboardUrl(service) {
        const baseUrl = process.env.GRAFANA_URL || 'http://localhost:3001';
        return `${baseUrl}/d/service-${service}`;
    }

    shouldSuppressAlert(alertKey, alert) {
        // Check if alert is globally suppressed
        if (this.suppressedAlerts.has(alertKey)) {
            return true;
        }

        // Check rate limiting
        const history = this.alertHistory.get(alertKey);
        if (history && history.length > 0) {
            const lastAlert = history[history.length - 1];
            const timeSinceLastAlert = Date.now() - lastAlert.timestamp;
            const minInterval = this.getMinInterval(alert.severity);

            if (timeSinceLastAlert < minInterval) {
                return true;
            }
        }

        return false;
    }

    getMinInterval(severity) {
        const intervals = {
            critical: 5 * 60 * 1000,  // 5 minutes
            warning: 15 * 60 * 1000,  // 15 minutes
            info: 30 * 60 * 1000      // 30 minutes
        };
        return intervals[severity] || intervals.warning;
    }

    recordAlert(alertKey, alert) {
        if (!this.alertHistory.has(alertKey)) {
            this.alertHistory.set(alertKey, []);
        }

        const history = this.alertHistory.get(alertKey);
        history.push({
            ...alert,
            timestamp: Date.now()
        });

        // Keep only last 100 alerts per key
        if (history.length > 100) {
            history.splice(0, history.length - 100);
        }
    }

    async sendEmailAlert(alert) {
        if (!this.channels.email) return;

        const subject = `[${alert.severity.toUpperCase()}] ${alert.service} - ${alert.message}`;
        const html = this.generateEmailTemplate(alert);

        await this.channels.email.sendMail({
            from: this.config.email.from,
            to: this.config.email.to,
            subject,
            html
        });
    }

    generateEmailTemplate(alert) {
        const severityColors = {
            critical: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };

        const color = severityColors[alert.severity] || '#6c757d';

        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: ${color}; color: white; padding: 20px; border-radius: 5px 5px 0 0;">
                    <h2 style="margin: 0;">${alert.severity.toUpperCase()} Alert</h2>
                    <p style="margin: 10px 0 0 0;">${alert.service}</p>
                </div>
                
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px;">
                    <h3 style="margin-top: 0;">Alert Details</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>Service:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${alert.service}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>Message:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${alert.message}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>Severity:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${alert.severity}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>Time:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${alert.timestamp}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>Environment:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${alert.environment}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>Hostname:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${alert.hostname}</td>
                        </tr>
                    </table>
                    
                    ${alert.details ? `
                        <h4>Additional Details</h4>
                        <pre style="background-color: #e9ecef; padding: 10px; border-radius: 3px; overflow-x: auto;">${JSON.stringify(alert.details, null, 2)}</pre>
                    ` : ''}
                    
                    <div style="margin-top: 20px;">
                        <a href="${alert.dashboardUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 3px; margin-right: 10px;">View Dashboard</a>
                        <a href="${alert.runbook}" style="display: inline-block; padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 3px;">View Runbook</a>
                    </div>
                </div>
            </div>
        `;
    }

    async sendSlackAlert(alert) {
        if (!this.channels.slack) return;

        const color = this.getSlackColor(alert.severity);
        const payload = {
            channel: this.channels.slack.channel,
            username: this.channels.slack.username,
            attachments: [{
                color,
                title: `${alert.severity.toUpperCase()} Alert: ${alert.service}`,
                text: alert.message,
                fields: [
                    {
                        title: 'Service',
                        value: alert.service,
                        short: true
                    },
                    {
                        title: 'Severity',
                        value: alert.severity,
                        short: true
                    },
                    {
                        title: 'Time',
                        value: alert.timestamp,
                        short: true
                    },
                    {
                        title: 'Environment',
                        value: alert.environment,
                        short: true
                    }
                ],
                actions: [
                    {
                        type: 'button',
                        text: 'View Dashboard',
                        url: alert.dashboardUrl
                    },
                    {
                        type: 'button',
                        text: 'View Runbook',
                        url: alert.runbook
                    }
                ],
                footer: 'CrysTalk Monitor',
                ts: Math.floor(Date.now() / 1000)
            }]
        };

        await axios.post(this.channels.slack.webhook, payload);
    }

    getSlackColor(severity) {
        const colors = {
            critical: 'danger',
            warning: 'warning',
            info: 'good'
        };
        return colors[severity] || 'good';
    }

    async sendWebhookAlert(alert) {
        if (!this.channels.webhook) return;

        await axios.post(this.channels.webhook.url, alert, {
            headers: this.channels.webhook.headers
        });
    }

    async sendTeamsAlert(alert) {
        if (!this.channels.teams) return;

        const color = this.getTeamsColor(alert.severity);
        const payload = {
            '@type': 'MessageCard',
            '@context': 'http://schema.org/extensions',
            summary: `${alert.severity.toUpperCase()} Alert: ${alert.service}`,
            themeColor: color,
            sections: [{
                activityTitle: `${alert.severity.toUpperCase()} Alert`,
                activitySubtitle: alert.service,
                facts: [
                    {
                        name: 'Service',
                        value: alert.service
                    },
                    {
                        name: 'Message',
                        value: alert.message
                    },
                    {
                        name: 'Severity',
                        value: alert.severity
                    },
                    {
                        name: 'Time',
                        value: alert.timestamp
                    },
                    {
                        name: 'Environment',
                        value: alert.environment
                    }
                ]
            }],
            potentialAction: [{
                '@type': 'OpenUri',
                name: 'View Dashboard',
                targets: [{
                    os: 'default',
                    uri: alert.dashboardUrl
                }]
            }, {
                '@type': 'OpenUri',
                name: 'View Runbook',
                targets: [{
                    os: 'default',
                    uri: alert.runbook
                }]
            }]
        };

        await axios.post(this.channels.teams.webhook, payload);
    }

    getTeamsColor(severity) {
        const colors = {
            critical: 'FF0000',
            warning: 'FFA500',
            info: '00FF00'
        };
        return colors[severity] || '808080';
    }

    // Alert management methods
    suppressAlert(alertKey, duration = 3600000) { // 1 hour default
        this.suppressedAlerts.add(alertKey);
        
        if (duration > 0) {
            setTimeout(() => {
                this.suppressedAlerts.delete(alertKey);
            }, duration);
        }
    }

    unsuppressAlert(alertKey) {
        this.suppressedAlerts.delete(alertKey);
    }

    getAlertHistory(alertKey) {
        return this.alertHistory.get(alertKey) || [];
    }

    getAllAlertHistory() {
        const history = {};
        for (const [key, alerts] of this.alertHistory) {
            history[key] = alerts;
        }
        return history;
    }

    clearAlertHistory(alertKey) {
        if (alertKey) {
            this.alertHistory.delete(alertKey);
        } else {
            this.alertHistory.clear();
        }
    }

    getActiveAlerts() {
        const activeAlerts = [];
        const now = Date.now();
        const activeThreshold = 15 * 60 * 1000; // 15 minutes

        for (const [key, alerts] of this.alertHistory) {
            if (alerts.length > 0) {
                const lastAlert = alerts[alerts.length - 1];
                if (now - lastAlert.timestamp < activeThreshold) {
                    activeAlerts.push(lastAlert);
                }
            }
        }

        return activeAlerts;
    }

    getAlertStats() {
        const stats = {
            totalAlerts: 0,
            alertsByService: {},
            alertsBySeverity: {
                critical: 0,
                warning: 0,
                info: 0
            },
            suppressedAlerts: this.suppressedAlerts.size,
            activeAlerts: this.getActiveAlerts().length
        };

        for (const [key, alerts] of this.alertHistory) {
            stats.totalAlerts += alerts.length;

            for (const alert of alerts) {
                // Count by service
                if (!stats.alertsByService[alert.service]) {
                    stats.alertsByService[alert.service] = 0;
                }
                stats.alertsByService[alert.service]++;

                // Count by severity
                if (stats.alertsBySeverity[alert.severity] !== undefined) {
                    stats.alertsBySeverity[alert.severity]++;
                }
            }
        }

        return stats;
    }
}

module.exports = { AlertManager };