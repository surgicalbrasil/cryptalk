# CrysTalk Docker Implementation Guide

Este guia descreve a implementação completa do sistema Docker para o CrysTalk, incluindo containers isolados por cliente.

## Arquitetura Docker

### Componentes Principais

1. **claude-service** - Orquestrador principal que gerencia containers por cliente
2. **claude-user-env** - Ambiente isolado para execução de análises
3. **monitoring** - Sistema de monitoramento de saúde
4. **nginx** - Reverse proxy e load balancer
5. **redis** - Cache e sessões
6. **postgres** - Banco de dados para metadados

### Isolamento por Cliente

Cada cliente recebe um container isolado com:
- Recursos limitados (512MB RAM, 50% CPU)
- Volumes próprios para dados
- Timeout automático (30 minutos)
- Limpeza automática

## Estrutura de Arquivos

```
cryptalk-frontend/
├── docker-compose.yml          # Configuração principal
├── Dockerfile.user-env         # Imagem do ambiente de usuário
├── claude-service/
│   ├── Dockerfile             # Imagem do orquestrador
│   ├── orchestrator.js        # Gerenciador de containers
│   ├── claude-analyzer.js     # Analisador dentro do container
│   ├── package.json          # Dependências
│   └── health-check.js       # Verificação de saúde
├── monitoring/
│   ├── Dockerfile            # Imagem de monitoramento
│   ├── health-monitor.js     # Monitor de saúde
│   └── package.json         # Dependências
├── nginx/
│   └── nginx.conf           # Configuração do proxy
└── scripts/
    ├── build-docker.sh      # Script de build
    ├── docker-deploy.sh     # Script de deploy
    └── docker-cleanup.sh    # Script de limpeza
```

## Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` com as seguintes variáveis:

```env
# Claude API
CLAUDE_API_KEY=your_claude_api_key_here

# URLs da aplicação
VITE_API_URL=http://localhost:3000
VITE_WEBSOCKET_URL=ws://localhost:8080

# Configurações do banco
REDIS_PASSWORD=secure_redis_password
DB_NAME=claude_code
DB_USER=claude_user
DB_PASSWORD=secure_db_password

# Configurações de monitoramento
GRAFANA_PASSWORD=admin_password

# Configurações do Docker
DOCKER_SOCKET=/var/run/docker.sock
CONTAINER_TIMEOUT=1800000
CLEANUP_INTERVAL=600000

# Configurações de segurança
NODE_ENV=production
PORT=3000
```

## Comandos de Uso

### Build das Imagens

```bash
# Build completo
./scripts/build-docker.sh

# Build apenas do serviço principal
./scripts/build-docker.sh --service-only

# Build apenas do ambiente de usuário
./scripts/build-docker.sh --user-env-only

# Build forçado (sem cache)
./scripts/build-docker.sh --force
```

### Deploy do Sistema

```bash
# Deploy completo
./scripts/docker-deploy.sh

# Apenas reiniciar serviços
./scripts/docker-deploy.sh --restart

# Verificar status
./scripts/docker-deploy.sh --status

# Parar todos os serviços
./scripts/docker-deploy.sh --stop
```

### Limpeza

```bash
# Limpeza automática
./scripts/docker-cleanup.sh --auto

# Limpeza profunda
./scripts/docker-cleanup.sh --deep

# Limpeza de emergência (remove tudo)
./scripts/docker-cleanup.sh --emergency
```

## Monitoramento

### Health Checks

- **Aplicação Principal**: `http://localhost:3000/health`
- **Monitoramento**: `http://localhost:9090/health`
- **Nginx**: `http://localhost:80/nginx-health`

### Métricas

- **Status Geral**: `http://localhost:9090/status`
- **Métricas**: `http://localhost:9090/metrics`
- **Containers**: `http://localhost:3000/api/containers`

### Logs

```bash
# Logs de todos os serviços
docker-compose logs -f

# Logs do serviço específico
docker-compose logs -f claude-service

# Logs dos containers de cliente
docker logs claude-user-{client-id}
```

## Fluxo de Funcionamento

### 1. Criação de Sessão

```bash
POST /api/client/create
```

- Cria um novo clientId
- Inicia container isolado
- Configura volumes e recursos
- Retorna informações da sessão

### 2. Upload de Arquivo

```bash
POST /api/upload
```

- Recebe arquivo do cliente
- Armazena no volume do container
- Valida tipo e tamanho
- Retorna confirmação

### 3. Execução de Análise

```bash
POST /api/analyze
```

- Executa análise no container isolado
- Envia progresso via WebSocket
- Retorna resultado completo
- Limpa recursos temporários

### 4. Limpeza Automática

- Containers são removidos após 30 minutos
- Limpeza automática a cada 10 minutos
- Volumes são removidos junto com containers

## Segurança

### Isolamento

- Cada cliente tem seu próprio container
- Recursos limitados por container
- Sem acesso ao sistema host
- Usuário não-root dentro do container

### Rede

- Rede isolada `claude-network`
- Comunicação apenas entre serviços autorizados
- Rate limiting no nginx
- Headers de segurança configurados

### Dados

- Volumes isolados por cliente
- Limpeza automática de dados
- Sem persistência entre sessões
- Logs rotacionados

## Troubleshooting

### Problemas Comuns

1. **Container não inicia**
   - Verificar logs: `docker-compose logs claude-service`
   - Verificar variáveis de ambiente
   - Verificar socket Docker

2. **Análise falha**
   - Verificar API key do Claude
   - Verificar logs do container: `docker logs claude-user-{id}`
   - Verificar recursos disponíveis

3. **Performance lenta**
   - Verificar uso de recursos: `docker stats`
   - Aumentar limites de CPU/RAM
   - Verificar limpeza automática

### Comandos de Debug

```bash
# Verificar containers ativos
docker ps -a

# Verificar uso de recursos
docker stats

# Verificar logs específicos
docker logs claude-service

# Entrar no container
docker exec -it claude-service /bin/sh

# Verificar rede
docker network ls
docker network inspect claude-network
```

## Manutenção

### Backup

```bash
# Backup de volumes
docker run --rm -v claude-data:/data -v $(pwd):/backup alpine tar czf /backup/claude-data.tar.gz /data

# Backup de configurações
tar czf config-backup.tar.gz docker-compose.yml .env nginx/ monitoring/
```

### Atualizações

```bash
# Atualizar imagens
docker-compose pull

# Reconstruir imagens
./scripts/build-docker.sh --force

# Deploy com nova versão
./scripts/docker-deploy.sh --restart
```

### Monitoramento Contínuo

- Configurar alertas para containers down
- Monitorar uso de recursos
- Verificar logs de erro regularmente
- Manter limpeza automática ativa

## Integração com Tunnel

O sistema mantém compatibilidade com o tunnel Cloudflare:

```bash
# Iniciar tunnel junto com Docker
./scripts/docker-deploy.sh

# O tunnel será configurado automaticamente se detectado
```

## Performance

### Otimizações

- Containers com recursos limitados
- Limpeza automática de containers antigos
- Cache de imagens Docker
- Nginx com compressão habilitada

### Monitoramento

- Métricas de CPU/RAM por container
- Tempo de resposta das análises
- Taxa de erro das APIs
- Uso de rede e I/O

## Próximos Passos

1. **Implementar autenticação JWT**
2. **Adicionar persistência de resultados**
3. **Configurar cluster Kubernetes**
4. **Implementar CI/CD pipeline**
5. **Adicionar mais métricas e alertas**