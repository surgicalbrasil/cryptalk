#!/bin/bash

# ===========================================
# CRYPTALK PRODUCTION DEPLOYMENT SCRIPT
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="cryptalk"
COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE=".env.production"
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓ $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠ $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗ $1${NC}"
}

# Check if script is run as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root for security reasons"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if .env.production exists
    if [[ ! -f "$ENV_FILE" ]]; then
        error ".env.production file not found"
        exit 1
    fi
    
    # Check if docker-compose.production.yml exists
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        error "docker-compose.production.yml file not found"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Create necessary directories
create_directories() {
    log "Creating necessary directories..."
    
    directories=(
        "logs"
        "uploads"
        "backups"
        "nginx/logs"
        "nginx/ssl"
        "nginx/cache"
        "haproxy/logs"
        "redis/logs"
        "postgres/logs"
        "postgres/backups"
        "elasticsearch/logs"
        "kibana/logs"
        "logstash/logs"
        "grafana/logs"
        "prometheus/logs"
    )
    
    for dir in "${directories[@]}"; do
        if [[ ! -d "$dir" ]]; then
            mkdir -p "$dir"
            log "Created directory: $dir"
        fi
    done
    
    success "Directories created successfully"
}

# Backup existing data
backup_data() {
    log "Creating backup of existing data..."
    
    if [[ -d "postgres-data" ]] || [[ -d "redis-data" ]]; then
        mkdir -p "$BACKUP_DIR"
        
        # Backup PostgreSQL data
        if [[ -d "postgres-data" ]]; then
            cp -r postgres-data "$BACKUP_DIR/"
            log "PostgreSQL data backed up"
        fi
        
        # Backup Redis data
        if [[ -d "redis-data" ]]; then
            cp -r redis-data "$BACKUP_DIR/"
            log "Redis data backed up"
        fi
        
        # Backup configuration files
        cp -r nginx "$BACKUP_DIR/" 2>/dev/null || true
        cp -r haproxy "$BACKUP_DIR/" 2>/dev/null || true
        
        success "Backup completed: $BACKUP_DIR"
    else
        log "No existing data to backup"
    fi
}

# Pull latest images
pull_images() {
    log "Pulling latest Docker images..."
    
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull
    
    success "Images pulled successfully"
}

# Build custom images
build_images() {
    log "Building custom Docker images..."
    
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --no-cache
    
    success "Images built successfully"
}

# Deploy services
deploy_services() {
    log "Deploying services..."
    
    # Stop existing services
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down --remove-orphans
    
    # Start services in order
    log "Starting database services..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d postgres redis
    
    # Wait for databases to be ready
    log "Waiting for databases to be ready..."
    sleep 30
    
    log "Starting application services..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d api claude-orchestrator
    
    # Wait for application services
    log "Waiting for application services to be ready..."
    sleep 20
    
    log "Starting frontend and proxy services..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d frontend nginx haproxy
    
    log "Starting monitoring services..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d prometheus grafana
    
    log "Starting logging services..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d elasticsearch logstash kibana
    
    log "Starting utility services..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d cloudflared backup watchtower
    
    success "Services deployed successfully"
}

# Health check
health_check() {
    log "Performing health checks..."
    
    # Wait for services to be fully ready
    sleep 60
    
    # Check service health
    services=(
        "cryptalk-postgres:5432"
        "cryptalk-redis:6379"
        "cryptalk-api:3001"
        "cryptalk-frontend:3000"
        "cryptalk-nginx:80"
        "cryptalk-prometheus:9090"
        "cryptalk-grafana:3000"
        "cryptalk-elasticsearch:9200"
    )
    
    for service in "${services[@]}"; do
        container=$(echo "$service" | cut -d: -f1)
        port=$(echo "$service" | cut -d: -f2)
        
        if docker exec "$container" nc -z localhost "$port" 2>/dev/null; then
            success "Health check passed: $container"
        else
            warning "Health check failed: $container"
        fi
    done
}

# Show service status
show_status() {
    log "Service status:"
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
    
    echo
    log "Service URLs:"
    echo "  Frontend: http://localhost:3000"
    echo "  API: http://localhost:3001"
    echo "  Nginx: http://localhost"
    echo "  HAProxy Stats: http://localhost:8404/stats"
    echo "  Grafana: http://localhost:3002"
    echo "  Prometheus: http://localhost:9090"
    echo "  Kibana: http://localhost:5601"
    echo "  Elasticsearch: http://localhost:9200"
}

# Setup SSL certificates
setup_ssl() {
    log "Setting up SSL certificates..."
    
    if [[ ! -f "nginx/ssl/cryptalk.crt" ]]; then
        warning "SSL certificate not found, generating self-signed certificate..."
        
        mkdir -p nginx/ssl
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout nginx/ssl/cryptalk.key \
            -out nginx/ssl/cryptalk.crt \
            -subj "/C=US/ST=CA/L=San Francisco/O=CrysTalk/CN=localhost"
        
        log "Self-signed certificate generated"
    else
        success "SSL certificate already exists"
    fi
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring configuration..."
    
    # Create Prometheus configuration if it doesn't exist
    if [[ ! -f "prometheus/prometheus.yml" ]]; then
        mkdir -p prometheus
        cat > prometheus/prometheus.yml << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "rules/*.yml"

scrape_configs:
  - job_name: 'cryptalk-api'
    static_configs:
      - targets: ['api:3001']
  
  - job_name: 'cryptalk-frontend'
    static_configs:
      - targets: ['frontend:3000']
  
  - job_name: 'cryptalk-nginx'
    static_configs:
      - targets: ['nginx:80']
  
  - job_name: 'cryptalk-postgres'
    static_configs:
      - targets: ['postgres:5432']
  
  - job_name: 'cryptalk-redis'
    static_configs:
      - targets: ['redis:6379']
EOF
        log "Prometheus configuration created"
    fi
    
    # Create Grafana dashboards directory
    mkdir -p grafana/dashboards grafana/provisioning
    
    success "Monitoring setup completed"
}

# Main execution
main() {
    log "Starting CrysTalk Production Deployment..."
    
    check_root
    check_prerequisites
    create_directories
    setup_ssl
    setup_monitoring
    backup_data
    pull_images
    build_images
    deploy_services
    health_check
    show_status
    
    success "Deployment completed successfully!"
    echo
    warning "Important: Please update the following configurations:"
    echo "  1. Update .env.production with your actual API keys and passwords"
    echo "  2. Configure your domain DNS to point to this server"
    echo "  3. Set up proper SSL certificates (replace self-signed ones)"
    echo "  4. Configure Cloudflare tunnel token"
    echo "  5. Review and adjust resource limits based on your server capacity"
    echo
    log "You can view logs with: docker-compose -f $COMPOSE_FILE logs -f [service_name]"
    log "To stop all services: docker-compose -f $COMPOSE_FILE down"
}

# Handle script interruption
trap 'error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"