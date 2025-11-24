# CrysTalk Container Monitoring System

## Overview

This comprehensive monitoring system provides real-time visibility into your CrysTalk container infrastructure with:

- **Health Checks**: Automated health monitoring for all services
- **Centralized Logging**: Aggregated logs from all containers
- **Metrics Collection**: Performance metrics and resource utilization
- **Alerting System**: Email, Slack, and webhook notifications
- **Interactive Dashboard**: Web-based monitoring interface

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Dashboard     │    │   Monitoring    │    │   Alerting      │
│   (Port 3003)   │    │   Service       │    │   System        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Prometheus    │    │   Grafana       │    │   Elasticsearch │
│   (Port 9091)   │    │   (Port 3001)   │    │   (Port 9200)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Container     │
                    │   Runtime       │
                    │   (Docker)      │
                    └─────────────────┘
```

## Quick Start

### 1. Start the Monitoring System

```bash
# Make the script executable
chmod +x start-monitoring.sh

# Start the monitoring system
./start-monitoring.sh
```

### 2. Access the Interfaces

- **Main Dashboard**: http://localhost:3003
- **Grafana**: http://localhost:3001 (admin/admin123)
- **Prometheus**: http://localhost:9091
- **Health Checks**: http://localhost:3003/health
- **Metrics**: http://localhost:3003/metrics

## Features

### 1. Health Checks

Automated health monitoring for:
- **Redis**: Connection and memory usage
- **PostgreSQL**: Database connectivity and performance
- **Elasticsearch**: Cluster health and node status
- **Nginx**: Service availability and error rates
- **Containers**: CPU, memory, and restart counts
- **System Resources**: CPU, memory, and disk usage

### 2. Metrics Collection

Real-time metrics for:
- System resources (CPU, memory, disk)
- Container performance
- Application metrics
- Database statistics
- Network I/O
- Custom business metrics

### 3. Alerting System

Multi-channel alerting with:
- **Email notifications** (via SMTP)
- **Slack integration** (via webhooks)
- **Custom webhooks** (for external systems)
- **Microsoft Teams** (via connectors)

### 4. Centralized Logging

Log aggregation with:
- Container log collection
- Application log processing
- Log filtering and sanitization
- Elasticsearch integration
- Real-time log streaming

### 5. Interactive Dashboard

Web-based interface featuring:
- Real-time system overview
- Container status monitoring
- Performance metrics visualization
- Alert management
- Historical data analysis

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Basic Configuration
NODE_ENV=production
LOG_LEVEL=info

# Database Configuration
POSTGRES_PASSWORD=secure_password_123
REDIS_PASSWORD=redis_secure_password

# Grafana Configuration
GRAFANA_PASSWORD=admin123

# Alert Configuration
ALERT_EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
ALERT_EMAIL_FROM=monitoring@cryptalk.com
ALERT_EMAIL_TO=admin@cryptalk.com

# Slack Integration
ALERT_SLACK_ENABLED=true
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
SLACK_CHANNEL=#alerts
```

### Alert Rules

Customize alert thresholds in `/prometheus/rules/alerts.yml`:

```yaml
- alert: HighCpuUsage
  expr: system_cpu_usage > 80
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High CPU usage detected"
```

## API Endpoints

### Health Check API

```bash
# Overall health status
curl http://localhost:3003/health

# Specific service health
curl http://localhost:3003/health/redis
curl http://localhost:3003/health/postgres
curl http://localhost:3003/health/elasticsearch
```

### Metrics API

```bash
# Prometheus format metrics
curl http://localhost:3003/metrics

# JSON format metrics
curl http://localhost:3003/metrics/json
```

### Alerts API

```bash
# Active alerts
curl http://localhost:3003/alerts

# Suppress alert
curl -X POST http://localhost:3003/alerts/suppress \
  -H "Content-Type: application/json" \
  -d '{"alertKey": "redis_warning", "duration": 3600000}'
```

### Dashboard API

```bash
# Real-time data stream
curl http://localhost:3003/api/stream

# System information
curl http://localhost:3003/api/system

# Container statistics
curl http://localhost:3003/api/containers
```

## Monitoring Targets

