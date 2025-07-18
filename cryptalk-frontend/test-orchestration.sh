#!/bin/bash

# Script para testar o sistema de orquestração
set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
API_BASE="http://localhost:3000"
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Função para log
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Função para fazer request HTTP
http_request() {
    local method="$1"
    local url="$2"
    local data="$3"
    local expected_status="$4"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_BASE$url" 2>/dev/null)
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            "$API_BASE$url" 2>/dev/null)
    fi
    
    body=$(echo "$response" | head -n -1)
    status_code=$(echo "$response" | tail -n 1)
    
    if [ "$status_code" = "$expected_status" ]; then
        success "✅ $method $url - Status: $status_code"
        echo "$body"
    else
        error "❌ $method $url - Expected: $expected_status, Got: $status_code"
        echo "Response: $body"
        return 1
    fi
}

# Função para aguardar serviço
wait_for_service() {
    local url="$1"
    local timeout="$2"
    local count=0
    
    log "Aguardando serviço $url..."
    
    while [ $count -lt $timeout ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            success "Serviço $url está disponível"
            return 0
        fi
        sleep 1
        count=$((count + 1))
    done
    
    error "Timeout aguardando serviço $url"
    return 1
}

# Função para testar WebSocket
test_websocket() {
    log "Testando conexão WebSocket..."
    
    # Criar script temporário para teste WebSocket
    cat > /tmp/ws_test.js << 'EOF'
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8080');

ws.on('open', function open() {
    console.log('✅ WebSocket conectado');
    ws.send(JSON.stringify({
        type: 'register',
        clientId: 'test-client-ws'
    }));
    
    setTimeout(() => {
        ws.close();
        process.exit(0);
    }, 2000);
});

ws.on('message', function message(data) {
    console.log('📨 Mensagem recebida:', data.toString());
});

ws.on('error', function error(err) {
    console.error('❌ Erro WebSocket:', err);
    process.exit(1);
});

ws.on('close', function close() {
    console.log('🔌 WebSocket desconectado');
});
EOF
    
    if node /tmp/ws_test.js; then
        success "WebSocket funcionando"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        error "WebSocket falhou"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    rm -f /tmp/ws_test.js
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Função para executar testes de carga
load_test() {
    log "Executando teste de carga..."
    
    local concurrent_clients=5
    local pids=()
    
    for i in $(seq 1 $concurrent_clients); do
        (
            client_response=$(http_request "POST" "/api/client/create" '{"resourceType":"light"}' "200")
            client_id=$(echo "$client_response" | jq -r '.clientId')
            
            if [ "$client_id" != "null" ]; then
                log "Cliente $i criado: $client_id"
                
                # Testar execução
                http_request "POST" "/api/client/$client_id/execute" '{"command":"echo Hello World"}' "200" >/dev/null
                
                # Aguardar um pouco
                sleep 2
                
                # Limpar cliente
                http_request "DELETE" "/api/client/$client_id" "" "200" >/dev/null
                
                log "Cliente $i finalizado"
            fi
        ) &
        pids+=($!)
    done
    
    # Aguardar todos os processos
    for pid in "${pids[@]}"; do
        wait "$pid"
    done
    
    success "Teste de carga concluído com $concurrent_clients clientes simultâneos"
}

# Início dos testes
echo "🧪 Iniciando testes do sistema de orquestração..."
echo "=================================================="

# Aguardar serviços
wait_for_service "$API_BASE/health" 30

# Teste 1: Health Check
log "Teste 1: Health Check"
http_request "GET" "/health" "" "200"

# Teste 2: Criar cliente
log "Teste 2: Criar cliente"
client_response=$(http_request "POST" "/api/client/create" '{"resourceType":"medium"}' "200")
client_id=$(echo "$client_response" | jq -r '.clientId')

if [ "$client_id" = "null" ]; then
    error "Falha ao extrair clientId"
    exit 1
fi

log "Cliente criado: $client_id"

# Teste 3: Verificar status do cliente
log "Teste 3: Status do cliente"
http_request "GET" "/api/client/$client_id/status" "" "200"

# Teste 4: Listar containers
log "Teste 4: Listar containers"
http_request "GET" "/api/containers" "" "200"

# Teste 5: Executar comando simples
log "Teste 5: Executar comando simples"
http_request "POST" "/api/client/$client_id/execute" '{"command":"echo Hello World"}' "200"

# Teste 6: Executar comando Node.js
log "Teste 6: Executar comando Node.js"
http_request "POST" "/api/client/$client_id/execute" '{"command":"node --version"}' "200"

# Teste 7: Executar comando Python
log "Teste 7: Executar comando Python"
http_request "POST" "/api/client/$client_id/execute" '{"command":"python3 --version"}' "200"

# Teste 8: Obter estatísticas
log "Teste 8: Obter estatísticas"
http_request "GET" "/api/client/$client_id/stats" "" "200"

# Teste 9: Renovar timeout
log "Teste 9: Renovar timeout"
http_request "PATCH" "/api/client/$client_id/renew" "" "200"

# Teste 10: Redimensionar recursos
log "Teste 10: Redimensionar recursos"
http_request "PATCH" "/api/client/$client_id/resize" '{"resourceType":"heavy"}' "200"

# Aguardar container ser recriado
sleep 5

# Teste 11: Verificar redimensionamento
log "Teste 11: Verificar redimensionamento"
status_response=$(http_request "GET" "/api/client/$client_id/status" "" "200")
resource_type=$(echo "$status_response" | jq -r '.resourceType')

if [ "$resource_type" = "heavy" ]; then
    success "Redimensionamento funcionou corretamente"
else
    error "Redimensionamento falhou: $resource_type"
fi

# Teste 12: WebSocket
test_websocket

# Teste 13: Teste de carga
load_test

# Teste 14: Criar múltiplos clientes
log "Teste 14: Criar múltiplos clientes"
clients=()
for i in {1..3}; do
    response=$(http_request "POST" "/api/client/create" '{"resourceType":"light"}' "200")
    cid=$(echo "$response" | jq -r '.clientId')
    clients+=("$cid")
done

# Teste 15: Limpar clientes
log "Teste 15: Limpar clientes"
for cid in "${clients[@]}"; do
    http_request "DELETE" "/api/client/$cid" "" "200"
done

# Teste 16: Remover cliente principal
log "Teste 16: Remover cliente principal"
http_request "DELETE" "/api/client/$client_id" "" "200"

# Teste 17: Verificar limpeza
log "Teste 17: Verificar limpeza"
containers_response=$(http_request "GET" "/api/containers" "" "200")
active_containers=$(echo "$containers_response" | jq '.containers | length')

if [ "$active_containers" = "0" ]; then
    success "Limpeza funcionou corretamente"
else
    warn "Ainda há $active_containers containers ativos"
fi

# Teste 18: Teste de erro - cliente inexistente
log "Teste 18: Teste de erro - cliente inexistente"
http_request "GET" "/api/client/nonexistent/status" "" "404"

# Teste 19: Teste de erro - tipo de recurso inválido
log "Teste 19: Teste de erro - tipo de recurso inválido"
http_request "POST" "/api/client/create" '{"resourceType":"invalid"}' "400"

# Teste 20: Teste de análise (simulado)
log "Teste 20: Teste de análise (simulado)"
analysis_client=$(http_request "POST" "/api/client/create" '{"resourceType":"medium"}' "200")
analysis_client_id=$(echo "$analysis_client" | jq -r '.clientId')

# Simular análise
http_request "POST" "/api/analyze" "{\"clientId\":\"$analysis_client_id\",\"filePath\":\"/tmp/test.txt\",\"documentType\":\"text\"}" "200"

# Aguardar e limpar
sleep 3
http_request "DELETE" "/api/client/$analysis_client_id" "" "200"

# Resultados finais
echo
echo "=================================================="
echo "🏁 Resultado dos testes:"
echo "   Total: $TOTAL_TESTS"
echo "   Passou: $PASSED_TESTS"
echo "   Falhou: $FAILED_TESTS"

if [ $FAILED_TESTS -eq 0 ]; then
    success "🎉 Todos os testes passaram!"
    exit 0
else
    error "❌ $FAILED_TESTS testes falharam"
    exit 1
fi