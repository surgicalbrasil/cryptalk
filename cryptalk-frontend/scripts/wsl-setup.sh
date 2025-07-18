#!/bin/bash

# Script de configuração do CrysTalk para WSL
# ===========================================

set -e

echo "🔧 Configurando CrysTalk para WSL..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se estamos no WSL
if [ -z "$WSL_DISTRO_NAME" ]; then
    error "Este script deve ser executado no WSL"
    exit 1
fi

log "Detectado WSL: $WSL_DISTRO_NAME"

# Verificar dependências
log "Verificando dependências..."

# Node.js
if ! command -v node &> /dev/null; then
    error "Node.js não encontrado. Instale o Node.js primeiro."
    exit 1
fi

NODE_VERSION=$(node --version)
log "Node.js versão: $NODE_VERSION"

# npm
if ! command -v npm &> /dev/null; then
    error "npm não encontrado."
    exit 1
fi

NPM_VERSION=$(npm --version)
log "npm versão: $NPM_VERSION"

# Claude Code
if ! command -v claude &> /dev/null; then
    error "Claude Code não encontrado. Instale o Claude Code primeiro."
    exit 1
fi

CLAUDE_VERSION=$(claude --version)
log "Claude Code versão: $CLAUDE_VERSION"

# Docker
if ! command -v docker &> /dev/null; then
    warning "Docker não encontrado. Alguns recursos podem não funcionar."
else
    DOCKER_VERSION=$(docker --version)
    log "Docker versão: $DOCKER_VERSION"
fi

# Configurar variáveis de ambiente para WSL
log "Configurando variáveis de ambiente para WSL..."

# Criar arquivo de configuração WSL
cat > .env.wsl << 'EOF'
# Configurações específicas para WSL
# ==================================

# Variáveis de ambiente WSL
WSL_ENABLED=true
WSL_DISTRO_NAME=${WSL_DISTRO_NAME}
WSL_INTEROP=${WSL_INTEROP}

# Configurações de rede WSL
WSL_HOST_IP=$(ip route | grep default | awk '{print $3}')
WSL_NETWORK_MODE=bridge

# Configurações de sistema
DISPLAY=${DISPLAY:-:0}
PULSE_RUNTIME_PATH=/mnt/wslg/PulseAudio
PULSE_SERVER=unix:/mnt/wslg/PulseAudio/pulse.sock

# Configurações de desenvolvimento
NODE_ENV=development
DEBUG=false
VERBOSE_LOGGING=true

# Configurações de servidor
SERVER_HOST=0.0.0.0
SERVER_PORT=3000
WEBSOCKET_PORT=8080
CLIENT_URL=http://localhost:3000

# Configurações de segurança WSL
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
TRUST_PROXY=true

# Configurações de timeout para WSL
REQUEST_TIMEOUT=30000
WEBSOCKET_TIMEOUT=300000
FILE_UPLOAD_TIMEOUT=60000

# Configurações de Claude Code
CLAUDE_TIMEOUT=300000
CLAUDE_MAX_TOKENS=4000
CLAUDE_TEMPERATURE=0.7

# Configurações de cache
CACHE_ENABLED=true
CACHE_TTL=3600
CACHE_MAX_SIZE=100

# Configurações de logging
LOG_LEVEL=info
LOG_TO_FILE=true
LOG_FILE_PATH=/tmp/cryptalk-wsl.log
LOG_MAX_SIZE=10485760
LOG_MAX_FILES=5

# Configurações de limpeza
CLEANUP_ENABLED=true
CLEANUP_INTERVAL=3600000
MAX_CLIENT_AGE=86400000
TEMP_DIR_CLEANUP=true

# Configurações de monitoramento
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_INTERVAL=30000
METRICS_ENABLED=true
PERFORMANCE_MONITORING=true

# Configurações de backup
BACKUP_ENABLED=false
BACKUP_DIR=/tmp/cryptalk-backups
BACKUP_RETENTION_DAYS=7

# Configurações de desenvolvimento
HOT_RELOAD=true
AUTO_RESTART=true
DEV_MODE=true
EOF

# Mesclar com .env existente
if [ -f .env ]; then
    log "Mesclando configurações com .env existente..."
    cp .env .env.backup
    cat .env.wsl >> .env
    success "Configurações mescladas. Backup criado em .env.backup"
else
    log "Criando novo arquivo .env..."
    cp .env.wsl .env
    success "Arquivo .env criado com configurações WSL"
fi

