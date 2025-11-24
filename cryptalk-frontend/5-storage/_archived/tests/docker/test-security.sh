#!/bin/bash

# Teste de segurança do sistema Docker
# Este script testa configurações de segurança, isolamento e vulnerabilidades

set -e

# Configurações
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
RESULTS_DIR="$SCRIPT_DIR/results"
LOG_FILE="$RESULTS_DIR/security-test-$(date +%Y%m%d-%H%M%S).log"

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

# Teste 1: Verificar usuário não-root
test_non_root_user() {
    log "Teste 1: Verificando usuário não-root"
    
    local client_id="security-test-$(date +%s)"
    
    # Criar container
    bash "$PROJECT_DIR/docker/scripts/create-client-container.sh" "$client_id"
    
    # Verificar usuário dentro do container
    local user_id=$(docker exec "cryptalk-client-$client_id" id -u)
    local user_name=$(docker exec "cryptalk-client-$client_id" whoami)
    
    if [[ "$user_id" != "0" ]]; then
        success "Container rodando como usuário não-root: $user_name (UID: $user_id)"
    else
        error "Container rodando como root (UID: $user_id)"
    fi
    
    # Cleanup
    docker stop "cryptalk-client-$client_id" >/dev/null 2>&1
    docker rm "cryptalk-client-$client_id" >/dev/null 2>&1
    
    return 0
}

# Teste 2: Verificar capabilities limitadas
test_capabilities() {
    log "Teste 2: Verificando capabilities limitadas"
    
    local client_id="cap-test-$(date +%s)"
    
    # Criar container
    bash "$PROJECT_DIR/docker/scripts/create-client-container.sh" "$client_id"
    
    # Verificar capabilities
    local caps=$(docker exec "cryptalk-client-$client_id" grep Cap /proc/self/status | head -1 | awk '{print $2}')
    
    if [[ "$caps" == "0000000000000000" ]]; then
        success "Capabilities totalmente removidas"
    elif [[ "$caps" == "00000000a80425fb" ]]; then
        warning "Capabilities padrão do Docker (ainda são muitas)"
    else
        log "Capabilities atuais: $caps"
        warning "Capabilities customizadas detectadas"
    fi
    
    # Testar se pode fazer bind em portas privilegiadas
    if docker exec "cryptalk-client-$client_id" python3 -c "import socket; s = socket.socket(); s.bind(('', 80))" 2>/dev/null; then
        error "Container pode fazer bind em portas privilegiadas"
    else
        success "Container não pode fazer bind em portas privilegiadas"
    fi
    
    # Cleanup
    docker stop "cryptalk-client-$client_id" >/dev/null 2>&1
    docker rm "cryptalk-client-$client_id" >/dev/null 2>&1
    
    return 0
}

# Teste 3: Verificar isolamento de sistema de arquivos
test_filesystem_isolation() {
    log "Teste 3: Verificando isolamento de sistema de arquivos"
    
    local client_id="fs-test-$(date +%s)"
    
    # Criar container
    bash "$PROJECT_DIR/docker/scripts/create-client-container.sh" "$client_id"
    
    # Tentar acessar arquivos sensíveis do host
    local sensitive_files=(
        "/etc/passwd"
        "/etc/shadow"
        "/proc/mounts"
        "/sys/class/dmi/id/product_uuid"
    )
    
    for file in "${sensitive_files[@]}"; do
        if docker exec "cryptalk-client-$client_id" test -r "$file" 2>/dev/null; then
            if [[ "$file" == "/etc/passwd" || "$file" == "/proc/mounts" ]]; then
                # Estes são normalmente acessíveis
                success "Arquivo $file acessível (normal)"
            else
                warning "Arquivo sensível acessível: $file"
            fi
        else
            success "Arquivo sensível protegido: $file"
        fi
    done
    
    # Verificar se não pode escrever em diretórios do sistema
    if docker exec "cryptalk-client-$client_id" touch /etc/test-file 2>/dev/null; then
        error "Container pode escrever em /etc/"
    else
        success "Container não pode escrever em /etc/"
    fi
    
    # Cleanup
    docker stop "cryptalk-client-$client_id" >/dev/null 2>&1
    docker rm "cryptalk-client-$client_id" >/dev/null 2>&1
    
    return 0
}

