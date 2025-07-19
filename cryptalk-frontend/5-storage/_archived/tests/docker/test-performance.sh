#!/bin/bash

# Teste de performance e carga do sistema Docker
# Este script testa performance, carga e escalabilidade

set -e

# Configurações
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
RESULTS_DIR="$SCRIPT_DIR/results"
LOG_FILE="$RESULTS_DIR/performance-test-$(date +%Y%m%d-%H%M%S).log"

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

warning() {
    echo -e "${YELLOW}⚠ $1${NC}" | tee -a "$LOG_FILE"
}

# Criar diretório de resultados
mkdir -p "$RESULTS_DIR"

# Função para medir tempo
measure_time() {
    local start_time=$(date +%s.%N)
    "$@"
    local end_time=$(date +%s.%N)
    local duration=$(echo "$end_time - $start_time" | bc)
    echo "$duration"
}

# Teste 1: Tempo de criação de container
test_container_creation_time() {
    log "Teste 1: Tempo de criação de container"
    
    local client_id="perf-test-$(date +%s)"
    
    # Medir tempo de criação
    local creation_time=$(measure_time bash "$PROJECT_DIR/docker/scripts/create-client-container.sh" "$client_id")
    
    log "Tempo de criação: ${creation_time}s"
    
    # Avaliar performance
    if (( $(echo "$creation_time < 10" | bc -l) )); then
        success "Criação rápida (<10s): ${creation_time}s"
    elif (( $(echo "$creation_time < 30" | bc -l) )); then
        warning "Criação moderada (10-30s): ${creation_time}s"
    else
        error "Criação lenta (>30s): ${creation_time}s"
    fi
    
    # Cleanup
    docker stop "cryptalk-client-$client_id" >/dev/null 2>&1
    docker rm "cryptalk-client-$client_id" >/dev/null 2>&1
    
    return 0
}

# Teste 2: Carga com múltiplos containers
test_load_multiple_containers() {
    log "Teste 2: Carga com múltiplos containers"
    
    local num_containers=10
    local client_ids=()
    
    # Medir tempo para criar múltiplos containers
    local start_time=$(date +%s.%N)
    
    for i in $(seq 1 $num_containers); do
        local client_id="load-test-$i-$(date +%s)"
        
        bash "$PROJECT_DIR/docker/scripts/create-client-container.sh" "$client_id" &
        client_ids+=("$client_id")
        
        # Limitar paralelismo
        if (( i % 3 == 0 )); then
            wait
        fi
    done
    
    wait # Aguardar todos terminarem
    
    local end_time=$(date +%s.%N)
    local total_time=$(echo "$end_time - $start_time" | bc)
    
    log "Tempo total para $num_containers containers: ${total_time}s"
    
    # Verificar se todos estão rodando
    local running_count=0
    for client_id in "${client_ids[@]}"; do
        if docker ps | grep -q "cryptalk-client-$client_id"; then
            ((running_count++))
        fi
    done
    
    log "Containers rodando: $running_count/$num_containers"
    
    if [[ $running_count -eq $num_containers ]]; then
        success "Todos os containers estão rodando"
    else
        error "Alguns containers falharam: $running_count/$num_containers"
    fi
    
    # Cleanup
    for client_id in "${client_ids[@]}"; do
        docker stop "cryptalk-client-$client_id" >/dev/null 2>&1 &
        docker rm "cryptalk-client-$client_id" >/dev/null 2>&1 &
    done
    
    wait
    
    return 0
}

# Teste 3: Uso de recursos do sistema
test_resource_usage() {
    log "Teste 3: Uso de recursos do sistema"
    
    # Criar alguns containers para teste
    local client_ids=()
    for i in {1..5}; do
        local client_id="resource-test-$i-$(date +%s)"
        bash "$PROJECT_DIR/docker/scripts/create-client-container.sh" "$client_id" &
        client_ids+=("$client_id")
    done
    
    wait
    
    # Aguardar containers inicializarem
    sleep 5
    
    # Coletar estatísticas
    local stats_file="$RESULTS_DIR/resource-stats.txt"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}" > "$stats_file"
    
    log "Estatísticas de recursos salvas em: $stats_file"
    
    # Analisar uso de CPU
    local avg_cpu=$(docker stats --no-stream --format "{{.CPUPerc}}" | sed 's/%//' | awk '{sum += $1} END {print sum/NR}')
    log "Uso médio de CPU: ${avg_cpu}%"
    
    if (( $(echo "$avg_cpu < 50" | bc -l) )); then
        success "Uso de CPU aceitável: ${avg_cpu}%"
    else
        warning "Uso de CPU alto: ${avg_cpu}%"
    fi
    
    # Analisar uso de memória
    local total_memory=$(docker stats --no-stream --format "{{.MemUsage}}" | cut -d'/' -f1 | sed 's/[^0-9.]//g' | awk '{sum += $1} END {print sum}')
    log "Uso total de memória: ${total_memory}MB"
    
    # Cleanup
    for client_id in "${client_ids[@]}"; do
        docker stop "cryptalk-client-$client_id" >/dev/null 2>&1 &
        docker rm "cryptalk-client-$client_id" >/dev/null 2>&1 &
    done
    
    wait
    
    return 0
}

