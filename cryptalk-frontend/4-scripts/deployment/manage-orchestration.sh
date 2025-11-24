#!/bin/bash

# Script de gerenciamento do sistema de orquestração
# Uso: ./manage-orchestration.sh [start|stop|restart|status|test|monitor|cleanup]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$SCRIPT_DIR/claude-service"
ORCHESTRATOR_PID_FILE="/tmp/orchestrator.pid"
DOCKER_COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Verificando dependências..."
    
    # Verificar Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js não encontrado. Instale o Node.js 18+ primeiro."
        exit 1
    fi
    
    # Verificar Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker não encontrado. Instale o Docker primeiro."
        exit 1
    fi
    
    # Verificar se Docker está rodando
    if ! docker info &> /dev/null; then
        log_error "Docker não está rodando. Inicie o Docker primeiro."
        exit 1
    fi
    
    # Verificar npm dependencies
    if [ ! -d "$SERVICE_DIR/node_modules" ]; then
        log_info "Instalando dependências do Node.js..."
        cd "$SERVICE_DIR" && npm install
    fi
    
    log_success "Todas as dependências estão OK"
}

setup_docker_environment() {
    log_info "Configurando ambiente Docker..."
    
    # Criar rede Docker se não existir
    if ! docker network ls | grep -q "claude-network"; then
        log_info "Criando rede Docker claude-network..."
        docker network create claude-network
    fi
    
    # Verificar se a imagem claude-user-env existe
    if ! docker image ls | grep -q "claude-user-env"; then
        log_warning "Imagem claude-user-env não encontrada."
        log_info "Construindo imagem claude-user-env..."
        
        if [ -f "$SERVICE_DIR/Dockerfile.user-env" ]; then
            docker build -t claude-user-env -f "$SERVICE_DIR/Dockerfile.user-env" "$SERVICE_DIR"
        else
            log_error "Dockerfile.user-env não encontrado em $SERVICE_DIR"
            exit 1
        fi
    fi
    
    log_success "Ambiente Docker configurado"
}

