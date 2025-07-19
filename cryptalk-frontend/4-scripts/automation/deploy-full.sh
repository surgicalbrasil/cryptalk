#!/bin/bash

# Script de deploy completo da arquitetura híbrida
# ================================================

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
TUNNEL_TYPE="${2:-temporary}"

echo "============================================="
echo "🚀 CrysTalk - Deploy Arquitetura Híbrida"
echo "============================================="
echo "📊 Plataforma: $DEPLOY_TARGET"
echo "🔗 Tunnel: $TUNNEL_TYPE"
echo "📅 Data: $(date)"
echo "============================================="

# Verificar se está no WSL
if [[ ! -f /proc/version ]] || ! grep -q "Microsoft" /proc/version; then
    error "Este script deve ser executado no WSL (Windows Subsystem for Linux)"
    exit 1
fi

# Etapa 1: Preparar ambiente
log "🔧 Preparando ambiente..."

# Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    log "📦 Instalando dependências..."
    npm install
fi

# Etapa 2: Configurar tunnel
log "🔗 Configurando Cloudflare Tunnel..."

# Verificar se cloudflared está instalado
if ! command -v cloudflared &> /dev/null; then
    warning "cloudflared não encontrado. Executando setup..."
    ./scripts/setup-tunnel.sh
fi

# Iniciar tunnel em background
log "🌐 Iniciando tunnel..."
TUNNEL_PID=""

if [ "$TUNNEL_TYPE" = "permanent" ]; then
    # Usar tunnel nomeado (requer configuração prévia)
    if [ -f ~/.cloudflared/config.yml ]; then
        cloudflared tunnel run &
        TUNNEL_PID=$!
        sleep 5
        TUNNEL_URL=$(grep -E "https://.*trycloudflare.com" ~/.cloudflared/cloudflared.log | tail -1 | sed 's/.*https/https/' | sed 's/ .*//')
    else
        error "Configuração de tunnel permanente não encontrada. Execute 'cloudflared tunnel login' primeiro."
        exit 1
    fi
else
    # Usar tunnel temporário
    cloudflared tunnel --url http://localhost:3001 > /tmp/tunnel.log 2>&1 &
    TUNNEL_PID=$!
    
    # Aguardar tunnel inicializar
    log "⏳ Aguardando tunnel inicializar..."
    sleep 10
    
    # Obter URL do tunnel
    TUNNEL_URL=$(grep -E "https://.*trycloudflare.com" /tmp/tunnel.log | tail -1 | sed 's/.*https/https/' | sed 's/ .*//')
    
    if [ -z "$TUNNEL_URL" ]; then
        error "Não foi possível obter URL do tunnel"
        kill $TUNNEL_PID 2>/dev/null || true
        exit 1
    fi
fi

success "Tunnel ativo: $TUNNEL_URL"

# Etapa 3: Iniciar backend
log "🖥️ Iniciando backend..."

# Criar arquivo de configuração com URL do tunnel
cat > .env.production.local << EOF
BACKEND_URL=$TUNNEL_URL
WEBSOCKET_URL=${TUNNEL_URL/https/wss}
NODE_ENV=production
PORT=3001
WEBSOCKET_PORT=8080
SERVER_HOST=0.0.0.0
EOF

# Iniciar backend em background
NODE_ENV=production node server/server-hybrid.js > /tmp/backend.log 2>&1 &
BACKEND_PID=$!

# Aguardar backend inicializar
log "⏳ Aguardando backend inicializar..."
sleep 5

# Verificar se backend está rodando
if ! pgrep -f "node.*server-hybrid.js" > /dev/null; then
    error "Backend não conseguiu inicializar"
    kill $TUNNEL_PID 2>/dev/null || true
    exit 1
fi

success "Backend ativo na porta 3001"

# Etapa 4: Build do frontend
log "📦 Fazendo build do frontend..."

# Atualizar configuração do frontend
cat > src/config.js << EOF
export const API_CONFIG = {
    BASE_URL: '$TUNNEL_URL',
    WEBSOCKET_URL: '${TUNNEL_URL/https/wss}',
    TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3
};