# Teste 4: Stress test de upload
test_upload_stress() {
    log "Teste 4: Stress test de upload"
    
    local client_id="upload-stress-$(date +%s)"
    
    # Criar container
    bash "$PROJECT_DIR/docker/scripts/create-client-container.sh" "$client_id"
    
    # Criar múltiplos arquivos de teste
    local temp_dir="/tmp/upload-test-$(date +%s)"
    mkdir -p "$temp_dir"
    
    for i in {1..10}; do
        local file_size=$((1024 * (i * 10))) # 10KB, 20KB, 30KB, etc.
        dd if=/dev/zero of="$temp_dir/test-file-$i.dat" bs=1024 count=$((file_size / 1024)) 2>/dev/null
    done
    
    # Medir tempo de upload
    local start_time=$(date +%s.%N)
    
    for file in "$temp_dir"/*; do
        docker cp "$file" "cryptalk-client-$client_id:/app/uploads/" &
    done
    
    wait
    
    local end_time=$(date +%s.%N)
    local upload_time=$(echo "$end_time - $start_time" | bc)
    
    log "Tempo total de upload: ${upload_time}s"
    
    # Verificar se todos os arquivos foram copiados
    local uploaded_count=$(docker exec "cryptalk-client-$client_id" ls -la /app/uploads/*.dat | wc -l)
    log "Arquivos uploaded: $uploaded_count/10"
    
    if [[ $uploaded_count -eq 10 ]]; then
        success "Todos os arquivos foram enviados"
    else
        error "Alguns arquivos falharam no upload"
    fi
    
    # Cleanup
    rm -rf "$temp_dir"
    docker stop "cryptalk-client-$client_id" >/dev/null 2>&1
    docker rm "cryptalk-client-$client_id" >/dev/null 2>&1
    
    return 0
}

# Teste 5: Performance de rede
test_network_performance() {
    log "Teste 5: Performance de rede"
    
    local client_id1="network-test-1-$(date +%s)"
    local client_id2="network-test-2-$(date +%s)"
    
    # Criar dois containers
    bash "$PROJECT_DIR/docker/scripts/create-client-container.sh" "$client_id1"
    bash "$PROJECT_DIR/docker/scripts/create-client-container.sh" "$client_id2"
    
    # Obter IPs
    local ip1=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "cryptalk-client-$client_id1")
    local ip2=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "cryptalk-client-$client_id2")
    
    # Teste de conectividade
    if docker exec "cryptalk-client-$client_id1" ping -c 3 "$ip2" >/dev/null 2>&1; then
        success "Conectividade entre containers OK"
    else
        error "Falha na conectividade entre containers"
    fi
    
    # Teste de latência
    local latency=$(docker exec "cryptalk-client-$client_id1" ping -c 3 "$ip2" | tail -1 | awk -F'/' '{print $4}')
    log "Latência média: ${latency}ms"
    
    # Cleanup
    docker stop "cryptalk-client-$client_id1" "cryptalk-client-$client_id2" >/dev/null 2>&1
    docker rm "cryptalk-client-$client_id1" "cryptalk-client-$client_id2" >/dev/null 2>&1
    
    return 0
}

# Teste 6: Escalabilidade
test_scalability() {
    log "Teste 6: Teste de escalabilidade"
    
    local max_containers=20
    local client_ids=()
    local creation_times=()
    
    # Criar containers incrementalmente
    for i in $(seq 1 $max_containers); do
        local client_id="scale-test-$i-$(date +%s)"
        
        local start_time=$(date +%s.%N)
        bash "$PROJECT_DIR/docker/scripts/create-client-container.sh" "$client_id"
        local end_time=$(date +%s.%N)
        
        local creation_time=$(echo "$end_time - $start_time" | bc)
        creation_times+=("$creation_time")
        client_ids+=("$client_id")
        
        log "Container $i criado em ${creation_time}s"
        
        # Verificar se há degradação significativa
        if (( i > 5 )); then
            local avg_last_5=$(printf '%s\n' "${creation_times[@]: -5}" | awk '{sum += $1} END {print sum/NR}')
            if (( $(echo "$avg_last_5 > 30" | bc -l) )); then
                warning "Degradação detectada após $i containers (média: ${avg_last_5}s)"
                break
            fi
        fi
    done
    
    # Calcular estatísticas
    local avg_time=$(printf '%s\n' "${creation_times[@]}" | awk '{sum += $1} END {print sum/NR}')
    local min_time=$(printf '%s\n' "${creation_times[@]}" | sort -n | head -1)
    local max_time=$(printf '%s\n' "${creation_times[@]}" | sort -n | tail -1)
    
    log "Estatísticas de criação:"
    log "  Média: ${avg_time}s"
    log "  Mínimo: ${min_time}s"
    log "  Máximo: ${max_time}s"
    log "  Total de containers: ${#client_ids[@]}"
    
    # Cleanup
    for client_id in "${client_ids[@]}"; do
        docker stop "$client_id" >/dev/null 2>&1 &
        docker rm "$client_id" >/dev/null 2>&1 &
    done
    
    wait
    
    return 0
}

# Executar todos os testes
run_performance_tests() {
    log "=== EXECUTANDO TESTES DE PERFORMANCE ==="
    
    local tests=(
        "test_container_creation_time"
        "test_load_multiple_containers"
        "test_resource_usage"
        "test_upload_stress"
        "test_network_performance"
        "test_scalability"
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
    
    log "=== RESULTADOS DOS TESTES DE PERFORMANCE ==="
    success "Testes aprovados: $passed"
    if [[ $failed -gt 0 ]]; then
        error "Testes falharam: $failed"
    else
        success "Todos os testes de performance passaram!"
    fi
    
    return $failed
}

# Executar se chamado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    run_performance_tests
fi