#!/bin/bash

# ===========================================
# CRYPTALK PRODUCTION MONITORING SCRIPT
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE=".env.production"
LOG_FILE="./logs/monitor.log"
ALERT_EMAIL="admin@cryptalk.com"
HEALTH_CHECK_INTERVAL=30
MAX_RETRIES=3

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓ $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠ $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗ $1${NC}" | tee -a "$LOG_FILE"
}

# Health check functions
check_service_health() {
    local service_name=$1
    local port=$2
    local path=${3:-"/health"}
    
    if docker exec "$service_name" nc -z localhost "$port" 2>/dev/null; then
        # Check HTTP endpoint if path is provided
        if [[ "$path" != "" ]]; then
            if docker exec "$service_name" curl -f -s "http://localhost:$port$path" > /dev/null 2>&1; then
                success "Health check passed: $service_name"
                return 0
            else
                error "Health check failed (HTTP): $service_name"
                return 1
            fi
        else
            success "Health check passed: $service_name"
            return 0
        fi
    else
        error "Health check failed (port): $service_name"
        return 1
    fi
}

# Check container status
check_container_status() {
    local container_name=$1
    local status
    
    if docker inspect "$container_name" &>/dev/null; then
        status=$(docker inspect --format='{{.State.Status}}' "$container_name")
        if [[ "$status" == "running" ]]; then
            success "Container running: $container_name"
            return 0
        else
            error "Container not running: $container_name (status: $status)"
            return 1
        fi
    else
        error "Container not found: $container_name"
        return 1
    fi
}

# Check system resources
check_system_resources() {
    log "Checking system resources..."
    
    # Check disk usage
    local disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [[ "$disk_usage" -gt 80 ]]; then
        warning "High disk usage: ${disk_usage}%"
    else
        success "Disk usage OK: ${disk_usage}%"
    fi
    
    # Check memory usage
    local mem_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    if [[ "$mem_usage" -gt 85 ]]; then
        warning "High memory usage: ${mem_usage}%"
    else
        success "Memory usage OK: ${mem_usage}%"
    fi
    
    # Check CPU load
    local cpu_load=$(uptime | awk -F'load average:' '{print $2}' | cut -d, -f1 | sed 's/^ *//')
    local cpu_cores=$(nproc)
    local cpu_threshold=$(echo "$cpu_cores * 0.8" | bc)
    
    if (( $(echo "$cpu_load > $cpu_threshold" | bc -l) )); then
        warning "High CPU load: $cpu_load (cores: $cpu_cores)"
    else
        success "CPU load OK: $cpu_load (cores: $cpu_cores)"
    fi
}

# Check docker daemon
check_docker_daemon() {
    if systemctl is-active --quiet docker; then
        success "Docker daemon is running"
        return 0
    else
        error "Docker daemon is not running"
        return 1
    fi
}