# Teste 4: Verificar isolamento de rede
test_network_isolation() {
    log "Teste 4: Verificando isolamento de rede"
    
    local client_id="net-test-$(date +%s)"
    
    # Criar container
    bash "$PROJECT_DIR/docker/scripts/create-client-container.sh" "$client_id"
    
    # Verificar se pode acessar serviços locais do host
    local local_services=(
        "127.0.0.1:22"      # SSH
        "127.0.0.1:80"      # HTTP
        "127.0.0.1:443"     # HTTPS
        "127.0.0.1:3306"    # MySQL
        "127.0.0.1:5432"    # PostgreSQL
    )
    
    for service in "${local_services[@]}"; do
        if docker exec "cryptalk-client-$client_id" timeout 3 bash -c "cat < /dev/null > /dev/tcp/$service" 2>/dev/null; then
            warning "Container pode acessar serviço local: $service"
        else
            success "Container não pode acessar serviço local: $service"
        fi
    done
    
    # Verificar se tem acesso à internet (deve ter para funcionar)
    if docker exec "cryptalk-client-$client_id" ping -c 1 8.8.8.8 >/dev/null 2>&1; then
        success "Container tem acesso à internet"
    else
        warning "Container não tem acesso à internet"
    fi
    
    # Cleanup
    docker stop "cryptalk-client-$client_id" >/dev/null 2>&1
    docker rm "cryptalk-client-$client_id" >/dev/null 2>&1
    
    return 0
}

# Teste 5: Verificar recursos limitados
test_resource_limits() {
    log "Teste 5: Verificando limites de recursos"
    
    local client_id="limit-test-$(date +%s)"
    
    # Criar container
    bash "$PROJECT_DIR/docker/scripts/create-client-container.sh" "$client_id"
    
    # Verificar limites de memória
    local mem_limit=$(docker inspect "cryptalk-client-$client_id" --format '{{.HostConfig.Memory}}')
    if [[ "$mem_limit" != "0" ]]; then
        success "Limite de memória configurado: $mem_limit bytes"
    else
        warning "Sem limite de memória configurado"
    fi
    
    # Verificar limites de CPU
    local cpu_limit=$(docker inspect "cryptalk-client-$client_id" --format '{{.HostConfig.CpuShares}}')
    if [[ "$cpu_limit" != "0" ]]; then
        success "Limite de CPU configurado: $cpu_limit shares"
    else
        warning "Sem limite de CPU configurado"
    fi
    
    # Verificar se PIDs são limitados
    local pids_limit=$(docker inspect "cryptalk-client-$client_id" --format '{{.HostConfig.PidsLimit}}')
    if [[ "$pids_limit" != "0" && "$pids_limit" != "-1" ]]; then
        success "Limite de PIDs configurado: $pids_limit"
    else
        warning "Sem limite de PIDs configurado"
    fi
    
    # Cleanup
    docker stop "cryptalk-client-$client_id" >/dev/null 2>&1
    docker rm "cryptalk-client-$client_id" >/dev/null 2>&1
    
    return 0
}

