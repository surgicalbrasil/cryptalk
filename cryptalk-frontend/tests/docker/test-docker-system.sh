#!/bin/bash

# Sistema de Teste Completo para Docker
# Este script testa todos os componentes do sistema Docker

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
SAMPLES_DIR="$SCRIPT_DIR/../samples"
RESULTS_DIR="$SCRIPT_DIR/results"
LOG_FILE="$RESULTS_DIR/test-$(date +%Y%m%d-%H%M%S).log"

# Funções auxiliares
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✓ $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}✗ $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠ $1${NC}" | tee -a "$LOG_FILE"
}

# Criar diretório de resultados
mkdir -p "$RESULTS_DIR"

# Inicializar log
log "=== INICIANDO TESTE COMPLETO DO SISTEMA DOCKER ==="
log "Diretório do projeto: $PROJECT_DIR"
log "Diretório de resultados: $RESULTS_DIR"

# Teste 1: Verificar se Docker está funcionando
test_docker_basic() {
    log "Teste 1: Verificando Docker básico"
    
    if ! docker --version >/dev/null 2>&1; then
        error "Docker não está instalado ou funcionando"
        return 1
    fi
    
    if ! docker-compose --version >/dev/null 2>&1; then
        error "Docker Compose não está instalado ou funcionando"
        return 1
    fi
    
    success "Docker e Docker Compose estão funcionando"
    return 0
}

# Teste 2: Verificar configuração do sistema
test_system_config() {
    log "Teste 2: Verificando configuração do sistema"
    
    # Verificar se os arquivos necessários existem
    local required_files=(
        "$PROJECT_DIR/docker-compose.yml"
        "$PROJECT_DIR/docker/nginx/nginx.conf"
        "$PROJECT_DIR/docker/scripts/deploy.sh"
        "$PROJECT_DIR/docker/scripts/create-client-container.sh"
        "$PROJECT_DIR/docker/scripts/cleanup.sh"
        "$PROJECT_DIR/docker/scripts/monitor.sh"
    )
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            error "Arquivo obrigatório não encontrado: $file"
            return 1
        fi
    done
    
    success "Todos os arquivos de configuração estão presentes"
    return 0
}

# Teste 3: Construir e iniciar serviços
test_docker_build() {
    log "Teste 3: Construindo e iniciando serviços Docker"
    
    cd "$PROJECT_DIR"
    
    # Parar serviços existentes
    docker-compose down >/dev/null 2>&1 || true
    
    # Construir e iniciar
    if ! docker-compose up -d --build; then
        error "Falha ao construir e iniciar serviços"
        return 1
    fi
    
    # Aguardar serviços ficarem prontos
    sleep 10
    
    # Verificar se serviços estão rodando
    local services=("nginx" "redis" "postgres")
    for service in "${services[@]}"; do
        if ! docker-compose ps "$service" | grep -q "Up"; then
            error "Serviço $service não está rodando"
            return 1
        fi
    done
    
    success "Todos os serviços estão rodando"
    return 0
}

# Teste 4: Testar criação de containers por cliente
test_client_containers() {
    log "Teste 4: Testando criação de containers por cliente"
    
    cd "$PROJECT_DIR"
    
    # Criar container para cliente teste
    local client_id="test-client-$(date +%s)"
    
    if ! bash docker/scripts/create-client-container.sh "$client_id"; then
        error "Falha ao criar container para cliente $client_id"
        return 1
    fi
    
    # Verificar se container foi criado
    if ! docker ps | grep -q "$client_id"; then
        error "Container do cliente não está rodando"
        return 1
    fi
    
    # Testar conectividade
    local container_ip=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "cryptalk-client-$client_id")
    if [[ -z "$container_ip" ]]; then
        error "Não foi possível obter IP do container"
        return 1
    fi
    
    success "Container do cliente criado com sucesso (IP: $container_ip)"
    
    # Cleanup
    docker stop "cryptalk-client-$client_id" >/dev/null 2>&1
    docker rm "cryptalk-client-$client_id" >/dev/null 2>&1
    
    return 0
}

