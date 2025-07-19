#!/bin/bash

# Script para build das imagens Docker do CrysTalk
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

# Função para build de uma imagem
build_image() {
    local image_name=$1
    local dockerfile_path=$2
    local context_path=$3
    local build_args=$4
    
    log "Construindo imagem: $image_name"
    
    if [[ -n "$build_args" ]]; then
        docker build $build_args -t "$image_name" -f "$dockerfile_path" "$context_path"
    else
        docker build -t "$image_name" -f "$dockerfile_path" "$context_path"
    fi
    
    success "Imagem $image_name construída com sucesso"
}

# Função para criar network
create_network() {
    local network_name="claude-network"
    
    log "Criando network: $network_name"
    
    if ! docker network ls | grep -q "$network_name"; then
        docker network create --driver bridge \
            --subnet=172.20.0.0/16 \
            --ip-range=172.20.240.0/20 \
            "$network_name"
        success "Network $network_name criada"
    else
        log "Network $network_name já existe"
    fi
}

# Função para limpar imagens antigas
cleanup_old_images() {
    log "Limpando imagens antigas..."
    
    # Remover imagens não utilizadas
    docker image prune -f
    
    # Remover imagens antigas das aplicações
    docker images | grep -E "(claude-|crystalk-)" | grep -v "latest" | awk '{print $3}' | xargs -r docker rmi -f
    
    success "Limpeza concluída"
}

# Função principal
main() {
    local build_mode="full"
    local skip_cleanup=false
    local force_rebuild=false
    
    # Processar argumentos
    while [[ $# -gt 0 ]]; do
        case $1 in
            --service-only)
                build_mode="service"
                shift
                ;;
            --user-env-only)
                build_mode="user-env"
                shift
                ;;
            --skip-cleanup)
                skip_cleanup=true
                shift
                ;;
            --force)
                force_rebuild=true
                shift
                ;;
            --help)
                cat << EOF
Script de Build Docker para CrysTalk

USO:
    $0 [OPÇÕES]

OPÇÕES:
    --service-only      Construir apenas a imagem do serviço principal
    --user-env-only     Construir apenas a imagem do ambiente de usuário
    --skip-cleanup      Pular limpeza de imagens antigas
    --force             Forçar reconstrução (sem cache)
    --help              Mostrar esta ajuda

EXEMPLOS:
    $0                  # Build completo
    $0 --service-only   # Apenas serviço principal
    $0 --force          # Reconstruir tudo sem cache
EOF
                exit 0
                ;;
            *)
                error "Opção desconhecida: $1"
                exit 1
                ;;
        esac
    done
    
    # Verificar Docker
    check_docker
    
    # Definir argumentos de build
    local build_args=""
    if [[ "$force_rebuild" == "true" ]]; then
        build_args="--no-cache"
    fi
    
    # Navegar para o diretório do projeto
    cd "$(dirname "$0")/.."
    
    log "Iniciando build Docker para CrysTalk"
    log "Modo: $build_mode"
    log "Diretório: $(pwd)"
    
    # Limpeza inicial
    if [[ "$skip_cleanup" != "true" ]]; then
        cleanup_old_images
    fi
    
    # Criar network
    create_network
    
    # Build das imagens baseado no modo
    case $build_mode in
        "full")
            log "Construindo todas as imagens..."
            
            # Imagem do ambiente de usuário
            build_image "claude-user-env:latest" "./Dockerfile.user-env" "." "$build_args"
            
            # Imagem do serviço principal
            build_image "claude-service:latest" "./claude-service/Dockerfile" "./claude-service" "$build_args"
            
            # Imagem de monitoramento
            build_image "claude-monitoring:latest" "./monitoring/Dockerfile" "./monitoring" "$build_args"
            
            success "Todas as imagens construídas com sucesso"
            ;;
            
        "service")
            log "Construindo apenas a imagem do serviço principal..."
            build_image "claude-service:latest" "./claude-service/Dockerfile" "./claude-service" "$build_args"
            ;;
            
        "user-env")
            log "Construindo apenas a imagem do ambiente de usuário..."
            build_image "claude-user-env:latest" "./Dockerfile.user-env" "." "$build_args"
            ;;
    esac
    
    # Mostrar resumo
    log "Resumo das imagens construídas:"
    docker images | grep -E "(claude-|crystalk-)" | head -10
    
    # Verificar saúde das imagens
    log "Verificando imagens..."
    
    if docker images | grep -q "claude-service.*latest"; then
        success "✓ claude-service:latest"
    else
        warning "✗ claude-service:latest não encontrada"
    fi
    
    if docker images | grep -q "claude-user-env.*latest"; then
        success "✓ claude-user-env:latest"
    else
        warning "✗ claude-user-env:latest não encontrada"
    fi
    
    log "Build concluído!"
    
    # Instruções de uso
    echo ""
    echo "PRÓXIMOS PASSOS:"
    echo "1. Configure as variáveis de ambiente em .env"
    echo "2. Execute: docker-compose up -d"
    echo "3. Verifique os logs: docker-compose logs -f"
    echo "4. Acesse o health check: curl http://localhost:3000/health"
    echo ""
}

# Executar se chamado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi