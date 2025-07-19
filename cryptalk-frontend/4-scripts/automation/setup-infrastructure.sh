#!/bin/bash

# CrysTalk Infrastructure Setup Script
# ====================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root"
   exit 1
fi

# Check prerequisites
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

# Check available space
AVAILABLE_SPACE=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
if [ "$AVAILABLE_SPACE" -lt 10 ]; then
    error "Insufficient disk space. At least 10GB required."
    exit 1
fi

success "Prerequisites check passed"

# Create directory structure
log "Creating directory structure..."

# Main directories
mkdir -p /var/lib/cryptalk/{postgres,redis,elasticsearch,kibana,prometheus,grafana}
mkdir -p logs/{nginx,haproxy,postgres,redis,elasticsearch,kibana,prometheus,grafana}
mkdir -p backups
mkdir -p ssl/certs ssl/private

# Configuration directories
mkdir -p nginx/conf.d nginx/errors nginx/static
mkdir -p haproxy/errors
mkdir -p postgres/init
mkdir -p redis/conf
mkdir -p elasticsearch/config
mkdir -p kibana/config
mkdir -p prometheus/rules
mkdir -p grafana/dashboards grafana/provisioning/{dashboards,datasources}
mkdir -p logstash/templates

success "Directory structure created"

# Set permissions
log "Setting permissions..."
sudo chown -R $(whoami):$(whoami) /var/lib/cryptalk
sudo chown -R $(whoami):$(whoami) logs/
sudo chown -R $(whoami):$(whoami) backups/
chmod +x scripts/backup.sh

success "Permissions set"

# Generate SSL certificates
log "Generating SSL certificates..."
if [ ! -f ssl/certs/nginx-selfsigned.crt ]; then
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ssl/private/nginx-selfsigned.key \
        -out ssl/certs/nginx-selfsigned.crt \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=cryptalk.local"
    
    success "SSL certificates generated"
else
    warning "SSL certificates already exist"
fi

# Create environment file
log "Creating environment file..."
if [ ! -f .env ]; then
    cat > .env << EOF
# CrysTalk Environment Configuration
# =================================

# Database Configuration
DB_NAME=cryptalk
DB_USER=cryptalk_user
DB_PASSWORD=secure_password_123_$(date +%s)

# Redis Configuration
REDIS_PASSWORD=cryptalk_redis_password_123_$(date +%s)

# Grafana Configuration
GRAFANA_PASSWORD=admin123_$(date +%s)

# Backup Configuration
BACKUP_SCHEDULE=0 2 * * *

# Elasticsearch Configuration
ES_JAVA_OPTS=-Xms512m -Xmx512m

# Monitoring Configuration
PROMETHEUS_RETENTION_TIME=30d
PROMETHEUS_RETENTION_SIZE=10GB

# Network Configuration
FRONTEND_SUBNET=172.20.0.0/24
BACKEND_SUBNET=172.21.0.0/24
DATABASE_SUBNET=172.22.0.0/24
CACHE_SUBNET=172.23.0.0/24
MONITORING_SUBNET=172.24.0.0/24
LOGGING_SUBNET=172.25.0.0/24

# S3 Backup (optional)
# S3_BUCKET=cryptalk-backups
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=

# Webhook notifications (optional)
# WEBHOOK_URL=https://hooks.slack.com/services/...
EOF
    success "Environment file created"
else
    warning "Environment file already exists"
fi

# Create nginx default page
log "Creating nginx default page..."
cat > nginx/static/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>CrysTalk - Infrastructure Ready</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 50px; }
        .container { max-width: 800px; margin: 0 auto; }
        .status { color: green; }
    </style>
</head>
<body>
    <div class="container">
        <h1>CrysTalk Infrastructure</h1>
        <p class="status">Infrastructure is ready and running!</p>
        <h2>Available Services:</h2>
        <ul>
            <li><a href="http://localhost:3001">Grafana Dashboard</a></li>
            <li><a href="http://localhost:9090">Prometheus Metrics</a></li>
            <li><a href="http://localhost:5601">Kibana Logs</a></li>
            <li><a href="http://localhost:8404/stats">HAProxy Stats</a></li>
        </ul>
    </div>
</body>
</html>
EOF

# Create nginx error pages
cat > nginx/errors/404.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>404 - Page Not Found</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 50px; text-align: center; }
        h1 { color: #333; }
    </style>
</head>
<body>
    <h1>404 - Page Not Found</h1>
    <p>The page you are looking for does not exist.</p>
</body>
</html>
EOF

cat > nginx/errors/50x.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>500 - Internal Server Error</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 50px; text-align: center; }
        h1 { color: #333; }
    </style>
</head>
<body>
    <h1>500 - Internal Server Error</h1>
    <p>Something went wrong. Please try again later.</p>
</body>
</html>
EOF

success "Nginx pages created"

# Create HAProxy error pages
log "Creating HAProxy error pages..."
mkdir -p haproxy/errors

for code in 400 403 408 500 502 503 504; do
    cat > haproxy/errors/${code}.http << EOF
HTTP/1.0 ${code} Error
Content-Type: text/html
Cache-Control: no-cache
Connection: close

<!DOCTYPE html>
<html>
<head>
    <title>${code} - Error</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 50px; text-align: center; }
        h1 { color: #333; }
    </style>
</head>
<body>
    <h1>${code} - Error</h1>
    <p>An error occurred while processing your request.</p>
</body>
</html>
EOF
done

success "HAProxy error pages created"

# Create PostgreSQL init script
log "Creating PostgreSQL init script..."
cat > postgres/init/01-init.sql << 'EOF'
-- CrysTalk Database Initialization
-- ================================

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create logs table
CREATE TABLE IF NOT EXISTS logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    level VARCHAR(10) NOT NULL,
    message TEXT NOT NULL,
    service VARCHAR(50),
    metadata JSONB,
    INDEX idx_logs_created_at ON logs(created_at),
    INDEX idx_logs_level ON logs(level),
    INDEX idx_logs_service ON logs(service)
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    user_id UUID REFERENCES users(id),
    data JSONB,
    INDEX idx_sessions_expires_at ON sessions(expires_at),
    INDEX idx_sessions_user_id ON sessions(user_id)
);