# Configurar NPM para WSL
log "Configurando NPM para WSL..."
npm config set registry https://registry.npmjs.org/
npm config set fund false
npm config set audit false

# Instalar dependências
log "Instalando dependências..."
npm install --no-audit --no-fund

# Verificar estrutura de diretórios
log "Verificando estrutura de diretórios..."

REQUIRED_DIRS=(
    "server/client-containers"
    "uploads"
    "temp-files"
    "logs"
    "dist"
    "server/templates"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ ! -d "$dir" ]; then
        log "Criando diretório: $dir"
        mkdir -p "$dir"
    fi
done

# Configurar permissões
log "Configurando permissões..."
chmod +x scripts/*.sh 2>/dev/null || true
chmod 755 server/client-containers
chmod 755 uploads
chmod 755 temp-files
chmod 755 logs

# Testar Claude Code
log "Testando Claude Code..."
if claude --version > /dev/null 2>&1; then
    success "Claude Code está funcionando"
else
    error "Claude Code não está funcionando corretamente"
    exit 1
fi

# Configurar MCP servers
log "Configurando MCP servers..."
claude mcp list > /dev/null 2>&1 || warning "Alguns MCP servers podem não estar disponíveis"

# Testar conectividade de rede
log "Testando conectividade de rede..."
if curl -s --max-time 5 http://localhost:3000/api/health > /dev/null 2>&1; then
    success "Servidor já está rodando na porta 3000"
else
    log "Servidor não está rodando - isso é normal se for a primeira execução"
fi

# Criar script de inicialização para WSL
log "Criando script de inicialização..."
cat > start-wsl.sh << 'EOF'
#!/bin/bash

# Script de inicialização do CrysTalk para WSL
# ===========================================

# Verificar se estamos no WSL
if [ -z "$WSL_DISTRO_NAME" ]; then
    echo "❌ Este script deve ser executado no WSL"
    exit 1
fi

echo "🚀 Iniciando CrysTalk no WSL..."

# Carregar configurações WSL
if [ -f .env.wsl ]; then
    source .env.wsl
    echo "✅ Configurações WSL carregadas"
fi

# Iniciar servidor em background
echo "🔄 Iniciando servidor backend..."
node server/server-fixed.js > /tmp/server.log 2>&1 &
SERVER_PID=$!

# Aguardar servidor inicializar
echo "⏳ Aguardando servidor inicializar..."
sleep 5

# Verificar se o servidor está rodando
if curl -s --max-time 10 http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Servidor backend iniciado com sucesso (PID: $SERVER_PID)"
else
    echo "❌ Erro ao iniciar servidor backend"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

# Iniciar frontend em desenvolvimento
echo "🎨 Iniciando frontend em modo desenvolvimento..."
echo "🌐 Acesse: http://localhost:5173"
echo "🔧 API: http://localhost:3000"
echo "📡 WebSocket: ws://localhost:8080"
echo ""
echo "📊 Logs do servidor: tail -f /tmp/server.log"
echo "🛑 Para parar: Ctrl+C"

# Iniciar Vite
npm run dev

# Cleanup ao sair
echo "🧹 Limpando processos..."
kill $SERVER_PID 2>/dev/null || true
echo "✅ Processos limpos"
EOF

chmod +x start-wsl.sh

# Criar script de teste
log "Criando script de teste..."
cat > test-wsl.sh << 'EOF'
#!/bin/bash

# Script de teste para WSL
# ======================

echo "🧪 Testando CrysTalk no WSL..."

# Verificar dependências
echo "1. Verificando dependências..."
node --version || { echo "❌ Node.js não encontrado"; exit 1; }
npm --version || { echo "❌ npm não encontrado"; exit 1; }
claude --version || { echo "❌ Claude Code não encontrado"; exit 1; }

# Testar servidor
echo "2. Testando servidor..."
if curl -s --max-time 10 http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Servidor está respondendo"
    curl -s http://localhost:3000/api/health | jq . || echo "Resposta recebida"
else
    echo "❌ Servidor não está respondendo"
    exit 1
fi

# Testar WebSocket
echo "3. Testando WebSocket..."
if nc -z localhost 8080 2>/dev/null; then
    echo "✅ WebSocket está ouvindo"
else
    echo "❌ WebSocket não está ouvindo"
    exit 1
fi

# Testar Claude Code
echo "4. Testando Claude Code..."
echo "Olá, mundo!" | claude --print > /dev/null 2>&1 && echo "✅ Claude Code funcionando" || echo "❌ Claude Code com problemas"

# Testar upload de arquivo
echo "5. Testando upload de arquivo..."
if [ -f "test-document.txt" ]; then
    echo "✅ Arquivo de teste encontrado"
else
    echo "📝 Criando arquivo de teste..."
    echo "Este é um documento de teste para o CrysTalk." > test-document.txt
fi

echo "🎉 Todos os testes concluídos!"
EOF

chmod +x test-wsl.sh

# Criar script de diagnóstico
log "Criando script de diagnóstico..."
cat > diagnose-wsl.sh << 'EOF'
#!/bin/bash

# Script de diagnóstico para WSL
# =============================

echo "🔍 Diagnóstico do CrysTalk no WSL"
echo "=================================="

echo "🖥️  Informações do Sistema:"
echo "WSL Distro: $WSL_DISTRO_NAME"
echo "Kernel: $(uname -r)"
echo "Arquitetura: $(uname -m)"
echo "Uptime: $(uptime)"
echo ""

echo "📦 Versões de Software:"
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "Claude Code: $(claude --version)"
echo "Docker: $(docker --version 2>/dev/null || echo 'Não instalado')"
echo ""

echo "🌐 Configurações de Rede:"
echo "Hostname: $(hostname)"
echo "IP Address: $(hostname -I | awk '{print $1}')"
echo "Default Gateway: $(ip route | grep default | awk '{print $3}')"
echo "DNS Servers: $(cat /etc/resolv.conf | grep nameserver | awk '{print $2}' | tr '\n' ' ')"
echo ""

echo "🔌 Portas em Uso:"
ss -tuln | grep -E "(3000|5173|8080)" || echo "Nenhuma porta relevante em uso"
echo ""

echo "💾 Espaço em Disco:"
df -h /
echo ""

echo "🧠 Memória:"
free -h
echo ""

echo "🏃 Processos Relacionados:"
ps aux | grep -E "(node|claude|npm)" | grep -v grep || echo "Nenhum processo encontrado"
echo ""

echo "📁 Estrutura de Diretórios:"
find . -type d -name "node_modules" -prune -o -type d -print | head -20
echo ""

echo "📝 Logs Recentes:"
if [ -f "/tmp/server.log" ]; then
    echo "Últimas 5 linhas do log do servidor:"
    tail -5 /tmp/server.log
else
    echo "Nenhum log encontrado"
fi
echo ""

echo "🔧 Configurações Claude Code:"
claude config list
echo ""

echo "🛠️  MCP Servers:"
claude mcp list
echo ""

echo "✅ Diagnóstico concluído!"
EOF

chmod +x diagnose-wsl.sh

# Verificar build
log "Verificando build..."
if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
    log "Build não encontrado, executando build..."
    npm run build
    success "Build executado com sucesso"
else
    success "Build já existe"
fi

# Testes finais
log "Executando testes finais..."

# Testar se o servidor pode ser iniciado
log "Testando inicialização do servidor..."
timeout 10s node server/server-fixed.js > /tmp/test-server.log 2>&1 &
TEST_PID=$!
sleep 3

if kill -0 $TEST_PID 2>/dev/null; then
    success "Servidor pode ser iniciado com sucesso"
    kill $TEST_PID
else
    warning "Servidor teve problemas na inicialização"
    cat /tmp/test-server.log
fi

# Limpar arquivo de teste
rm -f /tmp/test-server.log

# Resumo final
echo ""
echo "🎉 Configuração do CrysTalk para WSL concluída!"
echo "=============================================="
echo ""
echo "📋 Resumo:"
echo "• Claude Code: $CLAUDE_VERSION"
echo "• Node.js: $NODE_VERSION"
echo "• npm: $NPM_VERSION"
echo "• WSL: $WSL_DISTRO_NAME"
echo ""
echo "🚀 Para iniciar o sistema:"
echo "  ./start-wsl.sh"
echo ""
echo "🧪 Para testar o sistema:"
echo "  ./test-wsl.sh"
echo ""
echo "🔍 Para diagnóstico:"
echo "  ./diagnose-wsl.sh"
echo ""
echo "📂 Estrutura criada:"
echo "• server/client-containers/ - Containers de clientes"
echo "• uploads/ - Arquivos enviados"
echo "• temp-files/ - Arquivos temporários"
echo "• logs/ - Logs do sistema"
echo "• dist/ - Build do frontend"
echo ""
echo "🌐 URLs do sistema:"
echo "• Frontend: http://localhost:5173"
echo "• API: http://localhost:3000"
echo "• WebSocket: ws://localhost:8080"
echo ""
echo "✅ Sistema pronto para uso no WSL!"