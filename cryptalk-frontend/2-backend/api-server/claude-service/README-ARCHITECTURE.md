# 🏗️ Arquitetura Refatorada - CrypTalk

## 📦 Estrutura de Serviços

```
claude-service/
├── api-gateway.js              ←── 🎯 Orchestrador principal (simplificado)
├── claude-terminal-service.js  ←── 🤖 Comunicação com Claude Code terminal
├── docker-manager.js           ←── 🐳 Gerenciamento de containers
├── file-manager.js             ←── 📁 Upload e validação de arquivos
├── terminal-listener.js        ←── 🎧 Escuta comandos no WSL
├── orchestrator.js            ←── 📜 Legacy (1531 linhas → substituído)
└── start-services.sh          ←── 🚀 Script de inicialização
```

## 🔄 Fluxo de Comunicação

### Upload + Análise
```
Frontend → api-gateway.js → file-manager.js → docker-manager.js → claude-terminal-service.js → terminal-listener.js → Claude Code WSL
```

### Chat Conversacional
```
Frontend → api-gateway.js → claude-terminal-service.js → terminal-listener.js → Claude Code WSL → Resposta → Frontend
```

## 📋 Responsabilidades Separadas

### 🎯 API Gateway
- **Responsabilidade**: Roteamento e coordenação
- **Linhas**: ~300 (vs. 1531 do orchestrator original)
- **Funções**:
  - Rate limiting
  - CORS
  - WebSocket management
  - Coordenação entre serviços

### 🤖 Claude Terminal Service
- **Responsabilidade**: Comunicação com Claude Code
- **Funcões**:
  - Gerenciar conversas contextuais
  - Enviar comandos para terminal
  - Manter sessões ativas
  - Timeout automático

### 🐳 Docker Manager
- **Responsabilidade**: Containers isolados
- **Funções**:
  - Criar/destruir containers
  - Copiar arquivos para containers
  - Monitorar recursos
  - Limpeza automática

### 📁 File Manager
- **Responsabilidade**: Upload e validação
- **Funções**:
  - Validar tipos de arquivo
  - Processar uploads
  - Verificar integridade
  - Estatísticas de uso

### 🎧 Terminal Listener
- **Responsabilidade**: Bridge WSL
- **Funções**:
  - Escutar comandos TCP (porta 8888)
  - Executar Claude Code
  - Retornar respostas
  - Gerenciar processos

## 🚀 Como Usar

### Inicialização
```bash
# Iniciar todos os serviços
./start-services.sh

# Ou individual
node terminal-listener.js &    # WSL
node api-gateway.js           # API principal
```

### Endpoints Principais
```
POST /api/upload              # Upload de arquivo
POST /api/analyze             # Análise inicial
POST /api/chat                # Chat conversacional
GET  /api/health              # Status dos serviços
```

### WebSocket
```
ws://localhost:3002?clientId=abc123
```

## ✅ Benefícios da Refatoração

### Antes (orchestrator.js)
```
❌ 1531 linhas em um arquivo
❌ Múltiplas responsabilidades
❌ Difícil manutenção
❌ Debugging complexo
❌ Testes unitários impossíveis
```

### Depois (Arquitetura modular)
```
✅ ~300 linhas por serviço
✅ Responsabilidade única
✅ Manutenção simples
✅ Debugging isolado
✅ Testes unitários possíveis
✅ Escalabilidade individual
```

## 🔧 Configuração

### Variáveis de Ambiente
```bash
# Portas
PORT=3002                    # API Gateway
TERMINAL_PORT=8888          # Terminal Listener

# Docker
MAX_CONTAINERS=10
CONTAINER_MAX_AGE=1800000   # 30 minutos

# Upload
MAX_FILE_SIZE=52428800      # 50MB
```

## 📊 Monitoramento

### Status dos Serviços
```bash
curl http://localhost:3002/api/health
```

### Estatísticas
```bash
curl http://localhost:3002/api/info/stats
```

## 🧪 Testes

### Teste de Conexão Claude Terminal
```bash
node test-claude-terminal.js
```

### Teste de Upload
```bash
curl -X POST -F "file=@test.pdf" -F "documentType=pitch-deck" -F "clientId=test123" http://localhost:3002/api/upload
```

## 🎯 Próximos Passos

1. **Testar integração completa**
2. **Configurar Claude Code no WSL**
3. **Implementar logging estruturado**
4. **Adicionar métricas Prometheus**
5. **Configurar health checks**

## 🔒 Segurança

- ✅ Rate limiting por endpoint
- ✅ Validação de arquivos
- ✅ Containers isolados
- ✅ Timeout automático
- ✅ CORS configurado
- ✅ Auto-cleanup de recursos