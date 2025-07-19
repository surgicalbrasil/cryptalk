#!/bin/bash

# CrysTalk Monitoring System Startup Script
# This script starts the complete monitoring infrastructure

set -e

echo "🚀 Starting CrysTalk Monitoring System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if Docker is running
check_docker() {
    print_header "Checking Docker status..."
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_status "Docker is running"
}

# Check if Docker Compose is available
check_docker_compose() {
    print_header "Checking Docker Compose..."
    if ! command -v docker-compose > /dev/null 2>&1; then
        print_error "Docker Compose is not installed. Please install Docker Compose and try again."
        exit 1
    fi
    print_status "Docker Compose is available"
}

# Create necessary directories
create_directories() {
    print_header "Creating necessary directories..."
    
    directories=(
        "logs"
        "prometheus/data"
        "grafana/data"
        "monitoring/logs"
        "monitoring/config"
        "monitoring/data"
    )
    
    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            print_status "Created directory: $dir"
        fi
    done
}

# Set proper permissions
set_permissions() {
    print_header "Setting proper permissions..."
    
    # Set ownership for monitoring directories
    if [[ "$OSTYPE" != "msys" && "$OSTYPE" != "win32" ]]; then
        sudo chown -R 1001:1001 monitoring/logs monitoring/config monitoring/data 2>/dev/null || true
        sudo chown -R 472:472 grafana/data 2>/dev/null || true
        sudo chown -R 65534:65534 prometheus/data 2>/dev/null || true
    fi
    
    print_status "Permissions set"
}

# Check environment variables
check_environment() {
    print_header "Checking environment variables..."
    
    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating default .env file..."
        cat > .env << EOF
# CrysTalk Monitoring Configuration
NODE_ENV=production
LOG_LEVEL=info

# Database Configuration
POSTGRES_PASSWORD=secure_password_123
REDIS_PASSWORD=redis_secure_password

# Grafana Configuration
GRAFANA_PASSWORD=admin123

# Alert Configuration (Optional)
ALERT_EMAIL_ENABLED=false
ALERT_SLACK_ENABLED=false
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-password
# ALERT_EMAIL_FROM=monitoring@cryptalk.com
# ALERT_EMAIL_TO=admin@cryptalk.com
# SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
# SLACK_CHANNEL=#alerts

# Monitoring Configuration
MONITORING_PORT=3003
PROMETHEUS_PORT=9091
GRAFANA_PORT=3001
EOF
        print_status "Created default .env file"
    else
        print_status ".env file exists"
    fi
}

# Build and start services
start_services() {
    print_header "Building and starting monitoring services..."
    
    # Build the monitoring service
    print_status "Building monitoring service..."
    docker-compose build monitoring
    
    # Start infrastructure services first
    print_status "Starting infrastructure services..."
    docker-compose up -d redis postgres
    
    # Wait for infrastructure to be ready
    print_status "Waiting for infrastructure services to be ready..."
    sleep 10
    
    # Start monitoring services
    print_status "Starting monitoring services..."
    docker-compose up -d prometheus grafana
    
    # Wait for monitoring infrastructure
    print_status "Waiting for monitoring infrastructure..."
    sleep 15
    
    # Start the main monitoring service
    print_status "Starting main monitoring service..."
    docker-compose up -d monitoring
    
    # Start remaining services
    print_status "Starting remaining services..."
    docker-compose up -d
}

# Check service health
check_health() {
    print_header "Checking service health..."
    
    services=(
        "redis:6379"
        "postgres:5432"
        "prometheus:9091"
        "grafana:3001"
        "monitoring:3003"
    )
    
    for service in "${services[@]}"; do
        IFS=':' read -ra ADDR <<< "$service"
        service_name="${ADDR[0]}"
        port="${ADDR[1]}"
        
        print_status "Checking $service_name..."
        
        # Wait up to 60 seconds for service to be ready
        timeout=60
        while [ $timeout -gt 0 ]; do
            if docker-compose exec -T "$service_name" echo "Service is running" > /dev/null 2>&1; then
                print_status "$service_name is healthy"
                break
            fi
            sleep 2
            timeout=$((timeout - 2))
        done
        
        if [ $timeout -eq 0 ]; then
            print_warning "$service_name may not be fully ready yet"
        fi
    done
}

# Display access information
display_info() {
    print_header "Monitoring System Started Successfully!"
    
    echo ""
    echo "🌐 Access Points:"
    echo "  📊 CrysTalk Monitoring Dashboard: http://localhost:3003"
    echo "  📈 Grafana Dashboard: http://localhost:3001 (admin/admin123)"
    echo "  🔍 Prometheus: http://localhost:9091"
    echo "  🏥 Health Checks: http://localhost:3003/health"
    echo "  📋 Metrics: http://localhost:3003/metrics"
    echo "  🚨 Alerts: http://localhost:3003/alerts"
    echo ""
    echo "🔧 Management Commands:"
    echo "  View logs: docker-compose logs -f monitoring"
    echo "  Restart monitoring: docker-compose restart monitoring"
    echo "  Stop all: docker-compose down"
    echo "  Check status: docker-compose ps"
    echo ""
    echo "📚 Documentation:"
    echo "  Health checks run every 30 seconds"
    echo "  Metrics are collected every 15 seconds"
    echo "  Alerts are evaluated every 15 seconds"
    echo "  Dashboard auto-refreshes every 30 seconds"
    echo ""
    print_status "Monitoring system is ready!"
}

# Main execution
main() {
    echo "==============================================="
    echo "  CrysTalk Container Monitoring System"
    echo "==============================================="
    echo ""
    
    check_docker
    check_docker_compose
    create_directories
    set_permissions
    check_environment
    start_services
    check_health
    display_info
    
    echo ""
    echo "🎉 Setup complete! Monitor your containers at http://localhost:3003"
    echo ""
}

# Handle script interruption
trap 'echo -e "\n${RED}Script interrupted${NC}"; exit 1' INT TERM

# Run main function
main "$@"