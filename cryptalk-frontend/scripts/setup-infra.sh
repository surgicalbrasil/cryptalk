#!/bin/bash

# Claude Code Docker Infrastructure Setup Script
# Este script configura toda a infraestrutura necessária para o Claude Code

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

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Verificar se está rodando como root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "Este script deve ser executado como root"
        exit 1
    fi
}

# Verificar dependências do sistema
check_dependencies() {
    log "Verificando dependências do sistema..."
    
    local deps=("docker" "docker-compose" "nginx" "curl" "jq" "node" "npm")
    local missing_deps=()
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing_deps+=("$dep")
        fi
    done
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        error "Dependências ausentes: ${missing_deps[*]}"
        log "Instalando dependências..."
        install_dependencies "${missing_deps[@]}"
    else
        success "Todas as dependências estão instaladas"
    fi
}

# Instalar dependências
install_dependencies() {
    local deps=("$@")
    
    # Detectar distribuição
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$NAME
    fi
    
    case $OS in
        "Ubuntu"*)
            apt-get update
            apt-get install -y curl software-properties-common
            
            # Instalar Docker
            if [[ " ${deps[*]} " =~ " docker " ]]; then
                curl -fsSL https://get.docker.com -o get-docker.sh
                sh get-docker.sh
                usermod -aG docker $SUDO_USER
            fi
            
            # Instalar Docker Compose
            if [[ " ${deps[*]} " =~ " docker-compose " ]]; then
                curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
                chmod +x /usr/local/bin/docker-compose
            fi
            
            # Instalar Nginx
            if [[ " ${deps[*]} " =~ " nginx " ]]; then
                apt-get install -y nginx
            fi
            
            # Instalar Node.js
            if [[ " ${deps[*]} " =~ " node " ]]; then
                curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
                apt-get install -y nodejs
            fi
            
            # Instalar outras dependências
            apt-get install -y jq
            ;;
            
        "CentOS"*|"Red Hat"*|"Fedora"*)
            # Instalar para sistemas baseados em Red Hat
            yum update -y
            yum install -y curl wget jq
            
            # Docker
            if [[ " ${deps[*]} " =~ " docker " ]]; then
                yum install -y yum-utils
                yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
                yum install -y docker-ce docker-ce-cli containerd.io
                systemctl start docker
                systemctl enable docker
                usermod -aG docker $SUDO_USER
            fi
            
            # Node.js
            if [[ " ${deps[*]} " =~ " node " ]]; then
                curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
                yum install -y nodejs
            fi
            
            # Nginx
            if [[ " ${deps[*]} " =~ " nginx " ]]; then
                yum install -y nginx
            fi
            ;;
            
        *)
            error "Sistema operacional não suportado: $OS"
            exit 1
            ;;
    esac
}

# Configurar Docker
setup_docker() {
    log "Configurando Docker..."
    
    # Verificar se Docker está rodando
    if ! systemctl is-active --quiet docker; then
        systemctl start docker
        systemctl enable docker
    fi
    
    # Configurar daemon.json
    mkdir -p /etc/docker
    cat > /etc/docker/daemon.json <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "userns-remap": "default",
  "live-restore": true,
  "userland-proxy": false,
  "no-new-privileges": true
}
EOF
    
    # Reiniciar Docker
    systemctl restart docker
    
    # Verificar instalação
    if docker --version && docker-compose --version; then
        success "Docker configurado com sucesso"
    else
        error "Falha na configuração do Docker"
        exit 1
    fi
}