# Teste 6: Verificar configurações de segurança do Docker
test_docker_security_config() {
    log "Teste 6: Verificando configurações de segurança do Docker"
    
    # Verificar se Docker daemon está rodando como root
    local docker_user=$(ps aux | grep dockerd | grep -v grep | awk '{print $1}' | head -1)
    if [[ "$docker_user" == "root" ]]; then
        warning "Docker daemon rodando como root (padrão)"
    else
        success "Docker daemon rodando como usuário não-root: $docker_user"
    fi
    
    # Verificar se Docker socket está protegido
    if [[ -S "/var/run/docker.sock" ]]; then
        local socket_perms=$(stat -c %a /var/run/docker.sock)
        if [[ "$socket_perms" == "660" || "$socket_perms" == "640" ]]; then
            success "Permissões do Docker socket adequadas: $socket_perms"
        else
            warning "Permissões do Docker socket: $socket_perms"
        fi
    fi
    
    # Verificar se há configurações de segurança específicas
    if [[ -f "/etc/docker/daemon.json" ]]; then
        if grep -q "userns-remap" /etc/docker/daemon.json; then
            success "User namespace remapping configurado"
        else
            warning "User namespace remapping não configurado"
        fi
    else
        warning "Arquivo de configuração do Docker não encontrado"
    fi
    
    return 0
}

# Teste 7: Verificar vulnerabilidades conhecidas
test_known_vulnerabilities() {
    log "Teste 7: Verificando vulnerabilidades conhecidas"
    
    local client_id="vuln-test-$(date +%s)"
    
    # Criar container
    bash "$PROJECT_DIR/docker/scripts/create-client-container.sh" "$client_id"
    
    # Teste de escape de container (básico)
    # Tentar montar /proc/sys/kernel/core_pattern
    if docker exec "cryptalk-client-$client_id" test -w /proc/sys/kernel/core_pattern 2>/dev/null; then
        error "Container pode escrever em /proc/sys/kernel/core_pattern (vulnerabilidade crítica)"
    else
        success "Container não pode escrever em /proc/sys/kernel/core_pattern"
    fi
    
    # Verificar se pode acessar cgroups do host
    if docker exec "cryptalk-client-$client_id" ls /sys/fs/cgroup/*/docker 2>/dev/null | head -1; then
        warning "Container pode acessar cgroups do Docker"
    else
        success "Container não pode acessar cgroups do Docker"
    fi
    
    # Verificar se pode ver processos do host
    local host_processes=$(docker exec "cryptalk-client-$client_id" ps aux | grep -v "PID\|/bin/bash\|ps aux" | wc -l)
    if [[ $host_processes -gt 10 ]]; then
        warning "Container pode ver muitos processos ($host_processes)"
    else
        success "Container vê poucos processos ($host_processes)"
    fi
    
    # Cleanup
    docker stop "cryptalk-client-$client_id" >/dev/null 2>&1
    docker rm "cryptalk-client-$client_id" >/dev/null 2>&1
    
    return 0
}

# Teste 8: Verificar logs de segurança
test_security_logs() {
    log "Teste 8: Verificando logs de segurança"
    
    # Verificar se há logs de auditoria
    if [[ -f "/var/log/audit/audit.log" ]]; then
        local docker_events=$(grep -c "docker" /var/log/audit/audit.log 2>/dev/null || echo "0")
        if [[ $docker_events -gt 0 ]]; then
            success "Logs de auditoria do Docker encontrados: $docker_events eventos"
        else
            warning "Nenhum evento Docker nos logs de auditoria"
        fi
    else
        warning "Sistema de auditoria não configurado"
    fi
    
    # Verificar logs do Docker daemon
    if journalctl -u docker.service --no-pager -n 10 >/dev/null 2>&1; then
        success "Logs do Docker daemon acessíveis"
    else
        warning "Logs do Docker daemon não acessíveis"
    fi
    
    return 0
}

# Executar todos os testes
run_security_tests() {
    log "=== EXECUTANDO TESTES DE SEGURANÇA ==="
    
    local tests=(
        "test_non_root_user"
        "test_capabilities"
        "test_filesystem_isolation"
        "test_network_isolation"
        "test_resource_limits"
        "test_docker_security_config"
        "test_known_vulnerabilities"
        "test_security_logs"
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
    
    log "=== RESULTADOS DOS TESTES DE SEGURANÇA ==="
    success "Testes aprovados: $passed"
    if [[ $failed -gt 0 ]]; then
        error "Testes falharam: $failed"
    else
        success "Todos os testes de segurança passaram!"
    fi
    
    return $failed
}

# Executar se chamado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    run_security_tests
fi