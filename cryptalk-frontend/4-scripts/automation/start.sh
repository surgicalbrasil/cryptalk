#!/bin/bash

# Script para iniciar o Claude Code Docker Service
# Este script gerencia o ciclo de vida completo do serviço

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Função para logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

# Configurações
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"
BACKUP_DIR="backups"
LOG_DIR="logs"

# Verificar se o Docker está instalado e rodando
check_docker() {
    if ! command -v docker &> /dev/null; then
        error "Docker não está instalado"
        exit 1
    fi
    
    if ! docker info > /dev/null 2>&1; then
        error "Docker não está rodando"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose não está instalado"
        exit 1
    fi
    
    success "Docker e Docker Compose verificados"
}

# Verificar arquivos de configuração
check_config() {
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        error "Arquivo docker-compose.yml não encontrado"
        exit 1
    fi
    
    if [[ ! -f "$ENV_FILE" ]]; then
        warning "Arquivo .env não encontrado, criando com valores padrão..."
        create_env_file
    fi
    
    success "Arquivos de configuração verificados"
}

# Criar arquivo .env se não existir
create_env_file() {
    cat > "$ENV_FILE" << 'EOF'
# Configurações do Claude Code
NODE_ENV=production
PORT=3000
REDIS_PASSWORD=secure_redis_password
DB_NAME=claude_code
DB_USER=claude_user
DB_PASSWORD=secure_db_password
GRAFANA_PASSWORD=admin
JWT_SECRET=your-super-secret-jwt-key-change-this
EOF
    
    warning "Arquivo .env criado. Por favor, revise e ajuste as configurações antes de continuar."
    warning "Especialmente: REDIS_PASSWORD, DB_PASSWORD, JWT_SECRET"
}

# Criar diretórios necessários
create_directories() {
    local dirs=(
        "$BACKUP_DIR"
        "$LOG_DIR"
        "nginx/logs"
        "nginx/ssl"
        "nginx/static"
        "nginx/errors"
        "claude-service/uploads/pending"
        "claude-service/uploads/processing"
        "claude-service/uploads/completed"
        "claude-service/uploads/failed"
        "claude-service/logs"
        "monitoring/grafana/dashboards"
        "monitoring/grafana/provisioning"
    )
    
    for dir in "${dirs[@]}"; do
        mkdir -p "$dir"
        log "Criado diretório: $dir"
    done
    
    success "Diretórios criados"
}

