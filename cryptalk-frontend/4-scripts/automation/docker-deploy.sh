#!/bin/bash

# Script para deploy do sistema CrysTalk com Docker
# ================================================

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

# Verificar se Docker está rodando
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        error "Docker não está rodando ou não está acessível"
        exit 1
    fi
}

# Verificar se docker-compose está disponível
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null; then
        error "docker-compose não está instalado"
        exit 1
    fi
}

# Verificar variáveis de ambiente
check_environment() {
    local env_file=".env"
    
    if [[ ! -f "$env_file" ]]; then
        warning "Arquivo .env não encontrado, criando um exemplo..."
        create_env_example
    fi
    
    # Verificar variáveis críticas
    source "$env_file"
    
    local required_vars=("CLAUDE_API_KEY" "VITE_API_URL")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        error "Variáveis de ambiente obrigatórias não configuradas:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        exit 1
    fi
    
    success "Variáveis de ambiente verificadas"
}

# Criar arquivo .env de exemplo
create_env_example() {
    cat > .env << EOF
# Configurações do CrysTalk Docker
# ================================

# Claude API
CLAUDE_API_KEY=your_claude_api_key_here

# URLs da aplicação
VITE_API_URL=http://localhost:3000
VITE_WEBSOCKET_URL=ws://localhost:8080

# Configurações do banco
REDIS_PASSWORD=secure_redis_password
DB_NAME=claude_code
DB_USER=claude_user
DB_PASSWORD=secure_db_password

# Configurações de monitoramento
GRAFANA_PASSWORD=admin_password

# Configurações do Docker
DOCKER_SOCKET=/var/run/docker.sock
CONTAINER_TIMEOUT=1800000
CLEANUP_INTERVAL=600000

# Configurações de segurança
NODE_ENV=production
PORT=3000
EOF
    
    warning "Arquivo .env criado. Por favor, configure as variáveis antes de continuar."
}

# Parar serviços existentes
stop_services() {
    log "Parando serviços existentes..."
    
    # Parar containers do docker-compose
    docker-compose down --remove-orphans
    
    # Parar containers individuais do CrysTalk
    docker ps -a --filter "name=claude-" --format "{{.ID}}" | xargs -r docker stop
    docker ps -a --filter "name=crystalk-" --format "{{.ID}}" | xargs -r docker stop
    
    success "Serviços parados"
}

# Construir imagens
build_images() {
    log "Construindo imagens Docker..."
    
    # Executar script de build
    ./scripts/build-docker.sh
    
    success "Imagens construídas"
}

# Iniciar serviços
start_services() {
    log "Iniciando serviços Docker..."
    
    # Iniciar com docker-compose
    docker-compose up -d
    
    # Aguardar inicialização
    log "Aguardando inicialização dos serviços..."
    sleep 15
    
    success "Serviços iniciados"
}