-- Create metrics table
CREATE TABLE IF NOT EXISTS metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,2) NOT NULL,
    tags JSONB,
    INDEX idx_metrics_created_at ON metrics(created_at),
    INDEX idx_metrics_name ON metrics(metric_name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_logs_metadata ON logs USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_users_metadata ON users USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_sessions_data ON sessions USING GIN(data);
CREATE INDEX IF NOT EXISTS idx_metrics_tags ON metrics USING GIN(tags);

-- Insert sample data
INSERT INTO logs (level, message, service) VALUES 
('INFO', 'Database initialized successfully', 'postgres'),
('INFO', 'CrysTalk infrastructure ready', 'system');
EOF

success "PostgreSQL init script created"

# Create Grafana provisioning
log "Creating Grafana provisioning..."
cat > grafana/provisioning/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true

  - name: Elasticsearch
    type: elasticsearch
    access: proxy
    url: http://elasticsearch:9200
    database: "cryptalk-logs-*"
    interval: Daily
    timeField: "@timestamp"
    editable: true
EOF

cat > grafana/provisioning/dashboards/dashboard.yml << 'EOF'
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
EOF

success "Grafana provisioning created"

# Create Logstash template
log "Creating Logstash template..."
cat > logstash/templates/cryptalk.json << 'EOF'
{
  "index_patterns": ["cryptalk-*"],
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 1,
    "index.refresh_interval": "30s",
    "index.mapping.total_fields.limit": 2000
  },
  "mappings": {
    "properties": {
      "@timestamp": {
        "type": "date"
      },
      "level": {
        "type": "keyword"
      },
      "message": {
        "type": "text",
        "analyzer": "standard"
      },
      "service": {
        "type": "keyword"
      },
      "environment": {
        "type": "keyword"
      },
      "application": {
        "type": "keyword"
      },
      "response_time": {
        "type": "float"
      },
      "status": {
        "type": "integer"
      },
      "client_ip": {
        "type": "ip"
      },
      "user_agent": {
        "type": "text"
      },
      "geoip": {
        "properties": {
          "location": {
            "type": "geo_point"
          },
          "country_name": {
            "type": "keyword"
          },
          "city_name": {
            "type": "keyword"
          }
        }
      }
    }
  }
}
EOF

success "Logstash template created"

# Create health check script
log "Creating health check script..."
cat > scripts/health-check.sh << 'EOF'
#!/bin/bash

# CrysTalk Health Check Script
# ============================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Services to check
services=(
    "nginx:80"
    "haproxy:8080"
    "redis:6379"
    "postgres:5432"
    "elasticsearch:9200"
    "kibana:5601"
    "prometheus:9090"
    "grafana:3000"
)

log() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Check Docker containers
log "Checking Docker containers..."
docker-compose -f docker-compose.infrastructure.yml ps

# Check services
log "Checking services health..."
for service in "${services[@]}"; do
    name=$(echo $service | cut -d: -f1)
    port=$(echo $service | cut -d: -f2)
    
    if nc -z localhost $port 2>/dev/null; then
        success "$name is running on port $port"
    else
        error "$name is not responding on port $port"
    fi
done

# Check disk space
log "Checking disk space..."
df -h /var/lib/cryptalk

# Check memory usage
log "Checking memory usage..."
docker stats --no-stream

success "Health check completed"
EOF

chmod +x scripts/health-check.sh

success "Health check script created"

# Create systemd service (optional)
log "Creating systemd service..."
if command -v systemctl &> /dev/null; then
    sudo tee /etc/systemd/system/cryptalk.service > /dev/null << EOF
[Unit]
Description=CrysTalk Infrastructure
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/docker-compose -f docker-compose.infrastructure.yml up -d
ExecStop=/usr/bin/docker-compose -f docker-compose.infrastructure.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    success "Systemd service created"
else
    warning "Systemd not available, skipping service creation"
fi

# Final messages
success "Infrastructure setup completed!"
echo ""
log "Next steps:"
echo "1. Review the .env file and update passwords"
echo "2. Start the infrastructure: docker-compose -f docker-compose.infrastructure.yml up -d"
echo "3. Run health check: ./scripts/health-check.sh"
echo "4. Access services:"
echo "   - Grafana: http://localhost:3001"
echo "   - Prometheus: http://localhost:9090"
echo "   - Kibana: http://localhost:5601"
echo "   - HAProxy Stats: http://localhost:8404/stats"
echo ""
warning "Make sure to secure your passwords and SSL certificates in production!"