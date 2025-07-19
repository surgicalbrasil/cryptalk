#!/bin/bash

# Script de deploy do frontend para plataformas públicas
# =====================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️ $1${NC}"
}

# Configurações
DEPLOY_TARGET="${1:-vercel}"
TUNNEL_URL="${2:-}"

log "🚀 Iniciando deploy do frontend para $DEPLOY_TARGET..."

# Verificar se o build foi feito
if [ ! -d "dist" ]; then
    error "Diretório 'dist' não encontrado. Execute 'npm run build:prod' primeiro."
    exit 1
fi

# Criar arquivo de configuração para o frontend
log "📝 Criando configuração do frontend..."

# Criar arquivo de configuração de ambiente para produção
cat > dist/config.js << EOF
// Configuração do CrysTalk Frontend
window.CRYPTALK_CONFIG = {
    API_URL: '${TUNNEL_URL}',
    WEBSOCKET_URL: '${TUNNEL_URL}'.replace('https://', 'wss://').replace('http://', 'ws://'),
    ENVIRONMENT: 'production',
    VERSION: '1.0.0',
    FEATURES: {
        REAL_TIME_ANALYSIS: true,
        FILE_UPLOAD: true,
        WEBSOCKET_SUPPORT: true
    }
};
EOF

success "Arquivo de configuração criado!"

# Deploy específico por plataforma
case $DEPLOY_TARGET in
    "vercel")
        log "🌐 Fazendo deploy para Vercel..."
        
        # Verificar se Vercel CLI está instalado
        if ! command -v vercel &> /dev/null; then
            warning "Vercel CLI não encontrado. Instalando..."
            npm install -g vercel
        fi
        
        # Fazer deploy
        vercel --prod --yes
        success "Deploy para Vercel concluído!"
        ;;
        
    "github-pages")
        log "📄 Preparando deploy para GitHub Pages..."
        
        # Verificar se gh-pages está instalado
        if ! command -v gh-pages &> /dev/null; then
            warning "gh-pages não encontrado. Instalando..."
            npm install -g gh-pages
        fi
        
        # Fazer deploy
        gh-pages -d dist
        success "Deploy para GitHub Pages concluído!"
        ;;
        
    "netlify")
        log "🌊 Fazendo deploy para Netlify..."
        
        # Verificar se Netlify CLI está instalado
        if ! command -v netlify &> /dev/null; then
            warning "Netlify CLI não encontrado. Instalando..."
            npm install -g netlify-cli
        fi
        
        # Fazer deploy
        netlify deploy --prod --dir=dist
        success "Deploy para Netlify concluído!"
        ;;
        
    *)
        error "Plataforma de deploy não suportada: $DEPLOY_TARGET"
        echo "Plataformas suportadas: vercel, github-pages, netlify"
        exit 1
        ;;
esac

log "✅ Deploy do frontend concluído com sucesso!"
echo
echo "============================================="
echo "📋 PRÓXIMOS PASSOS:"
echo "============================================="
echo "1. Configure o tunnel URL no arquivo de configuração"
echo "2. Inicie o backend local: npm run server:hybrid"
echo "3. Inicie o tunnel: npm run tunnel:start"
echo "4. Teste a conexão entre frontend público e backend local"
echo "============================================="