# Check all services
check_all_services() {
    log "Checking all services..."
    
    local services=(
        "cryptalk-postgres:5432:/"
        "cryptalk-redis:6379:"
        "cryptalk-api:3001:/health"
        "cryptalk-frontend:3000:/health"
        "cryptalk-nginx:80:/health"
        "cryptalk-prometheus:9090:/-/healthy"
        "cryptalk-grafana:3000:/api/health"
        "cryptalk-elasticsearch:9200:/_cluster/health"
        "cryptalk-kibana:5601:/api/status"
        "cryptalk-cloudflared:/"
    )
    
    local failed_services=()
    
    for service in "${services[@]}"; do
        IFS=':' read -r name port path <<< "$service"
        
        if ! check_container_status "$name"; then
            failed_services+=("$name")
            continue
        fi
        
        if [[ -n "$port" ]]; then
            if ! check_service_health "$name" "$port" "$path"; then
                failed_services+=("$name")
            fi
        fi
    done
    
    if [[ ${#failed_services[@]} -eq 0 ]]; then
        success "All services are healthy"
        return 0
    else
        error "Failed services: ${failed_services[*]}"
        return 1
    fi
}

# Restart failed services
restart_failed_services() {
    local service_name=$1
    
    log "Restarting failed service: $service_name"
    
    if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" restart "$service_name"; then
        success "Service restarted successfully: $service_name"
        
        # Wait for service to be ready
        sleep 30
        
        # Check if service is now healthy
        if check_container_status "$service_name"; then
            success "Service is now healthy: $service_name"
        else
            error "Service still unhealthy after restart: $service_name"
        fi
    else
        error "Failed to restart service: $service_name"
    fi
}

# Send alert email
send_alert() {
    local subject=$1
    local message=$2
    
    if command -v mail &> /dev/null; then
        echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
        log "Alert sent to $ALERT_EMAIL"
    else
        warning "Mail command not available, cannot send alert"
    fi
}

# Cleanup old logs
cleanup_logs() {
    log "Cleaning up old logs..."
    
    # Remove logs older than 7 days
    find ./logs -name "*.log" -mtime +7 -delete 2>/dev/null || true
    
    # Rotate monitor log if it's too large (>100MB)
    if [[ -f "$LOG_FILE" ]] && [[ $(stat -c%s "$LOG_FILE") -gt 104857600 ]]; then
        mv "$LOG_FILE" "${LOG_FILE}.$(date +%Y%m%d_%H%M%S)"
        touch "$LOG_FILE"
        log "Monitor log rotated"
    fi
    
    success "Log cleanup completed"
}

# Generate health report
generate_health_report() {
    local report_file="./logs/health_report_$(date +%Y%m%d_%H%M%S).json"
    
    log "Generating health report..."
    
    cat > "$report_file" << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "system": {
        "hostname": "$(hostname)",
        "uptime": "$(uptime -p)",
        "load_average": "$(uptime | awk -F'load average:' '{print $2}')",
        "memory_usage": "$(free -h | grep ^Mem | awk '{print $3 "/" $2}')",
        "disk_usage": "$(df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 " used)"}')"
    },
    "docker": {
        "daemon_status": "$(systemctl is-active docker)",
        "containers": $(docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | tail -n +2 | jq -R -s -c 'split("\n") | map(select(length > 0))')
    },
    "services": {
        "total_containers": $(docker ps -q | wc -l),
        "running_containers": $(docker ps --filter "status=running" -q | wc -l),
        "stopped_containers": $(docker ps --filter "status=exited" -q | wc -l)
    }
}
EOF
    
    success "Health report generated: $report_file"
}

# Main monitoring loop
monitor_loop() {
    log "Starting monitoring loop (interval: ${HEALTH_CHECK_INTERVAL}s)..."
    
    while true; do
        check_docker_daemon
        check_system_resources
        
        if ! check_all_services; then
            warning "Some services are unhealthy, attempting recovery..."
            
            # Try to restart failed services
            # This is a simplified approach - in production, you might want more sophisticated logic
            docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" restart
            
            sleep 60
            
            if ! check_all_services; then
                error "Services still unhealthy after restart attempt"
                send_alert "CrysTalk Production Alert" "Multiple services are unhealthy. Manual intervention may be required."
            fi
        fi
        
        # Generate periodic health reports
        if [[ $(($(date +%s) % 3600)) -eq 0 ]]; then
            generate_health_report
        fi
        
        # Cleanup logs daily
        if [[ $(date +%H:%M) == "02:00" ]]; then
            cleanup_logs
        fi
        
        sleep "$HEALTH_CHECK_INTERVAL"
    done
}

# Signal handlers
cleanup() {
    log "Monitoring stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Command line interface
case "${1:-monitor}" in
    "monitor")
        monitor_loop
        ;;
    "check")
        check_docker_daemon
        check_system_resources
        check_all_services
        ;;
    "report")
        generate_health_report
        ;;
    "cleanup")
        cleanup_logs
        ;;
    *)
        echo "Usage: $0 {monitor|check|report|cleanup}"
        echo "  monitor  - Start continuous monitoring (default)"
        echo "  check    - Run one-time health check"
        echo "  report   - Generate health report"
        echo "  cleanup  - Clean up old logs"
        exit 1
        ;;
esac