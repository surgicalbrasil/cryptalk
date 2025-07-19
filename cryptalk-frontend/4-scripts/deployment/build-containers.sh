#!/bin/bash

# Script para construir containers do Claude Code
set -e

echo "🐳 Construindo containers do Claude Code..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Verificar se Docker está rodando
if ! docker info >/dev/null 2>&1; then
    error "Docker não está rodando. Inicie o Docker primeiro."
    exit 1
fi

# Criar network se não existir
log "Criando network claude-network..."
docker network create claude-network 2>/dev/null || warn "Network claude-network já existe"

# Build da imagem do orquestrador
log "Construindo imagem do orquestrador..."
docker build -t claude-orchestrator:latest ./claude-service/

# Build da imagem do ambiente de usuário
log "Construindo imagem do ambiente de usuário..."
docker build -f ./claude-service/Dockerfile.user-env -t claude-user-env:latest ./claude-service/

# Criar volumes necessários
log "Criando volumes..."
docker volume create claude-logs 2>/dev/null || warn "Volume claude-logs já existe"
docker volume create claude-config 2>/dev/null || warn "Volume claude-config já existe"
docker volume create claude-redis-data 2>/dev/null || warn "Volume claude-redis-data já existe"
docker volume create claude-postgres-data 2>/dev/null || warn "Volume claude-postgres-data já existe"

# Verificar se arquivo .env existe
if [ ! -f .env ]; then
    log "Criando arquivo .env de exemplo..."
    cat > .env << EOF
# Claude API
CLAUDE_API_KEY=your_claude_api_key_here

# Database
POSTGRES_PASSWORD=claude_secure_password_123

# Monitoring
GRAFANA_PASSWORD=admin_password_123

# Container Settings
MAX_CONTAINERS=20
CONTAINER_TIMEOUT=30m

# Security
JWT_SECRET=your_jwt_secret_here
ENCRYPT_KEY=your_encryption_key_here

# Environment
NODE_ENV=production
LOG_LEVEL=info
EOF
    warn "Arquivo .env criado. Configure as variáveis antes de executar."
fi

# Criar diretórios necessários
log "Criando estrutura de diretórios..."
mkdir -p monitoring/grafana/{dashboards,provisioning/{dashboards,datasources}}
mkdir -p monitoring/prometheus
mkdir -p nginx/ssl
mkdir -p claude-service/sql

# Criar configuração básica do Prometheus
if [ ! -f monitoring/prometheus.yml ]; then
    log "Criando configuração do Prometheus..."
    cat > monitoring/prometheus.yml << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

scrape_configs:
  - job_name: 'claude-orchestrator'
    static_configs:
      - targets: ['claude-orchestrator:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:80']
EOF
fi

# Criar configuração básica do Nginx
if [ ! -f nginx/nginx.conf ]; then
    log "Criando configuração do Nginx..."
    cat > nginx/nginx.conf << EOF
events {
    worker_connections 1024;
}

http {
    upstream claude_backend {
        server claude-orchestrator:3000;
    }

    server {
        listen 80;
        server_name localhost;

        location / {
            proxy_pass http://claude_backend;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }

        location /ws {
            proxy_pass http://claude_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host \$host;
        }

        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF
fi

# Criar script SQL de inicialização
if [ ! -f claude-service/sql/init.sql ]; then
    log "Criando script de inicialização do banco..."
    cat > claude-service/sql/init.sql << EOF
-- Inicialização do banco de dados Claude
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id VARCHAR(255) UNIQUE NOT NULL,
    resource_type VARCHAR(50) DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active',
    metadata JSONB DEFAULT '{}'
);

-- Tabela de containers
CREATE TABLE IF NOT EXISTS containers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id VARCHAR(255) NOT NULL,
    container_name VARCHAR(255) NOT NULL,
    container_id VARCHAR(255),
    resource_type VARCHAR(50) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'running',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- Tabela de execuções
CREATE TABLE IF NOT EXISTS executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id VARCHAR(255) NOT NULL,
    command TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    output TEXT,
    error TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_clients_client_id ON clients(client_id);
CREATE INDEX IF NOT EXISTS idx_containers_client_id ON containers(client_id);
CREATE INDEX IF NOT EXISTS idx_executions_client_id ON executions(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_last_activity ON clients(last_activity);
CREATE INDEX IF NOT EXISTS idx_containers_status ON containers(status);
CREATE INDEX IF NOT EXISTS idx_executions_status ON executions(status);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS \$\$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
\$\$ language 'plpgsql';

CREATE TRIGGER update_containers_updated_at 
    BEFORE UPDATE ON containers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EOF
fi

# Testar builds
log "Testando imagens construídas..."
docker run --rm claude-orchestrator:latest node --version
docker run --rm claude-user-env:latest node --version

success "✅ Containers construídos com sucesso!"
echo
echo "📋 Próximos passos:"
echo "1. Configure o arquivo .env com suas chaves de API"
echo "2. Execute: docker-compose up -d"
echo "3. Acesse: http://localhost:3000"
echo "4. Monitoring: http://localhost:3001 (Grafana)"
echo "5. Metrics: http://localhost:9090 (Prometheus)"
echo
echo "🔧 Comandos úteis:"
echo "• docker-compose up -d          # Iniciar todos os serviços"
echo "• docker-compose logs -f        # Ver logs em tempo real"
echo "• docker-compose down           # Parar todos os serviços"
echo "• docker-compose ps             # Ver status dos serviços"
echo "• ./test-orchestration.sh       # Executar testes"