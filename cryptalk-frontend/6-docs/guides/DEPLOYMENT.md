# CrysTalk Production Deployment Guide

## Overview

Este guia fornece instruções completas para fazer o deploy da aplicação CrysTalk em ambiente de produção usando Docker Compose com integração Cloudflare Tunnel.

## Arquitetura da Solução

### Serviços Principais
- **Frontend**: Aplicação React/TypeScript servida por Nginx
- **API**: Backend Node.js com Express
- **Claude Orchestrator**: Serviço de orquestração de análise de documentos
- **PostgreSQL**: Banco de dados principal
- **Redis**: Cache e sessões
- **Nginx**: Proxy reverso e balanceador de carga
- **HAProxy**: Balanceamento de carga avançado

### Monitoramento e Logging
- **Prometheus**: Coleta de métricas
- **Grafana**: Visualização de métricas
- **Elasticsearch**: Armazenamento de logs
- **Logstash**: Processamento de logs
- **Kibana**: Visualização de logs

### Segurança e Backup
- **Cloudflare Tunnel**: Conexão segura sem exposição de portas
- **SSL/TLS**: Certificados SSL para todas as comunicações
- **Backup automático**: Backup diário dos dados
- **Watchtower**: Atualizações automáticas dos containers

## Pré-requisitos

### Sistema Operacional
- Ubuntu 20.04 LTS ou superior
- CentOS 8 ou superior
- Debian 11 ou superior

### Hardware Mínimo
- **CPU**: 4 cores
- **RAM**: 8GB
- **Disco**: 100GB SSD
- **Rede**: 1Gbps

### Hardware Recomendado
- **CPU**: 8+ cores
- **RAM**: 16GB+
- **Disco**: 500GB+ SSD
- **Rede**: 10Gbps

### Software
- Docker 20.10+
- Docker Compose 2.0+
- Git
- OpenSSL
- Cloudflare account com tunnel configurado

## Instalação

### 1. Preparação do Servidor

```bash
# Atualizar o sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependências
sudo apt install -y curl wget git unzip htop

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Reiniciar para aplicar mudanças de grupo
sudo reboot
```

### 2. Configuração do Projeto

```bash
# Clonar o repositório
git clone https://github.com/seu-usuario/cryptalk-frontend.git
cd cryptalk-frontend

# Copiar arquivo de ambiente
cp .env.production .env

# Editar variáveis de ambiente
nano .env
```

### 3. Configuração das Variáveis de Ambiente

Edite o arquivo `.env` com suas configurações:

```env
# Database
DB_PASSWORD=sua_senha_postgres_segura
REDIS_PASSWORD=sua_senha_redis_segura

# API Keys
CLAUDE_API_KEY=sua_chave_claude
ANTHROPIC_API_KEY=sua_chave_anthropic

# Cloudflare
CLOUDFLARE_TUNNEL_TOKEN=seu_token_tunnel

# Monitoramento
GRAFANA_PASSWORD=sua_senha_grafana
ELASTIC_PASSWORD=sua_senha_elastic

# Email (para notificações)
SMTP_USER=seu_email@gmail.com
SMTP_PASSWORD=sua_senha_email
ADMIN_EMAIL=admin@seudominio.com

# AWS (para backups)
AWS_ACCESS_KEY_ID=sua_chave_aws
AWS_SECRET_ACCESS_KEY=sua_chave_secreta_aws
S3_BUCKET=seu-bucket-backups
```

### 4. Configuração do Cloudflare Tunnel

```bash
# Instalar cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Fazer login no Cloudflare
cloudflared tunnel login

# Criar tunnel
cloudflared tunnel create cryptalk-production

# Configurar DNS
cloudflared tunnel route dns cryptalk-production cryptalk.com
cloudflared tunnel route dns cryptalk-production api.cryptalk.com
cloudflared tunnel route dns cryptalk-production ws.cryptalk.com
cloudflared tunnel route dns cryptalk-production grafana.cryptalk.com
cloudflared tunnel route dns cryptalk-production logs.cryptalk.com
cloudflared tunnel route dns cryptalk-production metrics.cryptalk.com

# Copiar credenciais
sudo mkdir -p /etc/cloudflared
sudo cp ~/.cloudflared/credentials.json /etc/cloudflared/
```

### 5. Configuração SSL

```bash
# Gerar certificados SSL (temporário)
sudo mkdir -p nginx/ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/cryptalk.key \
    -out nginx/ssl/cryptalk.crt \
    -subj "/C=BR/ST=SP/L=São Paulo/O=CrysTalk/CN=cryptalk.com"

# Para certificados reais, use Let's Encrypt ou seu provedor SSL
```

### 6. Deploy da Aplicação

```bash
# Tornar script executável
chmod +x scripts/deploy-production.sh

# Executar deploy
./scripts/deploy-production.sh
```

## Verificação do Deploy

### 1. Verificar Status dos Serviços

```bash
# Ver status dos containers
docker-compose -f docker-compose.production.yml ps

# Ver logs
docker-compose -f docker-compose.production.yml logs -f

# Verificar saúde dos serviços
./scripts/monitor-system.sh check
```

### 2. Testar Endpoints