start_orchestrator() {
    log_info "Iniciando orquestrador..."
    
    if [ -f "$ORCHESTRATOR_PID_FILE" ]; then
        local pid=$(cat "$ORCHESTRATOR_PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            log_warning "Orquestrador já está rodando (PID: $pid)"
            return 0
        fi
    fi
    
    # Configurar variáveis de ambiente
    export NODE_ENV=production
    export PORT=3000
    export WS_PORT=8080
    
    # Iniciar o orquestrador em background
    cd "$SERVICE_DIR"
    nohup node orchestrator.js > orchestrator.log 2>&1 &
    local pid=$!
    
    echo $pid > "$ORCHESTRATOR_PID_FILE"
    
    # Aguardar o serviço ficar pronto
    sleep 3
    
    if kill -0 "$pid" 2>/dev/null; then
        log_success "Orquestrador iniciado (PID: $pid)"
        log_info "Logs disponíveis em: $SERVICE_DIR/orchestrator.log"
        log_info "API disponível em: http://localhost:3000"
        log_info "WebSocket disponível em: ws://localhost:8080"
    else
        log_error "Falha ao iniciar orquestrador"
        exit 1
    fi
}

stop_orchestrator() {
    log_info "Parando orquestrador..."
    
    if [ -f "$ORCHESTRATOR_PID_FILE" ]; then
        local pid=$(cat "$ORCHESTRATOR_PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid"
            
            # Aguardar o processo terminar
            local count=0
            while kill -0 "$pid" 2>/dev/null && [ $count -lt 10 ]; do
                sleep 1
                count=$((count + 1))
            done
            
            if kill -0 "$pid" 2>/dev/null; then
                log_warning "Processo não terminou voluntariamente, forçando..."
                kill -9 "$pid"
            fi
            
            log_success "Orquestrador parado"
        else
            log_warning "Orquestrador não estava rodando"
        fi
        rm -f "$ORCHESTRATOR_PID_FILE"
    else
        log_warning "Arquivo PID não encontrado"
    fi
}

get_status() {
    log_info "Verificando status do orquestrador..."
    
    if [ -f "$ORCHESTRATOR_PID_FILE" ]; then
        local pid=$(cat "$ORCHESTRATOR_PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            log_success "Orquestrador está rodando (PID: $pid)"
            
            # Verificar se a API está respondendo
            if curl -s http://localhost:3000/health > /dev/null 2>&1; then
                log_success "API está respondendo"
            else
                log_warning "API não está respondendo"
            fi
            
            # Mostrar métricas básicas
            local metrics=$(curl -s http://localhost:3000/api/metrics 2>/dev/null)
            if [ $? -eq 0 ]; then
                echo "$metrics" | jq '.containers' 2>/dev/null || echo "$metrics"
            fi
        else
            log_error "Orquestrador não está rodando"
            return 1
        fi
    else
        log_error "Orquestrador não está rodando"
        return 1
    fi
}

run_tests() {
    log_info "Executando testes do sistema..."
    
    # Verificar se o orquestrador está rodando
    if ! get_status > /dev/null 2>&1; then
        log_error "Orquestrador não está rodando. Inicie-o primeiro."
        exit 1
    fi
    
    # Executar testes
    cd "$SCRIPT_DIR"
    node test-orchestration-system.js
}

start_monitor() {
    log_info "Iniciando monitor do sistema..."
    
    # Verificar se o orquestrador está rodando
    if ! get_status > /dev/null 2>&1; then
        log_error "Orquestrador não está rodando. Inicie-o primeiro."
        exit 1
    fi
    
    # Iniciar monitor
    cd "$SERVICE_DIR"
    node monitor.js
}

cleanup_containers() {
    log_info "Limpando containers órfãos..."
    
    # Parar e remover containers claude-user-*
    local containers=$(docker ps -a --filter "name=claude-user-" --format "{{.Names}}")
    
    if [ -n "$containers" ]; then
        log_info "Removendo containers: $containers"
        echo "$containers" | xargs -r docker rm -f
    else
        log_info "Nenhum container orphão encontrado"
    fi
    
    # Remover volumes órfãos
    local volumes=$(docker volume ls --filter "label=com.crystalk.managed=true" --format "{{.Name}}")
    
    if [ -n "$volumes" ]; then
        log_info "Removendo volumes: $volumes"
        echo "$volumes" | xargs -r docker volume rm
    else
        log_info "Nenhum volume órfão encontrado"
    fi
    
    # Limpar imagens não utilizadas
    docker image prune -f
    
    log_success "Limpeza concluída"
}

show_logs() {
    log_info "Mostrando logs do orquestrador..."
    
    if [ -f "$SERVICE_DIR/orchestrator.log" ]; then
        tail -f "$SERVICE_DIR/orchestrator.log"
    else
        log_error "Arquivo de log não encontrado"
        exit 1
    fi
}

show_usage() {
    echo "Uso: $0 [comando]"
    echo ""
    echo "Comandos disponíveis:"
    echo "  start     - Iniciar o orquestrador"
    echo "  stop      - Parar o orquestrador"
    echo "  restart   - Reiniciar o orquestrador"
    echo "  status    - Verificar status do orquestrador"
    echo "  test      - Executar testes do sistema"
    echo "  monitor   - Iniciar monitor em tempo real"
    echo "  cleanup   - Limpar containers e volumes órfãos"
    echo "  logs      - Mostrar logs do orquestrador"
    echo "  setup     - Configurar ambiente inicial"
    echo ""
}

# Comando principal
case "$1" in
    start)
        check_dependencies
        setup_docker_environment
        start_orchestrator
        ;;
    stop)
        stop_orchestrator
        ;;
    restart)
        stop_orchestrator
        sleep 2
        check_dependencies
        setup_docker_environment
        start_orchestrator
        ;;
    status)
        get_status
        ;;
    test)
        run_tests
        ;;
    monitor)
        start_monitor
        ;;
    cleanup)
        cleanup_containers
        ;;
    logs)
        show_logs
        ;;
    setup)
        check_dependencies
        setup_docker_environment
        log_success "Ambiente configurado com sucesso"
        ;;
    *)
        show_usage
        exit 1
        ;;
esac