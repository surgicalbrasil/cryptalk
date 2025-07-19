# Sistema de Orquestração de Containers Isolados

## Visão Geral

O sistema de orquestração implementa um ambiente isolado e seguro para execução de código e análise de documentos usando Claude Code. Cada cliente recebe seu próprio container Docker com recursos limitados e isolamento completo.

## Arquitetura

### Componentes Principais

1. **Orchestrator.js** - Gerenciador principal de containers
2. **ClientContainerManager** - Classe para gerenciar containers por cliente
3. **WebSocket Server** - Comunicação em tempo real
4. **REST API** - Interface para gerenciamento de containers
5. **Sistema de Monitoramento** - Métricas e alertas em tempo real

### Fluxo de Trabalho

1. Cliente solicita criação de sessão
2. Sistema cria container isolado com recursos limitados
3. Cliente pode fazer upload de arquivos
4. Sistema executa análises no container isolado
5. Resultados são enviados via WebSocket
6. Container é automaticamente limpo após timeout

## Funcionalidades Implementadas

### ✅ 1. Orchestrator.js Funcional

- **Gerenciamento de containers por cliente**
- **Configuração flexível de recursos**
- **Sistema de timeout automático**
- **Limpeza automática de containers**
- **Monitoramento em tempo real**

### ✅ 2. Criação Dinâmica de Containers

- **Containers únicos por cliente**
- **Configuração baseada em tipo de recurso (light/medium/heavy)**
- **Volumes isolados para cada cliente**
- **Rede isolada para segurança**

### ✅ 3. Limites de Recursos

- **CPU**: 25%, 50%, 100% baseado no tipo
- **Memória**: 256MB, 512MB, 1GB baseado no tipo
- **Processo**: Limite de processos por container
- **Rede**: Monitoramento de tráfego de rede
- **Disco**: Tmpfs para diretórios temporários

### ✅ 4. Sistema de Timeout e Limpeza

- **Timeout automático**: 30 minutos por padrão
- **Limpeza forçada**: Para containers que não respondem
- **Limpeza de volumes**: Remoção automática de volumes órfãos
- **Limpeza agendada**: Executa a cada 10 minutos

### ✅ 5. API REST Completa

- **POST /api/client/create** - Criar sessão de cliente
- **GET /api/client/:id/status** - Status do container
- **GET /api/client/:id/stats** - Estatísticas de recursos
- **POST /api/client/:id/execute** - Executar comandos
- **POST /api/client/:id/upload** - Upload de arquivos
- **POST /api/client/:id/analyze** - Análise de documentos
- **DELETE /api/client/:id** - Remover container
- **GET /api/metrics** - Métricas do sistema
- **GET /api/containers** - Listar containers ativos

## Recursos Avançados

### Monitoramento e Alertas

- **Monitoramento em tempo real** de CPU, memória, rede
- **Alertas automáticos** quando limites são excedidos
- **Histórico de métricas** para análise
- **Cooldown de alertas** para evitar spam

### Segurança

- **Isolamento completo** entre containers
- **Capabilities limitadas** do Docker
- **Usuário não-root** dentro do container
- **Tmpfs para diretórios temporários**
- **Limites de processos e arquivos**

### Rate Limiting

- **Limite de criação** de containers por IP
- **Limite geral** de requests por IP
- **Proteção contra abuso**

### WebSocket

- **Comunicação em tempo real**
- **Notificações de progresso**
- **Alertas de recursos**
- **Status de análises**

## Configuração

### Variáveis de Ambiente

```bash
# Servidor
PORT=3000
WS_PORT=8080
NODE_ENV=production

# Docker
MAX_CONTAINERS=10
CONTAINER_MAX_AGE=1800000  # 30 minutos

# Claude API
CLAUDE_API_KEY=your_api_key_here
CLAUDE_MODEL=claude-3-sonnet-20240229

# Monitoramento
LOG_LEVEL=info
BACKUP_ENABLED=true
```

### Configuração de Recursos