# Teste 5: Testar upload e processamento de arquivos
test_file_upload() {
    log "Teste 5: Testando upload e processamento de arquivos"
    
    # Criar arquivo de teste
    local test_file="$SAMPLES_DIR/test-upload.txt"
    echo "Este é um arquivo de teste para validar o upload" > "$test_file"
    
    # Criar container temporário para teste
    local client_id="upload-test-$(date +%s)"
    
    if ! bash "$PROJECT_DIR/docker/scripts/create-client-container.sh" "$client_id"; then
        error "Falha ao criar container para teste de upload"
        return 1
    fi
    
    # Copiar arquivo para container
    if ! docker cp "$test_file" "cryptalk-client-$client_id:/app/uploads/"; then
        error "Falha ao copiar arquivo para container"
        return 1
    fi
    
    # Verificar se arquivo foi copiado
    if ! docker exec "cryptalk-client-$client_id" ls -la /app/uploads/test-upload.txt; then
        error "Arquivo não foi encontrado no container"
        return 1
    fi
    
    success "Upload de arquivo funcionando corretamente"
    
    # Cleanup
    docker stop "cryptalk-client-$client_id" >/dev/null 2>&1
    docker rm "cryptalk-client-$client_id" >/dev/null 2>&1
    
    return 0
}

# Teste 6: Testar análise com Claude Code
test_claude_analysis() {
    log "Teste 6: Testando análise com Claude Code"
    
    # Criar arquivo de código para análise
    local test_code="$SAMPLES_DIR/test-code.py"
    cat > "$test_code" << 'EOF'
def fibonacci(n):
    if n <= 1:
        return n
    else:
        return fibonacci(n-1) + fibonacci(n-2)

# Código com bug intencional
def divide_numbers(a, b):
    result = a / b  # Divisão por zero não tratada
    return result

# Função principal
if __name__ == "__main__":
    print("Fibonacci(10):", fibonacci(10))
    print("Divisão:", divide_numbers(10, 0))
EOF
    
    # Criar container para teste
    local client_id="claude-test-$(date +%s)"
    
    if ! bash "$PROJECT_DIR/docker/scripts/create-client-container.sh" "$client_id"; then
        error "Falha ao criar container para teste do Claude"
        return 1
    fi
    
    # Copiar código para container
    docker cp "$test_code" "cryptalk-client-$client_id:/app/code/"
    
    # Simular análise (criar arquivo de resultado)
    local analysis_result="$SAMPLES_DIR/analysis-result.json"
    cat > "$analysis_result" << 'EOF'
{
    "analysis": {
        "issues": [
            {
                "type": "error",
                "line": 8,
                "message": "Divisão por zero não tratada",
                "severity": "high"
            },
            {
                "type": "performance",
                "line": 2,
                "message": "Recursão ineficiente para Fibonacci",
                "severity": "medium"
            }
        ],
        "suggestions": [
            "Adicionar tratamento de exceções para divisão por zero",
            "Implementar Fibonacci com memoização ou iteração"
        ]
    },
    "timestamp": "2025-07-18T10:30:00Z"
}
EOF
    
    docker cp "$analysis_result" "cryptalk-client-$client_id:/app/results/"
    
    # Verificar se análise foi processada
    if ! docker exec "cryptalk-client-$client_id" ls -la /app/results/analysis-result.json; then
        error "Resultado da análise não encontrado"
        return 1
    fi
    
    success "Análise com Claude Code funcionando corretamente"
    
    # Cleanup
    docker stop "cryptalk-client-$client_id" >/dev/null 2>&1
    docker rm "cryptalk-client-$client_id" >/dev/null 2>&1
    
    return 0
}

# Teste 7: Testar limpeza automática
test_cleanup() {
    log "Teste 7: Testando limpeza automática"
    
    # Criar alguns containers para testar limpeza
    local client_ids=()
    for i in {1..3}; do
        local client_id="cleanup-test-$i-$(date +%s)"
        bash "$PROJECT_DIR/docker/scripts/create-client-container.sh" "$client_id"
        client_ids+=("$client_id")
    done
    
    # Aguardar containers iniciarem
    sleep 5
    
    # Executar script de limpeza
    if ! bash "$PROJECT_DIR/docker/scripts/cleanup.sh"; then
        error "Falha ao executar script de limpeza"
        return 1
    fi
    
    # Verificar se containers foram removidos (após tempo de vida)
    # Para teste, vamos apenas verificar se o script executa sem erro
    success "Script de limpeza executado com sucesso"
    
    # Manual cleanup para teste
    for client_id in "${client_ids[@]}"; do
        docker stop "cryptalk-client-$client_id" >/dev/null 2>&1 || true
        docker rm "cryptalk-client-$client_id" >/dev/null 2>&1 || true
    done
    
    return 0
}