### System Metrics
- CPU usage and load average
- Memory utilization
- Disk space and I/O
- Network throughput

### Container Metrics
- CPU and memory usage per container
- Network I/O statistics
- Restart counts and uptime
- Health check status

### Application Metrics
- HTTP request rates and response times
- Error rates and status codes
- Database query performance
- Queue lengths and processing times

### Business Metrics
- Active user counts
- Document processing rates
- Feature usage statistics
- Custom KPIs

## Alert Types

### System Alerts
- High CPU usage (>80% for 5m)
- High memory usage (>85% for 5m)
- Low disk space (<20% remaining)
- High load average

### Service Alerts
- Service down or unhealthy
- Database connection issues
- High error rates
- SSL certificate expiration

### Container Alerts
- Container restart loops
- High resource usage
- Container down/failed

### Application Alerts
- Slow response times
- High error rates
- Queue backlogs
- Low active users

## Troubleshooting

### Common Issues

1. **Services not starting**
   ```bash
   # Check Docker status
   docker info
   
   # Check container logs
   docker-compose logs monitoring
   
   # Restart services
   docker-compose restart
   ```

2. **Metrics not appearing**
   ```bash
   # Check Prometheus targets
   curl http://localhost:9091/targets
   
   # Verify monitoring service
   curl http://localhost:3003/metrics
   ```

3. **Alerts not firing**
   ```bash
   # Check alert rules
   curl http://localhost:9091/api/v1/rules
   
   # Verify alert configuration
   docker-compose exec monitoring cat /app/config/alerts.json
   ```

4. **Dashboard not loading**
   ```bash
   # Check service status
   curl http://localhost:3003/health
   
   # Check browser console for errors
   # Verify network connectivity
   ```

### Log Locations

- **Monitoring service**: `./monitoring/logs/`
- **Container logs**: `docker-compose logs [service]`
- **System logs**: `/var/log/` (host system)

### Performance Tuning

1. **Resource Limits**
   ```yaml
   # In docker-compose.yml
   deploy:
     resources:
       limits:
         cpus: '1.0'
         memory: 1G
   ```

2. **Metric Retention**
   ```yaml
   # In prometheus.yml
   global:
     scrape_interval: 15s
   ```

3. **Log Rotation**
   ```bash
   # Configure in log-aggregator.js
   rotation: {
     maxSize: '100m',
     maxFiles: 30
   }
   ```

## Security Considerations

### Network Security
- All services run on isolated Docker network
- External access only through configured ports
- No direct database access from outside

### Authentication
- Grafana requires login (admin/admin123)
- API endpoints use basic authentication
- Webhook endpoints use token authentication

### Data Protection
- Sensitive data is redacted from logs
- Database credentials are encrypted
- SSL/TLS for external communications

## Maintenance

### Regular Tasks

1. **Weekly**
   - Review alert statistics
   - Check disk space usage
   - Verify backup integrity

2. **Monthly**
   - Update container images
   - Review and tune alert thresholds
   - Analyze performance trends

3. **Quarterly**
   - Security audit
   - Configuration review
   - Capacity planning

### Backup Strategy

```bash
# Backup Prometheus data
docker-compose exec prometheus tar -czf /tmp/prometheus-backup.tar.gz /prometheus

# Backup Grafana dashboards
docker-compose exec grafana tar -czf /tmp/grafana-backup.tar.gz /var/lib/grafana

# Backup monitoring configuration
tar -czf monitoring-config-backup.tar.gz monitoring/config/
```

## Scaling

### Horizontal Scaling
- Add more monitoring instances
- Implement load balancing
- Use external databases

### Vertical Scaling
- Increase resource limits
- Optimize query performance
- Implement caching

## Support

### Getting Help
- Check the logs: `docker-compose logs monitoring`
- Review the documentation
- Check GitHub issues
- Contact support team

### Contributing
- Report bugs and issues
- Suggest new features
- Submit pull requests
- Improve documentation

## License

This monitoring system is part of the CrysTalk project and is licensed under the MIT License.

---

**Note**: This monitoring system is designed for production use. For development environments, you may want to reduce resource requirements and simplify configurations.