# Configurar Nginx
setup_nginx() {
    log "Configurando Nginx..."
    
    # Backup da configuração existente
    if [[ -f /etc/nginx/nginx.conf ]]; then
        cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup
    fi
    
    # Criar configuração personalizada
    cat > /etc/nginx/sites-available/claude-code <<EOF
upstream claude_backend {
    server localhost:3000;
}

server {
    listen 80;
    server_name localhost;
    
    # Configurações de segurança
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    
    # Configurações de upload
    client_max_body_size 100M;
    client_body_timeout 300s;
    client_header_timeout 300s;
    
    # Proxy para o backend
    location / {
        proxy_pass http://claude_backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://claude_backend;
    }
    
    # Arquivos estáticos
    location /static/ {
        alias /var/www/claude-code/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Logs
    access_log /var/log/nginx/claude-code.access.log;
    error_log /var/log/nginx/claude-code.error.log;
}
EOF
    
    # Habilitar site
    ln -sf /etc/nginx/sites-available/claude-code /etc/nginx/sites-enabled/
    
    # Remover site padrão
    rm -f /etc/nginx/sites-enabled/default
    
    # Testar configuração
    if nginx -t; then
        systemctl restart nginx
        systemctl enable nginx
        success "Nginx configurado com sucesso"
    else
        error "Erro na configuração do Nginx"
        exit 1
    fi
}

# Configurar firewall
setup_firewall() {
    log "Configurando firewall..."
    
    # Verificar se UFW está instalado
    if command -v ufw &> /dev/null; then
        # Configurar UFW
        ufw default deny incoming
        ufw default allow outgoing
        ufw allow ssh
        ufw allow 80/tcp
        ufw allow 443/tcp
        ufw --force enable
        success "UFW configurado"
    elif command -v firewall-cmd &> /dev/null; then
        # Configurar firewalld
        firewall-cmd --permanent --add-service=http
        firewall-cmd --permanent --add-service=https
        firewall-cmd --permanent --add-service=ssh
        firewall-cmd --reload
        success "Firewalld configurado"
    else
        warning "Nenhum firewall encontrado, considere instalar UFW ou firewalld"
    fi
}

# Configurar diretórios
setup_directories() {
    log "Configurando estrutura de diretórios..."
    
    local base_dir="/opt/claude-code"
    local dirs=(
        "$base_dir/data"
        "$base_dir/logs"
        "$base_dir/uploads/pending"
        "$base_dir/uploads/processing"
        "$base_dir/uploads/completed"
        "$base_dir/uploads/failed"
        "$base_dir/backups"
        "$base_dir/scripts"
        "/var/www/claude-code/static"
    )
    
    for dir in "${dirs[@]}"; do
        mkdir -p "$dir"
        chown -R $SUDO_USER:$SUDO_USER "$dir"
        chmod 755 "$dir"
    done
    
    success "Estrutura de diretórios criada"
}

# Configurar systemd service
setup_systemd() {
    log "Configurando serviço systemd..."
    
    cat > /etc/systemd/system/claude-code.service <<EOF
[Unit]
Description=Claude Code Docker Service
After=docker.service
Requires=docker.service

[Service]
Type=simple
User=$SUDO_USER
Group=docker
WorkingDirectory=/opt/claude-code
ExecStart=/usr/bin/docker-compose up
ExecStop=/usr/bin/docker-compose down
Restart=always
RestartSec=10

# Configurações de segurança
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/opt/claude-code

# Configurações de recursos
MemoryLimit=2G
TasksMax=1000

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable claude-code
    
    success "Serviço systemd configurado"
}

# Configurar monitoramento
setup_monitoring() {
    log "Configurando monitoramento..."
    
    # Criar script de monitoramento
    cat > /opt/claude-code/scripts/monitor.sh <<'EOF'
#!/bin/bash

# Script de monitoramento para Claude Code
LOG_FILE="/var/log/claude-code-monitor.log"
ALERT_EMAIL="admin@example.com"

# Função para logging
log_message() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Verificar se o serviço está rodando
check_service() {
    if ! systemctl is-active --quiet claude-code; then
        log_message "ERROR: Claude Code service is not running"
        systemctl start claude-code
        return 1
    fi
    return 0
}

# Verificar uso de memória
check_memory() {
    local memory_usage=$(free | grep Mem | awk '{printf "%.2f", $3/$2 * 100.0}')
    local memory_limit=80
    
    if (( $(echo "$memory_usage > $memory_limit" | bc -l) )); then
        log_message "WARNING: High memory usage: ${memory_usage}%"
        return 1
    fi
    return 0
}

# Verificar uso de disco
check_disk() {
    local disk_usage=$(df /opt/claude-code | tail -1 | awk '{print $5}' | sed 's/%//')
    local disk_limit=80
    
    if [[ $disk_usage -gt $disk_limit ]]; then
        log_message "WARNING: High disk usage: ${disk_usage}%"
        return 1
    fi
    return 0
}

# Verificar containers Docker
check_containers() {
    local failed_containers=$(docker ps -a --filter "status=exited" --filter "name=claude-user-" | wc -l)
    
    if [[ $failed_containers -gt 5 ]]; then
        log_message "WARNING: Many failed containers: $failed_containers"
        # Limpar containers falidos
        docker container prune -f
    fi
}

# Executar verificações
check_service
check_memory
check_disk
check_containers

log_message "Monitoring check completed"
EOF
    
    chmod +x /opt/claude-code/scripts/monitor.sh
    
    # Configurar cron para monitoramento
    (crontab -l 2>/dev/null; echo "*/5 * * * * /opt/claude-code/scripts/monitor.sh") | crontab -
    
    success "Monitoramento configurado"
}

# Configurar SSL/TLS (Let's Encrypt)
setup_ssl() {
    log "Configurando SSL/TLS..."
    
    # Instalar Certbot
    if ! command -v certbot &> /dev/null; then
        case $OS in
            "Ubuntu"*)
                apt-get install -y certbot python3-certbot-nginx
                ;;
            "CentOS"*|"Red Hat"*|"Fedora"*)
                yum install -y certbot python3-certbot-nginx
                ;;
        esac
    fi
    
    # Configuração SSL será feita manualmente depois
    warning "SSL deve ser configurado manualmente após setup inicial"
    warning "Execute: certbot --nginx -d seu-dominio.com"
}