```bash
# Testar frontend
curl -k https://cryptalk.com/health

# Testar API
curl -k https://api.cryptalk.com/health

# Testar WebSocket
curl -k -H "Upgrade: websocket" https://ws.cryptalk.com/

# Testar monitoramento
curl -k https://grafana.cryptalk.com/api/health
```

## Monitoramento

### Acessar Interfaces

- **Frontend**: https://cryptalk.com
- **API**: https://api.cryptalk.com
- **Grafana**: https://grafana.cryptalk.com
- **Kibana**: https://logs.cryptalk.com
- **Prometheus**: https://metrics.cryptalk.com
- **HAProxy Stats**: https://stats.cryptalk.com

### Configurar Alertas

```bash
# Configurar monitoramento automático
./scripts/monitor-system.sh monitor &

# Adicionar ao crontab para iniciar na inicialização
echo "@reboot $PWD/scripts/monitor-system.sh monitor" | crontab -
```

## Manutenção

### Backup Manual

```bash
# Fazer backup
docker-compose -f docker-compose.production.yml exec backup /backup.sh

# Restaurar backup
./scripts/restore-backup.sh caminho/para/backup
```

### Atualizações

```bash
# Atualizar imagens
docker-compose -f docker-compose.production.yml pull

# Reconstruir e reiniciar
docker-compose -f docker-compose.production.yml up -d --build
```

### Logs

```bash
# Ver logs específicos
docker-compose -f docker-compose.production.yml logs -f [serviço]

# Limpar logs antigos
./scripts/monitor-system.sh cleanup
```

## Troubleshooting

### Problemas Comuns

1. **Containers não iniciam**
   ```bash
   # Verificar recursos do sistema
   docker system df
   docker system prune -a
   ```

2. **Problemas de rede**
   ```bash
   # Verificar redes Docker
   docker network ls
   docker network inspect nome_da_rede
   ```

3. **Problemas de SSL**
   ```bash
   # Verificar certificados
   openssl x509 -in nginx/ssl/cryptalk.crt -text -noout
   ```

4. **Problemas de performance**
   ```bash
   # Verificar recursos
   docker stats
   htop
   ```

### Logs Importantes

- **Sistema**: `./logs/monitor.log`
- **Nginx**: `./nginx/logs/`
- **API**: `./logs/api/`
- **Claude**: `./logs/claude/`
- **Banco**: `./postgres/logs/`

## Segurança

### Configurações Recomendadas

1. **Firewall**
   ```bash
   # Configurar UFW
   sudo ufw enable
   sudo ufw allow ssh
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw deny 5432/tcp  # PostgreSQL
   sudo ufw deny 6379/tcp  # Redis
   ```

2. **Fail2Ban**
   ```bash
   # Instalar Fail2Ban
   sudo apt install fail2ban
   sudo systemctl enable fail2ban
   ```

3. **Atualizações automáticas**
   ```bash
   # Configurar unattended-upgrades
   sudo apt install unattended-upgrades
   sudo dpkg-reconfigure -plow unattended-upgrades
   ```

### Backup e Recuperação

#### Estratégia de Backup

1. **Backup diário automático** (2:00 AM)
2. **Retenção de 30 dias**
3. **Backup para S3** (opcional)
4. **Teste de restauração mensal**

#### Recuperação de Desastres

1. **Backup dos dados**: PostgreSQL, Redis, uploads
2. **Backup das configurações**: nginx, haproxy, env files
3. **Backup dos certificados SSL**
4. **Documentação do processo de restauração**

## Performance

### Otimizações Aplicadas

1. **Nginx**: Compression, caching, rate limiting
2. **HAProxy**: Load balancing, connection pooling
3. **PostgreSQL**: Connection pooling, query optimization
4. **Redis**: Memory optimization, persistence
5. **Docker**: Resource limits, health checks

### Monitoramento de Performance

- **CPU**: Limite de 80% de uso médio
- **Memória**: Limite de 85% de uso
- **Disco**: Limite de 80% de uso
- **Rede**: Monitoramento de latência e throughput

## Escalabilidade

### Scaling Horizontal

1. **API**: Adicionar mais instâncias na configuração do HAProxy
2. **Frontend**: Adicionar mais instâncias do Nginx
3. **Database**: Configurar read replicas
4. **Cache**: Configurar cluster Redis

### Configuração Multi-Node

Para ambiente de alta disponibilidade, considere:

1. **Docker Swarm** ou **Kubernetes**
2. **Load balancer externo**
3. **Database clustering**
4. **Shared storage** para uploads

## Suporte

### Contatos

- **Desenvolvedor**: seu-email@dominio.com
- **DevOps**: devops@dominio.com
- **Emergência**: +55 11 99999-9999

### Documentação Adicional

- [Arquitetura do Sistema](ARCHITECTURE.md)
- [Guia de Desenvolvimento](DEVELOPMENT.md)
- [API Documentation](API.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)

## Changelog

### v1.0.0 (2024-01-01)
- Deploy inicial em produção
- Configuração completa do Docker Compose
- Integração com Cloudflare Tunnel
- Monitoramento com Prometheus/Grafana
- Logging com ELK Stack
- Backup automático
- SSL/TLS configurado

---

**Nota**: Este guia está em constante atualização. Sempre consulte a versão mais recente no repositório.