# Verificar saúde dos serviços
check_health() {
    log "Verificando saúde dos serviços..."
    
    local services=(
        "claude-service:3000:/health"
        "claude-monitoring:9090:/health"
        "nginx:80:/nginx-health"
    )
    
    local failed_services=()
    
    for service in "${services[@]}"; do
        IFS=':' read -r name port path <<< "$service"
        
        log "Verificando $name..."
        
        if timeout 30 bash -c "until curl -f http://localhost:$port$path > /dev/null 2>&1; do sleep 2; done"; then
            success "✓ $name está saudável"
        else
            warning "✗ $name falhou no health check"
            failed_services+=("$name")
        fi
    done
    
    if [[ ${#failed_services[@]} -gt 0 ]]; then
        error "Alguns serviços falharam no health check:"
        for service in "${failed_services[@]}"; do
            echo "  - $service"
        done
        return 1
    fi
    
    success "Todos os serviços estão saudáveis"
}

# Mostrar status dos serviços
show_status() {
    log "Status dos serviços:"
    
    echo ""
    echo "CONTAINERS:"
    docker-compose ps
    
    echo ""
    echo "NETWORKS:"
    docker network ls | grep claude
    
    echo ""
    echo "VOLUMES:"
    docker volume ls | grep claude
    
    echo ""
    echo "LOGS RECENTES:"
    docker-compose logs --tail=5
}

# Mostrar informações de acesso
show_access_info() {
    log "Informações de acesso:"
    
    echo ""
    echo "SERVIÇOS DISPONÍVEIS:"
    echo "  📱 Aplicação Principal: http://localhost:3000"
    echo "  📊 Monitoramento: http://localhost:9090"
    echo "  🔧 Grafana: http://localhost:3001"
    echo "  🗄️  Redis: localhost:6379"
    echo "  🐘 PostgreSQL: localhost:5432"
    echo ""
    echo "HEALTH CHECKS:"
    echo "  curl http://localhost:3000/health"
    echo "  curl http://localhost:9090/health"
    echo ""
    echo "LOGS:"
    echo "  docker-compose logs -f"
    echo "  docker-compose logs -f claude-service"
    echo ""
}

# Configurar túnel (se necessário)
setup_tunnel() {
    if [[ -f "tunnel-config.yml" ]] && command -v cloudflared &> /dev/null; then
        log "Configurando túnel Cloudflare..."
        
        # Verificar se o túnel já está rodando
        if pgrep -f "cloudflared tunnel" > /dev/null; then
            log "Túnel já está rodando"
        else
            # Iniciar túnel em background
            nohup ./cloudflared tunnel --config tunnel-config.yml > tunnel.log 2>&1 &
            
            # Aguardar inicialização
            sleep 5
            
            if pgrep -f "cloudflared tunnel" > /dev/null; then
                success "Túnel iniciado com sucesso"
                
                # Extrair URL do túnel
                local tunnel_url=$(grep -o "https://[^/]*trycloudflare.com" tunnel.log | head -1)
                if [[ -n "$tunnel_url" ]]; then
                    echo "  🌐 URL do túnel: $tunnel_url"
                fi
            else
                warning "Falha ao iniciar túnel"
            fi
        fi
    fi
}

# Função de limpeza
cleanup() {
    log "Executando limpeza..."
    ./scripts/docker-cleanup.sh --auto
}

# Função principal
main() {
    local action="deploy"
    local skip_build=false
    local skip_health=false
    
    # Processar argumentos
    while [[ $# -gt 0 ]]; do
        case $1 in
            --stop)
                action="stop"
                shift
                ;;
            --restart)
                action="restart"
                shift
                ;;
            --status)
                action="status"
                shift
                ;;
            --cleanup)
                action="cleanup"
                shift
                ;;
            --skip-build)
                skip_build=true
                shift
                ;;
            --skip-health)
                skip_health=true
                shift
                ;;
            --help)
                cat << EOF
Script de Deploy Docker para CrysTalk

USO:
    $0 [OPÇÕES]

OPÇÕES:
    --stop          Parar todos os serviços
    --restart       Reiniciar todos os serviços
    --status        Mostrar status dos serviços
    --cleanup       Executar limpeza de containers
    --skip-build    Pular construção de imagens
    --skip-health   Pular verificação de saúde
    --help          Mostrar esta ajuda

EXEMPLOS:
    $0              # Deploy completo
    $0 --restart    # Reiniciar serviços
    $0 --status     # Verificar status
    $0 --cleanup    # Limpeza completa
EOF
                exit 0
                ;;
            *)
                error "Opção desconhecida: $1"
                exit 1
                ;;
        esac
    done
    
    # Verificar pré-requisitos
    check_docker
    check_docker_compose
    
    # Navegar para o diretório do projeto
    cd "$(dirname "$0")/.."
    
    # Executar ação
    case $action in
        "deploy")
            log "Iniciando deploy completo do CrysTalk..."
            check_environment
            stop_services
            
            if [[ "$skip_build" != "true" ]]; then
                build_images
            fi
            
            start_services
            
            if [[ "$skip_health" != "true" ]]; then
                check_health
            fi
            
            show_status
            show_access_info
            setup_tunnel
            
            success "Deploy concluído com sucesso!"
            ;;
            
        "stop")
            log "Parando todos os serviços..."
            stop_services
            success "Serviços parados"
            ;;
            
        "restart")
            log "Reiniciando serviços..."
            stop_services
            start_services
            
            if [[ "$skip_health" != "true" ]]; then
                check_health
            fi
            
            show_status
            success "Serviços reiniciados"
            ;;
            
        "status")
            show_status
            ;;
            
        "cleanup")
            cleanup
            success "Limpeza concluída"
            ;;
    esac
}

# Executar se chamado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi