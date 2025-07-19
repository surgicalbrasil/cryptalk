#!/bin/bash

# Script de configuração do Cloudflare Tunnel
# ===========================================

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

# Verificar se está rodando no WSL
if [[ ! -f /proc/version ]] || ! grep -q "Microsoft" /proc/version; then
    error "Este script deve ser executado no WSL (Windows Subsystem for Linux)"
    exit 1
fi

log "🚀 Iniciando configuração do Cloudflare Tunnel..."

# Criar diretório de configuração
mkdir -p ~/.cloudflared

# Verificar se cloudflared está instalado
if ! command -v cloudflared &> /dev/null; then
    log "📦 Instalando cloudflared..."
    
    # Baixar e instalar cloudflared
    wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    sudo dpkg -i cloudflared-linux-amd64.deb
    rm cloudflared-linux-amd64.deb
    
    success "cloudflared instalado com sucesso!"
else
    success "cloudflared já está instalado"
fi

# Verificar versão
log "📋 Versão do cloudflared: $(cloudflared --version)"

# Configurar tunnel
log "🔗 Configurando tunnel..."

# Copiar arquivo de configuração
cp tunnel-config.yml ~/.cloudflared/config.yml

# Instruções para o usuário
echo
echo "============================================="
echo "🎯 PRÓXIMOS PASSOS:"
echo "============================================="
echo
echo "1. Faça login no Cloudflare:"
echo "   cloudflared tunnel login"
echo
echo "2. Crie um novo tunnel:"
echo "   cloudflared tunnel create cryptalk-backend"
echo
echo "3. Configure as credenciais:"
echo "   - O arquivo de credenciais será criado automaticamente"
echo "   - Copie o UUID do tunnel e atualize o arquivo de configuração"
echo
echo "4. Inicie o tunnel:"
echo "   cloudflared tunnel run cryptalk-backend"
echo
echo "5. Para tunnel temporário (mais fácil para teste):"
echo "   cloudflared tunnel --url http://localhost:3001"
echo
echo "============================================="
echo "📝 CONFIGURAÇÃO AUTOMÁTICA:"
echo "============================================="
echo
echo "Para configuração automática, execute:"
echo "   ./scripts/start-tunnel.sh"
echo
echo "============================================="

# Criar script de inicialização do tunnel
cat > scripts/start-tunnel.sh << 'EOF'
#!/bin/bash

# Script para iniciar o tunnel
# ============================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
}

# Verificar se o backend está rodando
if ! pgrep -f "node.*server.js" > /dev/null; then
    error "Backend não está rodando. Inicie o backend primeiro com: npm run dev"
    exit 1
fi

log "🚀 Iniciando Cloudflare Tunnel..."

# Verificar se há um tunnel nomeado configurado
if [ -f ~/.cloudflared/config.yml ] && grep -q "tunnel:" ~/.cloudflared/config.yml; then
    log "📡 Usando tunnel configurado..."
    cloudflared tunnel run
else
    log "📡 Iniciando tunnel temporário..."
    cloudflared tunnel --url http://localhost:3001
fi
EOF

chmod +x scripts/start-tunnel.sh

# Criar script de parada do tunnel
cat > scripts/stop-tunnel.sh << 'EOF'
#!/bin/bash

# Script para parar o tunnel
# ===========================

set -e

echo "🛑 Parando Cloudflare Tunnel..."

# Parar processo cloudflared
pkill -f cloudflared || true

echo "✅ Tunnel parado com sucesso!"
EOF

chmod +x scripts/stop-tunnel.sh

# Criar script de status do tunnel
cat > scripts/tunnel-status.sh << 'EOF'
#!/bin/bash

# Script para verificar status do tunnel
# ======================================

set -e

echo "📊 Status do Cloudflare Tunnel:"
echo "================================"

# Verificar se cloudflared está instalado
if command -v cloudflared &> /dev/null; then
    echo "✅ cloudflared instalado: $(cloudflared --version)"
else
    echo "❌ cloudflared não encontrado"
    exit 1
fi

# Verificar se o processo está rodando
if pgrep -f cloudflared > /dev/null; then
    echo "✅ Tunnel está rodando"
    echo "📋 Processos ativos:"
    ps aux | grep cloudflared | grep -v grep
else
    echo "❌ Tunnel não está rodando"
fi

# Verificar se o backend está rodando
if pgrep -f "node.*server.js" > /dev/null; then
    echo "✅ Backend está rodando"
else
    echo "❌ Backend não está rodando"
fi

echo "================================"
EOF

chmod +x scripts/tunnel-status.sh

success "✅ Configuração do tunnel concluída!"
success "📁 Scripts criados em: ./scripts/"
success "⚙️ Configuração salva em: ~/.cloudflared/config.yml"

log "🎯 Execute './scripts/start-tunnel.sh' para iniciar o tunnel"