```javascript
// Tipos de recursos disponíveis
const RESOURCE_CONFIGS = {
  light: {
    memory: 256 * 1024 * 1024, // 256MB
    cpuQuota: 25000 // 25% CPU
  },
  medium: {
    memory: 512 * 1024 * 1024, // 512MB
    cpuQuota: 50000 // 50% CPU
  },
  heavy: {
    memory: 1024 * 1024 * 1024, // 1GB
    cpuQuota: 100000 // 100% CPU
  }
}
```

## Uso

### Inicialização

```bash
# Configurar ambiente
./manage-orchestration.sh setup

# Iniciar sistema
./manage-orchestration.sh start

# Verificar status
./manage-orchestration.sh status
```

### Testes

```bash
# Executar testes completos
./manage-orchestration.sh test

# Monitorar sistema
./manage-orchestration.sh monitor
```

### Gerenciamento

```bash
# Parar sistema
./manage-orchestration.sh stop

# Reiniciar sistema
./manage-orchestration.sh restart

# Limpar containers órfãos
./manage-orchestration.sh cleanup

# Ver logs
./manage-orchestration.sh logs
```

## API Examples

### Criar Sessão de Cliente

```javascript
const response = await fetch('/api/client/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    resourceType: 'medium',
    priority: 'normal'
  })
});

const { clientId } = await response.json();
```

### Upload de Arquivo

```javascript
const response = await fetch(`/api/client/${clientId}/upload`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fileName: 'document.pdf',
    fileContent: base64Content,
    fileType: 'application/pdf'
  })
});
```

### Análise de Documento

```javascript
const response = await fetch(`/api/client/${clientId}/analyze`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fileName: 'document.pdf',
    documentType: 'patent',
    analysisType: 'deep'
  })
});
```

### WebSocket para Tempo Real

```javascript
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'register',
    clientId: clientId
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Mensagem recebida:', message);
};
```

## Monitoramento

### Métricas Disponíveis

- **Containers ativos** e histórico
- **Uso de recursos** por container
- **Tráfego de rede** por container
- **Alertas de recursos** em tempo real
- **Uptime do sistema**

### Dashboard de Monitoramento

```bash
# Iniciar dashboard em tempo real
./manage-orchestration.sh monitor
```

### Alertas Automáticos

- **CPU alta** (>80%)
- **Memória alta** (>85%)
- **Tráfego de rede alto** (>100MB/s)
- **Container não responsivo**

## Segurança

### Isolamento

- **Containers isolados** com recursos limitados
- **Redes separadas** para cada cliente
- **Volumes privados** por cliente
- **Usuário não-root** dentro do container

### Limitações

- **Timeout automático** de containers
- **Limite de processos** por container
- **Limite de arquivos** abertos
- **Limite de memória** e CPU

### Auditoria

- **Logs detalhados** de todas as operações
- **Rastreamento de ações** por cliente
- **Métricas de segurança**

## Troubleshooting

### Problemas Comuns

1. **Container não inicia**
   - Verificar se Docker está rodando
   - Verificar recursos disponíveis
   - Verificar logs do sistema

2. **Timeout de containers**
   - Ajustar `maxContainerAge` se necessário
   - Verificar se análises estão completando

3. **Recursos insuficientes**
   - Reduzir `maxConcurrentContainers`
   - Usar tipo de recurso mais leve

### Logs

```bash
# Ver logs do orquestrador
./manage-orchestration.sh logs

# Logs de container específico
docker logs claude-user-<clientId>
```

## Desenvolvimento

### Estrutura de Arquivos

```
claude-service/
├── orchestrator.js     # Servidor principal
├── config.js          # Configurações
├── monitor.js          # Monitor em tempo real
├── package.json        # Dependências
└── Dockerfile.user-env # Imagem do container

test-orchestration-system.js  # Testes
manage-orchestration.sh       # Script de gerenciamento
```

### Contribuindo

1. Faça fork do projeto
2. Crie uma branch para sua feature
3. Teste suas mudanças
4. Envie um pull request

## Licença

MIT License - veja o arquivo LICENSE para detalhes.