# Verificar portas disponíveis
check_ports() {
    local ports=(80 443 3000 3001 5432 6379 9090 9091)
    local used_ports=()
    
    for port in "${ports[@]}"; do
        if netstat -tuln | grep -q ":$port "; then
            used_ports+=("$port")
        fi
    done
    
    if [[ ${#used_ports[@]} -gt 0 ]]; then
        warning "Portas em uso: ${used_ports[*]}"
        warning "Isso pode causar conflitos. Considere parar os serviços ou alterar as portas."
    else
        success "Todas as portas estão disponíveis"
    fi
}

# Fazer backup antes de iniciar
backup_data() {
    if [[ -d "claude-service/uploads/completed" ]] && [[ -n "$(ls -A claude-service/uploads/completed)" ]]; then
        local backup_file="$BACKUP_DIR/claude-backup-$(date +%Y%m%d_%H%M%S).tar.gz"
        
        log "Criando backup..."
        tar -czf "$backup_file" \
            claude-service/uploads/completed \
            claude-service/logs \
            .env \
            docker-compose.yml 2>/dev/null || true
        
        if [[ -f "$backup_file" ]]; then
            success "Backup criado: $backup_file"
        else
            warning "Falha ao criar backup"
        fi
    else
        log "Nenhum dado para backup"
    fi
}

# Baixar imagens Docker
pull_images() {
    log "Baixando imagens Docker..."
    docker-compose pull
    success "Imagens baixadas"
}

# Construir imagens personalizadas
build_images() {
    log "Construindo imagens personalizadas..."
    docker-compose build --no-cache
    success "Imagens construídas"
}

# Iniciar serviços
start_services() {
    log "Iniciando serviços..."
    docker-compose up -d
    
    # Aguardar serviços ficarem prontos
    local services=("redis" "postgres" "claude-service" "monitoring" "nginx")
    
    for service in "${services[@]}"; do
        log "Aguardando $service ficar pronto..."
        
        local max_attempts=30
        local attempt=0
        
        while [[ $attempt -lt $max_attempts ]]; do
            if docker-compose ps "$service" | grep -q "healthy\|Up"; then
                success "$service está pronto"
                break
            fi
            
            ((attempt++))
            sleep 2
        done
        
        if [[ $attempt -eq $max_attempts ]]; then
            error "$service não ficou pronto a tempo"
            return 1
        fi
    done
    
    success "Todos os serviços estão rodando"
}

# Verificar saúde dos serviços
check_health() {
    log "Verificando saúde dos serviços..."
    
    local endpoints=(
        "http://localhost:3000/health:Claude Service"
        "http://localhost:9090/health:Monitoring"
        "http://localhost/nginx-health:Nginx"
        "http://localhost:3001:Grafana"
    )
    
    local failed=0
    
    for endpoint in "${endpoints[@]}"; do
        local url="${endpoint%:*}"
        local name="${endpoint#*:}"
        
        if curl -f -s "$url" > /dev/null; then
            success "$name está saudável"
        else
            error "$name falha no health check"
            failed=1
        fi
    done
    
    if [[ $failed -eq 0 ]]; then
        success "Todos os serviços estão saudáveis"
        return 0
    else
        error "Alguns serviços falharam no health check"
        return 1
    fi
}

# Mostrar status dos serviços
show_status() {
    log "Status dos serviços:"
    docker-compose ps
    
    echo ""
    log "Uso de recursos:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
    
    echo ""
    log "Endereços dos serviços:"
    echo "  - Claude Service: http://localhost:3000"
    echo "  - Monitoring: http://localhost:9090"
    echo "  - Grafana: http://localhost:3001 (admin/admin)"
    echo "  - Prometheus: http://localhost:9091"
    echo "  - Nginx: http://localhost"
}

# Configurar logs
setup_logs() {
    log "Configurando logs..."
    
    # Configurar logrotate
    cat > /etc/logrotate.d/claude-code << 'EOF'
/opt/claude-code/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    create 644 root root
    postrotate
        docker-compose exec claude-service kill -USR1 1 2>/dev/null || true
    endscript
}
EOF
    
    success "Logs configurados"
}

# Configurar monitoramento
setup_monitoring() {
    log "Configurando monitoramento..."
    
    # Aguardar Grafana ficar pronto
    local max_attempts=60
    local attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        if curl -f -s http://localhost:3001/api/health > /dev/null; then
            break
        fi
        ((attempt++))
        sleep 1
    done
    
    if [[ $attempt -eq $max_attempts ]]; then
        warning "Grafana não ficou pronto para configuração"
        return 1
    fi
    
    # Configurar datasource do Prometheus
    curl -X POST \
        -H "Content-Type: application/json" \
        -u admin:admin \
        -d '{
            "name": "Prometheus",
            "type": "prometheus",
            "url": "http://prometheus:9090",
            "access": "proxy",
            "isDefault": true
        }' \
        http://localhost:3001/api/datasources 2>/dev/null || true
    
    success "Monitoramento configurado"
}

# Função de limpeza
cleanup() {
    log "Executando limpeza..."
    ./scripts/docker-cleanup.sh --auto
    success "Limpeza concluída"
}

# Parar serviços
stop_services() {
    log "Parando serviços..."
    docker-compose down
    success "Serviços parados"
}

# Remover tudo
remove_all() {
    warning "Removendo todos os serviços e dados..."
    read -p "Tem certeza? (digite 'CONFIRMAR' para continuar): " confirmation
    
    if [[ "$confirmation" == "CONFIRMAR" ]]; then
        docker-compose down -v --rmi all --remove-orphans
        success "Tudo removido"
    else
        log "Operação cancelada"
    fi
}

# Mostrar logs
show_logs() {
    local service="${1:-}"
    
    if [[ -n "$service" ]]; then
        docker-compose logs -f "$service"
    else
        docker-compose logs -f
    fi
}

# Função de ajuda
show_help() {
    cat << EOF
Claude Code Docker Service Manager

USO:
    $0 [COMANDO] [OPÇÕES]

COMANDOS:
    start               Iniciar todos os serviços
    stop                Parar todos os serviços
    restart             Reiniciar todos os serviços
    status              Mostrar status dos serviços
    health              Verificar saúde dos serviços
    logs [service]      Mostrar logs (de um serviço específico se fornecido)
    backup              Fazer backup dos dados
    cleanup             Limpar containers e imagens não utilizados
    remove              Remover todos os serviços e dados
    build               Construir imagens personalizadas
    pull                Baixar imagens Docker
    update              Atualizar e reiniciar serviços
    help                Mostrar esta ajuda

EXEMPLOS:
    $0 start            # Iniciar todos os serviços
    $0 logs nginx       # Mostrar logs do Nginx
    $0 health           # Verificar saúde dos serviços
    $0 cleanup          # Limpar containers não utilizados
EOF
}

# Função principal
main() {
    local command="${1:-start}"
    
    case "$command" in
        start)
            check_docker
            check_config
            create_directories
            check_ports
            backup_data
            pull_images
            build_images
            start_services
            sleep 10
            check_health
            setup_logs
            setup_monitoring
            show_status
            ;;
        stop)
            stop_services
            ;;
        restart)
            stop_services
            sleep 5
            start_services
            ;;
        status)
            show_status
            ;;
        health)
            check_health
            ;;
        logs)
            show_logs "${2:-}"
            ;;
        backup)
            backup_data
            ;;
        cleanup)
            cleanup
            ;;
        remove)
            remove_all
            ;;
        build)
            build_images
            ;;
        pull)
            pull_images
            ;;
        update)
            pull_images
            build_images
            docker-compose up -d
            ;;
        help)
            show_help
            ;;
        *)
            error "Comando desconhecido: $command"
            show_help
            exit 1
            ;;
    esac
}

# Executar se chamado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi