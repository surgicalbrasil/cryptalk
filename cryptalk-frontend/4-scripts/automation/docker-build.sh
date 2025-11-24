#!/bin/bash

# Script para Build Docker otimizado - CrysTalk
# ============================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções auxiliares
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

# Configurações
PROJECT_NAME="crystalk"
DOCKER_REGISTRY=${DOCKER_REGISTRY:-"localhost:5000"}
VERSION=${VERSION:-"latest"}
BUILD_ARGS=${BUILD_ARGS:-""}
PARALLEL_BUILDS=${PARALLEL_BUILDS:-true}

# Verificar se estamos no diretório correto
if [ ! -f "docker-compose.yml" ]; then
    log_error "docker-compose.yml não encontrado. Execute o script do diretório raiz do projeto."
    exit 1
fi

# Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    log_error "Docker não está rodando ou não está acessível."
    exit 1
fi

# Verificar se docker-compose está disponível
if ! command -v docker-compose > /dev/null 2>&1; then
    log_error "docker-compose não está instalado."
    exit 1
fi

log_info "Iniciando build do projeto CrysTalk..."
log_info "Versão: $VERSION"
log_info "Registry: $DOCKER_REGISTRY"

# Criar arquivo .env se não existir
if [ ! -f ".env" ]; then
    log_warning ".env não encontrado. Criando a partir do exemplo..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        log_info "Arquivo .env criado. Configure as variáveis necessárias."
    else
        log_error ".env.example não encontrado."
        exit 1
    fi
fi

# Carregar variáveis do .env
if [ -f ".env" ]; then
    log_info "Carregando variáveis do .env..."
    export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)
fi

# Verificar se as variáveis obrigatórias estão configuradas
REQUIRED_VARS=("CLAUDE_API_KEY" "ANTHROPIC_API_KEY")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        log_error "Variável obrigatória $var não está configurada no .env"
        exit 1
    fi
done

# Criar diretórios necessários
log_info "Criando diretórios necessários..."
mkdir -p logs uploads/{pending,processing,completed,failed}
mkdir -p nginx/{ssl,logs,static,errors}
mkdir -p monitoring/{grafana/dashboards,grafana/provisioning}

# Função para build de imagem individual
build_image() {
    local service_name=$1
    local context_path=$2
    local dockerfile_path=$3
    
    log_info "Construindo imagem para $service_name..."
    
    # Verificar se o contexto existe
    if [ ! -d "$context_path" ]; then
        log_error "Contexto $context_path não encontrado para $service_name"
        return 1
    fi
    
    # Verificar se o Dockerfile existe
    if [ ! -f "$context_path/$dockerfile_path" ]; then
        log_error "Dockerfile $context_path/$dockerfile_path não encontrado para $service_name"
        return 1
    fi
    
    # Build da imagem
    docker build \
        $BUILD_ARGS \
        --tag "$PROJECT_NAME-$service_name:$VERSION" \
        --tag "$PROJECT_NAME-$service_name:latest" \
        --file "$context_path/$dockerfile_path" \
        "$context_path"
    
    if [ $? -eq 0 ]; then
        log_success "Imagem $service_name construída com sucesso"
        return 0
    else
        log_error "Falha ao construir imagem $service_name"
        return 1
    fi
}

# Função para build paralelo
build_parallel() {
    local pids=()
    
    # Claude Service
    build_image "claude-service" "./claude-service" "Dockerfile" &
    pids+=($!)
    
    # Monitoring
    build_image "monitoring" "./monitoring" "Dockerfile" &
    pids+=($!)
    
    # Aguardar todos os builds
    for pid in "${pids[@]}"; do
        wait $pid
        if [ $? -ne 0 ]; then
            log_error "Build paralelo falhou"
            return 1
        fi
    done
    
    return 0
}

# Função para build sequencial
build_sequential() {
    # Claude Service
    build_image "claude-service" "./claude-service" "Dockerfile" || return 1
    
    # Monitoring
    build_image "monitoring" "./monitoring" "Dockerfile" || return 1
    
    return 0
}

# Executar builds
if [ "$PARALLEL_BUILDS" = "true" ]; then
    log_info "Executando builds em paralelo..."
    build_parallel
else
    log_info "Executando builds sequencialmente..."
    build_sequential
fi

if [ $? -ne 0 ]; then
    log_error "Falha no build das imagens customizadas"
    exit 1
fi

# Build usando docker-compose
log_info "Executando docker-compose build..."
docker-compose build --parallel

if [ $? -eq 0 ]; then
    log_success "Build do docker-compose concluído com sucesso"
else
    log_error "Falha no build do docker-compose"
    exit 1
fi

# Criar imagem do usuário se necessário
if [ -f "Dockerfile.user-env" ]; then
    log_info "Construindo imagem do ambiente de usuário..."
    docker build \
        --tag "claude-user-env:latest" \
        --file "Dockerfile.user-env" \
        .
    
    if [ $? -eq 0 ]; then
        log_success "Imagem do ambiente de usuário construída com sucesso"
    else
        log_error "Falha ao construir imagem do ambiente de usuário"
        exit 1
    fi
fi

# Verificar imagens construídas
log_info "Verificando imagens construídas..."
docker images | grep -E "(crystalk|claude)" | head -20

# Limpeza de imagens antigas (opcional)
if [ "$CLEANUP_OLD_IMAGES" = "true" ]; then
    log_info "Limpando imagens antigas..."
    docker image prune -f
    log_success "Limpeza concluída"
fi

# Informações finais
log_success "Build concluído com sucesso!"
log_info "Próximos passos:"
log_info "1. Configure as variáveis no arquivo .env"
log_info "2. Execute: docker-compose up -d"
log_info "3. Verifique os logs: docker-compose logs -f"
log_info "4. Acesse: http://localhost:3000"

# Verificar se há warnings ou erros
if docker-compose config --quiet; then
    log_success "Configuração do docker-compose válida"
else
    log_warning "Problemas encontrados na configuração do docker-compose"
fi

log_info "Build script finalizado em $(date)"