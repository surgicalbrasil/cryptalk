#!/bin/bash

set -e

echo "=== Testing Claude Service Docker Build ==="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se Docker está disponível
if ! command -v docker &> /dev/null; then
    error "Docker não está instalado ou não está no PATH"
    exit 1
fi

# Verificar se Docker daemon está rodando
if ! docker info &> /dev/null; then
    error "Docker daemon não está rodando"
    exit 1
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

log "Diretório do projeto: $PROJECT_DIR"

# Limpeza de imagens anteriores
log "Removendo imagens anteriores..."
docker rmi claude-service:test claude-service:fixed 2>/dev/null || true

# Teste 1: Build com Dockerfile original
log "=== Teste 1: Build com Dockerfile original ==="
if docker build -t claude-service:test -f Dockerfile . 2>&1; then
    log "✓ Build do Dockerfile original bem-sucedido"
    ORIGINAL_BUILD_SUCCESS=true
else
    error "✗ Build do Dockerfile original falhou"
    ORIGINAL_BUILD_SUCCESS=false
fi

# Teste 2: Build com Dockerfile corrigido
log "=== Teste 2: Build com Dockerfile corrigido ==="
if docker build -t claude-service:fixed -f Dockerfile.fixed . 2>&1; then
    log "✓ Build do Dockerfile corrigido bem-sucedido"
    FIXED_BUILD_SUCCESS=true
else
    error "✗ Build do Dockerfile corrigido falhou"
    FIXED_BUILD_SUCCESS=false
fi

# Teste 3: Inspeção da imagem
if [ "$FIXED_BUILD_SUCCESS" = true ]; then
    log "=== Teste 3: Inspeção da imagem corrigida ==="
    
    # Verificar usuário
    USER_INFO=$(docker run --rm claude-service:fixed whoami)
    log "Usuário do container: $USER_INFO"
    
    # Verificar grupos
    GROUP_INFO=$(docker run --rm claude-service:fixed groups)
    log "Grupos do usuário: $GROUP_INFO"
    
    # Verificar permissões dos arquivos
    PERMS_INFO=$(docker run --rm claude-service:fixed ls -la /app | head -10)
    log "Permissões dos arquivos:"
    echo "$PERMS_INFO"
    
    # Verificar se o Node.js está funcionando
    log "=== Teste 4: Verificação do Node.js ==="
    NODE_VERSION=$(docker run --rm claude-service:fixed node --version)
    log "Versão do Node.js: $NODE_VERSION"
fi

# Resumo dos resultados
log "=== Resumo dos Testes ==="
echo "Dockerfile original: $([ "$ORIGINAL_BUILD_SUCCESS" = true ] && echo "✓ OK" || echo "✗ FALHOU")"
echo "Dockerfile corrigido: $([ "$FIXED_BUILD_SUCCESS" = true ] && echo "✓ OK" || echo "✗ FALHOU")"

# Limpeza final
log "Limpando imagens de teste..."
docker rmi claude-service:test claude-service:fixed 2>/dev/null || true

if [ "$FIXED_BUILD_SUCCESS" = true ]; then
    log "✓ Todos os testes passaram! O Dockerfile corrigido está pronto para uso."
    exit 0
else
    error "✗ Alguns testes falharam. Verifique os logs acima."
    exit 1
fi