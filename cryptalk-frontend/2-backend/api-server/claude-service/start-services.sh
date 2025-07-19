#!/bin/bash
# Start Services - CrypTalk Claude Terminal Integration

echo "🚀 Iniciando Serviços CrypTalk..."

# Verificar se estamos no diretório correto
if [ ! -f "orchestrator.js" ]; then
    echo "❌ Execute este script na pasta claude-service/"
    exit 1
fi

# Matar processos existentes
echo "🛑 Parando serviços existentes..."
pkill -f "terminal-listener.js" 2>/dev/null
pkill -f "orchestrator.js" 2>/dev/null
sleep 2

# Iniciar terminal listener
echo "🎧 Iniciando Terminal Listener..."
node terminal-listener.js &
LISTENER_PID=$!
echo "Terminal Listener PID: $LISTENER_PID"
sleep 3

# Testar conexão terminal
echo "🧪 Testando conexão com Claude Code..."
if node test-claude-terminal.js; then
    echo "✅ Terminal listener funcionando"
else
    echo "❌ Problema com terminal listener"
    kill $LISTENER_PID 2>/dev/null
    exit 1
fi

# Iniciar orchestrator
echo "🎯 Iniciando Orchestrator..."
node orchestrator.js &
ORCHESTRATOR_PID=$!
echo "Orchestrator PID: $ORCHESTRATOR_PID"
sleep 3

# Verificar serviços
echo ""
echo "📊 Status dos Serviços:"
echo "========================"
echo "Terminal Listener: PID $LISTENER_PID"
echo "Orchestrator: PID $ORCHESTRATOR_PID"
echo "Porta Terminal: 8888"
echo "Porta API: 3002"
echo ""

# URLs de teste
echo "🔗 URLs de Teste:"
echo "=================="
echo "Health Check: http://localhost:3002/api/health"
echo "Claude Status: http://localhost:3002/api/claude/status"
echo ""

# Criar arquivo de PIDs para controle
echo "$LISTENER_PID" > .listener.pid
echo "$ORCHESTRATOR_PID" > .orchestrator.pid

echo "✅ Serviços iniciados com sucesso!"
echo "📝 Para parar: ./stop-services.sh"
echo "📊 Para logs: tail -f *.log"