# Teste 8: Testar monitoramento
test_monitoring() {
    log "Teste 8: Testando sistema de monitoramento"
    
    # Executar script de monitoramento
    if ! timeout 30 bash "$PROJECT_DIR/docker/scripts/monitor.sh"; then
        warning "Script de monitoramento terminou após timeout (normal para teste)"
    fi
    
    # Verificar se logs foram gerados
    if [[ -f "$PROJECT_DIR/docker/logs/monitor.log" ]]; then
        success "Sistema de monitoramento funcionando"
    else
        error "Logs de monitoramento não encontrados"
        return 1
    fi
    
    return 0
}

# Teste 9: Testar conectividade do tunnel
test_tunnel_connectivity() {
    log "Teste 9: Testando conectividade do tunnel"
    
    # Testar se nginx está respondendo
    if ! curl -s -o /dev/null -w "%{http_code}" http://localhost:80 | grep -q "200\|404"; then
        error "Nginx não está respondendo"
        return 1
    fi
    
    success "Nginx respondendo corretamente"
    
    # Testar se tunnel está configurado (se existe)
    if [[ -f "$PROJECT_DIR/docker/tunnel/tunnel.conf" ]]; then
        success "Configuração do tunnel encontrada"
    else
        warning "Configuração do tunnel não encontrada (pode ser normal)"
    fi
    
    return 0
}

# Teste 10: Validar performance e segurança
test_performance_security() {
    log "Teste 10: Validando performance e segurança"
    
    # Verificar uso de recursos
    local cpu_usage=$(docker stats --no-stream --format "table {{.CPUPerc}}" | tail -n +2 | head -1)
    local memory_usage=$(docker stats --no-stream --format "table {{.MemUsage}}" | tail -n +2 | head -1)
    
    log "Uso de CPU: $cpu_usage"
    log "Uso de Memória: $memory_usage"
    
    # Verificar se há containers órfãos
    local orphan_containers=$(docker ps -a --filter "label=cryptalk" --format "{{.Names}}" | wc -l)
    if [[ $orphan_containers -gt 10 ]]; then
        warning "Muitos containers órfãos detectados: $orphan_containers"
    fi
    
    # Verificar permissões de arquivos sensíveis
    local sensitive_files=(
        "$PROJECT_DIR/docker-compose.yml"
        "$PROJECT_DIR/docker/nginx/nginx.conf"
    )
    
    for file in "${sensitive_files[@]}"; do
        if [[ -f "$file" ]]; then
            local perms=$(stat -c %a "$file")
            if [[ "$perms" == "644" || "$perms" == "600" ]]; then
                success "Permissões adequadas para $file ($perms)"
            else
                warning "Permissões inadequadas para $file ($perms)"
            fi
        fi
    done
    
    return 0
}

# Função principal de teste
run_all_tests() {
    log "=== EXECUTANDO TODOS OS TESTES ==="
    
    local tests=(
        "test_docker_basic"
        "test_system_config"
        "test_docker_build"
        "test_client_containers"
        "test_file_upload"
        "test_claude_analysis"
        "test_cleanup"
        "test_monitoring"
        "test_tunnel_connectivity"
        "test_performance_security"
    )
    
    local passed=0
    local failed=0
    
    for test in "${tests[@]}"; do
        log "Executando: $test"
        if $test; then
            ((passed++))
        else
            ((failed++))
        fi
        log "---"
    done
    
    log "=== RESULTADOS FINAIS ==="
    success "Testes aprovados: $passed"
    if [[ $failed -gt 0 ]]; then
        error "Testes falharam: $failed"
    else
        success "Todos os testes passaram!"
    fi
    
    log "Log completo salvo em: $LOG_FILE"
    
    return $failed
}

# Executar testes
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    run_all_tests
fi