# Configurar backup automático
setup_backup() {
    log "Configurando backup automático..."
    
    cat > /opt/claude-code/scripts/backup.sh <<'EOF'
#!/bin/bash

BACKUP_DIR="/opt/claude-code/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="claude-code-backup-$DATE.tar.gz"

# Criar backup
tar -czf "$BACKUP_DIR/$BACKUP_FILE" \
    --exclude="$BACKUP_DIR" \
    --exclude="*.log" \
    --exclude="uploads/pending/*" \
    --exclude="uploads/processing/*" \
    /opt/claude-code/

# Manter apenas os últimos 7 backups
find "$BACKUP_DIR" -name "claude-code-backup-*.tar.gz" -type f -mtime +7 -delete

echo "Backup criado: $BACKUP_FILE"
EOF
    
    chmod +x /opt/claude-code/scripts/backup.sh
    
    # Configurar cron para backup diário
    (crontab -l 2>/dev/null; echo "0 2 * * * /opt/claude-code/scripts/backup.sh") | crontab -
    
    success "Backup automático configurado"
}

# Verificar configuração
verify_setup() {
    log "Verificando configuração..."
    
    local checks=(
        "systemctl is-active docker"
        "systemctl is-active nginx"
        "docker --version"
        "docker-compose --version"
        "nginx -t"
        "test -d /opt/claude-code"
        "test -f /etc/systemd/system/claude-code.service"
    )
    
    local failed=0
    
    for check in "${checks[@]}"; do
        if ! eval "$check" &>/dev/null; then
            error "Falha na verificação: $check"
            failed=1
        fi
    done
    
    if [[ $failed -eq 0 ]]; then
        success "Todas as verificações passaram"
        return 0
    else
        error "Algumas verificações falharam"
        return 1
    fi
}

# Função principal
main() {
    log "Iniciando setup da infraestrutura Claude Code..."
    
    # Verificar se é root
    check_root
    
    # Executar configurações
    check_dependencies
    setup_docker
    setup_nginx
    setup_firewall
    setup_directories
    setup_systemd
    setup_monitoring
    setup_ssl
    setup_backup
    
    # Verificar configuração
    if verify_setup; then
        success "Setup da infraestrutura concluído com sucesso!"
        log "Próximos passos:"
        log "1. Copie seus arquivos para /opt/claude-code"
        log "2. Configure o arquivo .env"
        log "3. Execute: systemctl start claude-code"
        log "4. Configure SSL com: certbot --nginx -d seu-dominio.com"
    else
        error "Setup falhou em algumas verificações"
        exit 1
    fi
}

# Executar apenas se chamado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi