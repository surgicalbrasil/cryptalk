#!/bin/bash

# Script para inicializar o sistema completo CrysTalk
echo "🚀 Iniciando sistema CrysTalk..."

# Verificar se as dependências estão instaladas
if [ ! -d "server/node_modules" ]; then
    echo "📦 Instalando dependências do servidor..."
    ./scripts/setup-server.sh
fi

if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências do frontend..."
    npm install
fi

# Função para capturar sinais e encerrar processos
cleanup() {
    echo ""
    echo "🛑 Encerrando sistema CrysTalk..."
    kill $SERVER_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Capturar sinais para limpeza
trap cleanup SIGINT SIGTERM

# Iniciar servidor em background
echo "🔧 Iniciando servidor backend..."
cd server
npm start &
SERVER_PID=$!
cd ..

# Aguardar servidor inicializar
echo "⏳ Aguardando servidor inicializar..."
sleep 5

# Verificar se o servidor está rodando
if ! curl -s http://localhost:3001 > /dev/null; then
    echo "❌ Servidor não conseguiu inicializar"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

echo "✅ Servidor backend iniciado (PID: $SERVER_PID)"

# Iniciar frontend em background
echo "🔧 Iniciando frontend..."
npm run dev &
FRONTEND_PID=$!

echo "✅ Frontend iniciado (PID: $FRONTEND_PID)"
echo ""
echo "🎉 Sistema CrysTalk iniciado com sucesso!"
echo ""
echo "🌐 Frontend: http://localhost:5173"
echo "🔧 Backend: http://localhost:3001"
echo "📡 WebSocket: ws://localhost:8080"
echo ""
echo "📝 Funcionalidades disponíveis:"
echo "  • Upload de documentos (PDF, DOC, DOCX, TXT, PPT, PPTX, XLS, XLSX)"
echo "  • Análise automatizada via Claude Code"
echo "  • Chat em tempo real com análise"
echo "  • Containers isolados por cliente"
echo "  • Limpeza automática de arquivos"
echo ""
echo "Pressione Ctrl+C para encerrar o sistema"

# Aguardar sinais
wait