#!/bin/bash

# Teste específico para containers por cliente
# Este script foca em testar a criação, gerenciamento e isolamento de containers

set -e

# Configurações
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
RESULTS_DIR="$SCRIPT_DIR/results"
LOG_FILE="$RESULTS_DIR/container-test-$(date +%Y%m%d-%H%M%S).log"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Criar diretório de resultados
mkdir -p "$RESULTS_DIR"

# Teste 1: Criação de container único
test_single_container() {
    log "Teste 1: Criação de container único"
    
    local client_id="single-test-$(date +%s)"
    
    # Criar container
    if ! bash "$PROJECT_DIR/docker/scripts/create-client-container.sh" "$client_id"; then
        error "Falha ao criar container $client_id"
        return 1
    fi
    
    # Verificar se está rodando
    if ! docker ps | grep -q "cryptalk-client-$client_id"; then
        error "Container $client_id não está rodando"
        return 1
    fi
    
    # Verificar rede
    local network_info=$(docker inspect "cryptalk-client-$client_id" --format '{{.NetworkSettings.Networks}}')
    if [[ -z "$network_info" ]]; then
        error "Container não tem configuração de rede"
        return 1
    fi
    
    success "Container $client_id criado e configurado corretamente"
    
    # Cleanup
    docker stop "cryptalk-client-$client_id" >/dev/null 2>&1
    docker rm "cryptalk-client-$client_id" >/dev/null 2>&1
    
    return 0
}

# Teste 2: Criação de múltiplos containers
test_multiple_containers() {
    log "Teste 2: Criação de múltiplos containers"
    
    local client_ids=()
    local num_containers=5
    
    # Criar múltiplos containers
    for i in $(seq 1 $num_containers); do
        local client_id="multi-test-$i-$(date +%s)"
        
        if ! bash "$PROJECT_DIR/docker/scripts/create-client-container.sh" "$client_id"; then
            error "Falha ao criar container $client_id"
            return 1
        fi
        
        client_ids+=("$client_id")
    done
    
    # Verificar se todos estão rodando
    for client_id in "${client_ids[@]}"; do
        if ! docker ps | grep -q "cryptalk-client-$client_id"; then
            error "Container $client_id não está rodando"
            return 1
        fi
    done
    
    success "Criados $num_containers containers com sucesso"
    
    # Cleanup
    for client_id in "${client_ids[@]}"; do
        docker stop "cryptalk-client-$client_id" >/dev/null 2>&1
        docker rm "cryptalk-client-$client_id" >/dev/null 2>&1
    done
    
    return 0
}

# Teste 3: Isolamento entre containers
test_container_isolation() {
    log "Teste 3: Testando isolamento entre containers"
    
    local client_id1="isolation-test-1-$(date +%s)"
    local client_id2="isolation-test-2-$(date +%s)"
    
    # Criar dois containers
    bash "$PROJECT_DIR/docker/scripts/create-client-container.sh" "$client_id1"
    bash "$PROJECT_DIR/docker/scripts/create-client-container.sh" "$client_id2"
    
    # Verificar se têm IPs diferentes
    local ip1=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "cryptalk-client-$client_id1")
    local ip2=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "cryptalk-client-$client_id2")
    
    if [[ "$ip1" == "$ip2" ]]; then
        error "Containers têm o mesmo IP: $ip1"
        return 1
    fi
    
    success "Containers têm IPs diferentes: $ip1 e $ip2"
    
    # Testar isolamento de processos
    local proc1=$(docker exec "cryptalk-client-$client_id1" ps aux | wc -l)
    local proc2=$(docker exec "cryptalk-client-$client_id2" ps aux | wc -l)
    
    if [[ $proc1 -eq $proc2 ]]; then
        success "Containers têm isolamento de processos"
    else
        warning "Diferença no número de processos: $proc1 vs $proc2"
    fi
    
    # Cleanup
    docker stop "cryptalk-client-$client_id1" "cryptalk-client-$client_id2" >/dev/null 2>&1
    docker rm "cryptalk-client-$client_id1" "cryptalk-client-$client_id2" >/dev/null 2>&1
    
    return 0
}

# Teste 4: Recursos e limites
test_resource_limits() {
    log "Teste 4: Testando limites de recursos"
    
    local client_id="resource-test-$(date +%s)"
    
    # Criar container
    bash "$PROJECT_DIR/docker/scripts/create-client-container.sh" "$client_id"
    
    # Verificar limites de memória
    local memory_limit=$(docker inspect "cryptalk-client-$client_id" --format '{{.HostConfig.Memory}}')
    if [[ "$memory_limit" != "0" ]]; then
        success "Limite de memória configurado: $memory_limit bytes"
    else
        warning "Sem limite de memória configurado"
    fi
    
    # Verificar limites de CPU
    local cpu_limit=$(docker inspect "cryptalk-client-$client_id" --format '{{.HostConfig.CpuShares}}')
    if [[ "$cpu_limit" != "0" ]]; then
        success "Limite de CPU configurado: $cpu_limit"
    else
        warning "Sem limite de CPU configurado"
    fi
    
    # Cleanup
    docker stop "cryptalk-client-$client_id" >/dev/null 2>&1
    docker rm "cryptalk-client-$client_id" >/dev/null 2>&1
    
    return 0
}

# Teste 5: Persistência e volumes
test_volumes() {
    log "Teste 5: Testando volumes e persistência"
    
    local client_id="volume-test-$(date +%s)"
    
    # Criar container
    bash "$PROJECT_DIR/docker/scripts/create-client-container.sh" "$client_id"
    
    # Verificar volumes montados
    local volumes=$(docker inspect "cryptalk-client-$client_id" --format '{{.Mounts}}')
    if [[ -n "$volumes" ]]; then
        success "Volumes configurados: $volumes"
    else
        warning "Nenhum volume configurado"
    fi
    
    # Testar escrita em volume
    docker exec "cryptalk-client-$client_id" touch /app/uploads/test-file.txt
    
    if docker exec "cryptalk-client-$client_id" ls -la /app/uploads/test-file.txt; then
        success "Escrita em volume funcionando"
    else
        error "Falha na escrita em volume"
        return 1
    fi
    
    # Cleanup
    docker stop "cryptalk-client-$client_id" >/dev/null 2>&1
    docker rm "cryptalk-client-$client_id" >/dev/null 2>&1
    
    return 0
}

# Executar todos os testes
run_container_tests() {
    log "=== EXECUTANDO TESTES DE CONTAINERS ==="
    
    local tests=(
        "test_single_container"
        "test_multiple_containers"
        "test_container_isolation"
        "test_resource_limits"
        "test_volumes"
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
    
    log "=== RESULTADOS DOS TESTES DE CONTAINERS ==="
    success "Testes aprovados: $passed"
    if [[ $failed -gt 0 ]]; then
        error "Testes falharam: $failed"
    else
        success "Todos os testes de containers passaram!"
    fi
    
    return $failed
}

# Executar se chamado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    run_container_tests
fi