export const APP_CONFIG = {
    ENVIRONMENT: 'production',
    VERSION: '1.0.0',
    FEATURES: {
        REAL_TIME_ANALYSIS: true,
        FILE_UPLOAD: true,
        WEBSOCKET_SUPPORT: true
    }
};
EOF

# Fazer build de produção
npm run build:prod

success "Build do frontend concluído!"

# Etapa 5: Deploy do frontend
log "🌐 Fazendo deploy do frontend..."

# Atualizar configuração no dist
cat > dist/config.js << EOF
window.CRYPTALK_CONFIG = {
    API_URL: '$TUNNEL_URL',
    WEBSOCKET_URL: '${TUNNEL_URL/https/wss}',
    ENVIRONMENT: 'production',
    VERSION: '1.0.0',
    FEATURES: {
        REAL_TIME_ANALYSIS: true,
        FILE_UPLOAD: true,
        WEBSOCKET_SUPPORT: true
    }
};
EOF

# Fazer deploy
case $DEPLOY_TARGET in
    "vercel")
        if ! command -v vercel &> /dev/null; then
            npm install -g vercel
        fi
        vercel --prod --yes
        ;;
    "github-pages")
        if ! command -v gh-pages &> /dev/null; then
            npm install -g gh-pages
        fi
        gh-pages -d dist
        ;;
    "netlify")
        if ! command -v netlify &> /dev/null; then
            npm install -g netlify-cli
        fi
        netlify deploy --prod --dir=dist
        ;;
esac

success "Deploy do frontend concluído!"

# Etapa 6: Testes de conectividade
log "🧪 Testando conectividade..."

# Testar API
if curl -f -s "$TUNNEL_URL/api/health" > /dev/null; then
    success "API respondendo corretamente"
else
    warning "API não está respondendo"
fi

# Etapa 7: Relatório final
echo
echo "============================================="
echo "🎉 DEPLOY CONCLUÍDO COM SUCESSO!"
echo "============================================="
echo "🔗 Tunnel URL: $TUNNEL_URL"
echo "🖥️ Backend: Rodando localmente (PID: $BACKEND_PID)"
echo "📡 Tunnel: Rodando (PID: $TUNNEL_PID)"
echo "🌐 Frontend: Deployado em $DEPLOY_TARGET"
echo "============================================="
echo
echo "📋 COMANDOS ÚTEIS:"
echo "• Parar tunnel: npm run tunnel:stop"
echo "• Status: npm run tunnel:status"
echo "• Logs backend: tail -f /tmp/backend.log"
echo "• Logs tunnel: tail -f /tmp/tunnel.log"
echo "============================================="
echo
echo "⚠️ IMPORTANTE:"
echo "• Mantenha o terminal aberto para manter o tunnel ativo"
echo "• O backend está rodando localmente no WSL"
echo "• Arquivos são salvos localmente em server/client-containers/"
echo "• Use Ctrl+C para parar todos os serviços"
echo "============================================="

# Criar arquivo de controle com os PIDs
cat > .deployment-info << EOF
TUNNEL_PID=$TUNNEL_PID
BACKEND_PID=$BACKEND_PID
TUNNEL_URL=$TUNNEL_URL
DEPLOY_TARGET=$DEPLOY_TARGET
DEPLOY_DATE=$(date)
EOF

# Aguardar interrupção
trap 'echo "🛑 Parando serviços..."; kill $TUNNEL_PID $BACKEND_PID 2>/dev/null || true; rm -f .deployment-info; exit 0' INT

log "✅ Sistema híbrido ativo! Pressione Ctrl+C para parar."

# Manter script rodando
while true; do
    sleep 60
    # Verificar se os processos ainda estão rodando
    if ! kill -0 $TUNNEL_PID 2>/dev/null; then
        error "Tunnel parou de funcionar"
        break
    fi
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        error "Backend parou de funcionar"
        break
    fi
done