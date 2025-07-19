#!/bin/bash

# Script de limpeza Docker para Claude Code
# Remove containers, imagens e volumes não utilizados de forma segura

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

# Limpar containers Claude Code parados
cleanup_containers() {
    log "Limpando containers parados..."
    
    # Encontrar containers do Claude Code
    local containers=$(docker ps -a --filter "name=claude-user-" --filter "status=exited" -q)
    
    if [[ -n "$containers" ]]; then
        log "Removendo $(echo "$containers" | wc -l) containers parados..."
        docker rm $containers
        success "Containers removidos"
    else
        log "Nenhum container parado encontrado"
    fi
}

# Limpar containers órfãos (sem processo pai)
cleanup_orphaned_containers() {
    log "Verificando containers órfãos..."
    
    # Encontrar containers que estão rodando há mais de 2 horas
    local old_containers=$(docker ps --filter "name=claude-user-" --format "table {{.ID}}\t{{.Names}}\t{{.Status}}" | grep -E "(hours|days)" | awk '{print $1}' || true)
    
    if [[ -n "$old_containers" ]]; then
        warning "Encontrados containers antigos, removendo..."
        for container in $old_containers; do
            docker stop "$container" || true
            docker rm "$container" || true
        done
        success "Containers órfãos removidos"
    else
        log "Nenhum container órfão encontrado"
    fi
}

# Limpar imagens não utilizadas
cleanup_images() {
    log "Limpando imagens não utilizadas..."
    
    # Remover imagens penduradas (dangling)
    local dangling_images=$(docker images -f "dangling=true" -q)
    if [[ -n "$dangling_images" ]]; then
        log "Removendo imagens penduradas..."
        docker rmi $dangling_images
        success "Imagens penduradas removidas"
    fi
    
    # Remover imagens não utilizadas há mais de 24 horas
    docker image prune -a -f --filter "until=24h"
    success "Imagens antigas removidas"
}

# Limpar volumes não utilizados
cleanup_volumes() {
    log "Limpando volumes não utilizados..."
    
    local unused_volumes=$(docker volume ls -qf dangling=true)
    if [[ -n "$unused_volumes" ]]; then
        log "Removendo volumes não utilizados..."
        docker volume rm $unused_volumes
        success "Volumes removidos"
    else
        log "Nenhum volume não utilizado encontrado"
    fi
}

# Limpar networks não utilizadas
cleanup_networks() {
    log "Limpando networks não utilizadas..."
    
    docker network prune -f
    success "Networks limpas"
}

# Limpar cache do Docker
cleanup_cache() {
    log "Limpando cache do Docker..."
    
    docker system prune -f
    success "Cache limpo"
}

# Verificar e limpar logs grandes
cleanup_logs() {
    log "Verificando logs de containers..."
    
    # Encontrar logs grandes (>100MB)
    local large_logs=$(find /var/lib/docker/containers -name "*.log" -size +100M 2>/dev/null || true)
    
    if [[ -n "$large_logs" ]]; then
        warning "Encontrados logs grandes, truncando..."
        for log_file in $large_logs; do
            log "Truncando: $log_file"
            echo "" > "$log_file"
        done
        success "Logs grandes truncados"
    else
        log "Nenhum log grande encontrado"
    fi
}

# Relatório de uso de espaço
space_report() {
    log "Relatório de uso de espaço Docker:"
    
    echo "=== Uso de Espaço Docker ==="
    docker system df
    echo ""
    
    echo "=== Containers Ativos ==="
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Size}}"
    echo ""
    
    echo "=== Imagens ==="
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
    echo ""
}

# Configurar limpeza automática
setup_auto_cleanup() {
    log "Configurando limpeza automática..."
    
    local cron_job="0 2 * * * /opt/claude-code/scripts/docker-cleanup.sh --auto > /var/log/docker-cleanup.log 2>&1"
    
    # Verificar se o cron job já existe
    if crontab -l 2>/dev/null | grep -q "docker-cleanup.sh"; then
        log "Limpeza automática já está configurada"
    else
        (crontab -l 2>/dev/null; echo "$cron_job") | crontab -
        success "Limpeza automática configurada para executar diariamente às 2:00"
    fi
}

# Limpeza de emergência (remove tudo)
emergency_cleanup() {
    warning "EXECUTANDO LIMPEZA DE EMERGÊNCIA!"
    warning "Isso irá remover TODOS os containers, imagens e volumes do Claude Code"
    
    read -p "Tem certeza? (digite 'CONFIRMAR' para continuar): " confirmation
    
    if [[ "$confirmation" != "CONFIRMAR" ]]; then
        log "Limpeza de emergência cancelada"
        return
    fi
    
    log "Parando todos os containers do Claude Code..."
    docker ps --filter "name=claude-user-" -q | xargs -r docker stop
    
    log "Removendo todos os containers do Claude Code..."
    docker ps -a --filter "name=claude-user-" -q | xargs -r docker rm
    
    log "Removendo todas as imagens do Claude Code..."
    docker images --filter "reference=claude-*" -q | xargs -r docker rmi
    
    log "Removendo todos os volumes..."
    docker volume prune -f
    
    log "Limpeza completa do sistema..."
    docker system prune -a -f --volumes
    
    success "Limpeza de emergência concluída"
}

# Função de ajuda
show_help() {
    cat << EOF
Claude Code Docker Cleanup Script

USO:
    $0 [OPÇÕES]

OPÇÕES:
    --auto              Executar limpeza automática (segura)
    --deep              Limpeza profunda (incluindo imagens)
    --emergency         Limpeza de emergência (REMOVE TUDO)
    --setup-cron        Configurar limpeza automática
    --report            Apenas mostrar relatório de uso
    --help              Mostrar esta ajuda

EXEMPLOS:
    $0                  # Limpeza padrão
    $0 --auto           # Limpeza automática segura
    $0 --deep           # Limpeza profunda
    $0 --report         # Apenas relatório
EOF
}

# Função principal
main() {
    local mode="default"
    
    # Processar argumentos
    while [[ $# -gt 0 ]]; do
        case $1 in
            --auto)
                mode="auto"
                shift
                ;;
            --deep)
                mode="deep"
                shift
                ;;
            --emergency)
                mode="emergency"
                shift
                ;;
            --setup-cron)
                mode="setup-cron"
                shift
                ;;
            --report)
                mode="report"
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                error "Opção desconhecida: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Verificar Docker
    check_docker
    
    # Executar limpeza baseada no modo
    case $mode in
        "auto")
            log "Executando limpeza automática..."
            cleanup_containers
            cleanup_orphaned_containers
            cleanup_volumes
            cleanup_networks
            cleanup_logs
            ;;
        "deep")
            log "Executando limpeza profunda..."
            cleanup_containers
            cleanup_orphaned_containers
            cleanup_images
            cleanup_volumes
            cleanup_networks
            cleanup_cache
            cleanup_logs
            ;;
        "emergency")
            emergency_cleanup
            ;;
        "setup-cron")
            setup_auto_cleanup
            ;;
        "report")
            space_report
            ;;
        "default")
            log "Executando limpeza padrão..."
            cleanup_containers
            cleanup_orphaned_containers
            cleanup_volumes
            cleanup_networks
            ;;
    esac
    
    # Mostrar relatório final
    if [[ "$mode" != "report" && "$mode" != "setup-cron" ]]; then
        log "Limpeza concluída!"
        space_report
    fi
}

# Executar se chamado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi