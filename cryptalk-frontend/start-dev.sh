#!/bin/bash

# CrypTalk Development Starter Script
# Este script inicia todos os serviços necessários para desenvolvimento

echo "🚀 Iniciando CrypTalk Development Environment..."
echo "============================================="

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para verificar se um processo está rodando
check_process() {
    if pgrep -f "$1" > /dev/null; then
        return 0
    else
        return 1
    fi
}

# Matar processos anteriores se existirem
echo -e "${YELLOW}🔄 Limpando processos anteriores...${NC}"
pkill -f "simple-upload-server" 2>/dev/null
pkill -f "vite" 2>/dev/null
sleep 2

# Verificar se node está instalado
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js não está instalado!${NC}"
    exit 1
fi

# Verificar se w3 está instalado
if ! command -v w3 &> /dev/null; then
    echo -e "${YELLOW}⚠️  w3 CLI não está instalado. Instalando...${NC}"
    npm install -g @web3-storage/w3cli
fi

# Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Instalando dependências...${NC}"
    npm install
fi

# Iniciar Backend Upload Server
echo -e "${GREEN}🖥️  Iniciando Backend Upload Server...${NC}"
nohup node simple-upload-server.js > upload-server.log 2>&1 &
BACKEND_PID=$!
sleep 2

# Verificar se backend iniciou
if check_process "simple-upload-server"; then
    echo -e "${GREEN}✅ Backend rodando (PID: $BACKEND_PID)${NC}"
else
    echo -e "${RED}❌ Falha ao iniciar backend!${NC}"
    exit 1
fi

# Iniciar Frontend Dev Server
echo -e "${GREEN}🎨 Iniciando Frontend Dev Server...${NC}"
npm run dev &
FRONTEND_PID=$!
sleep 3

# Verificar se frontend iniciou
if check_process "vite"; then
    echo -e "${GREEN}✅ Frontend rodando${NC}"
else
    echo -e "${RED}❌ Falha ao iniciar frontend!${NC}"
    kill $BACKEND_PID
    exit 1
fi

echo ""
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}✨ CrypTalk está pronto!${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo "📍 URLs:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3001"
echo ""
echo "👤 Admin Access:"
echo "   Wallet: 0x650687aD5F50E2DF6763f300BCAC9E03B4B4fCb6"
echo ""
echo "📝 Logs:"
echo "   Frontend: tail -f dev-server.log"
echo "   Backend:  tail -f upload-server.log"
echo ""
echo -e "${YELLOW}💡 Dica: Use Ctrl+C para parar todos os serviços${NC}"
echo ""

# Função para limpar ao sair
cleanup() {
    echo -e "\n${YELLOW}🛑 Parando serviços...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    pkill -f "simple-upload-server" 2>/dev/null
    pkill -f "vite" 2>/dev/null
    echo -e "${GREEN}✅ Serviços parados${NC}"
    exit 0
}

# Capturar Ctrl+C
trap cleanup INT

# Manter script rodando
while true; do
    sleep 1
done