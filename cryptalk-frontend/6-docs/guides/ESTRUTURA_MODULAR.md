# 🎯 CrypTalk - Estrutura Modular Didática

## 📋 Visão Geral

O projeto foi reorganizado em uma estrutura modular didática para facilitar o entendimento e manutenção por programadores iniciantes.

## 🗂️ Estrutura de Diretórios

```
cryptalk/
├── 1-frontend/    # 🎨 Interface do usuário
├── 2-backend/     # ⚙️ Lógica do servidor  
├── 3-config/      # ⚙️ Configurações
├── 4-scripts/     # 🔧 Automação
├── 5-storage/     # 💾 Dados
└── 6-docs/        # 📚 Documentação
```

### 📂 1-frontend/ - Interface do Usuário
**O que faz:** Tudo relacionado à interface que o usuário vê e interage

```
1-frontend/
├── interface/src/         # Código React principal
├── assets/               # Imagens, ícones, arquivos estáticos
├── package.json          # Dependências do frontend
└── vite.config.ts        # Configuração do servidor de desenvolvimento
```

**Scripts principais:**
- `npm run dev` - Inicia o servidor de desenvolvimento (porta 5173)
- `npm run build` - Gera versão de produção
- `npm run preview` - Visualiza a versão de produção

### 📂 2-backend/ - Lógica do Servidor
**O que faz:** Processa uploads, se comunica com Claude AI, gerencia containers Docker

```
2-backend/
├── api-server/
│   └── claude-service/   # Serviço principal de orquestração
├── containers/           # Templates para containers dinâmicos
└── services/            # Serviços auxiliares (monitoramento, etc.)
```

**Arquivo principal:** `2-backend/api-server/claude-service/orchestrator.js`
- Porta 3002: API REST
- Porta 8080: WebSocket para comunicação real-time

### 📂 3-config/ - Configurações
**O que faz:** Configurações de Docker, banco de dados, monitoramento

```
3-config/
├── docker/              # Dockerfiles e docker-compose
├── database/            # Configurações PostgreSQL/Redis
├── monitoring/          # Grafana, Prometheus configs
└── security/            # Chaves de segurança, WireGuard
```

### 📂 4-scripts/ - Automação
**O que faz:** Scripts para facilitar deploy, backup, segurança

```
4-scripts/
├── automation/          # Setup, tunnel, backup
├── deployment/          # Deploy para produção
├── maintenance/         # Limpeza, otimização
└── security/           # Segurança e lockdown
```

### 📂 5-storage/ - Dados
**O que faz:** Armazena uploads, logs, builds, backups

```
5-storage/
├── uploads/             # Arquivos enviados pelos usuários
├── builds/              # Versões compiladas do frontend
├── logs/                # Logs do sistema
├── backups/             # Backups automáticos
└── _archived/           # Arquivos antigos/testes removidos
```

### 📂 6-docs/ - Documentação
**O que faz:** Guias, documentação da API, arquitetura

```
6-docs/
├── guides/              # Guias como este
├── api-docs/            # Documentação da API
└── architecture/        # Diagramas e explicações técnicas
```

## 🚀 Como Executar

### Desenvolvimento Local
```bash
# 1. Instalar dependências
npm run install-all

# 2. Iniciar backend e frontend simultaneamente  
npm start

# OU iniciar separadamente:
npm run backend  # Porta 3002
npm run dev      # Porta 5173
```

### URLs de Acesso
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3002
- **WebSocket:** ws://localhost:8080

## 🛠️ Scripts Principais

No diretório raiz (`package.json`):

| Script | Função |
|--------|--------|
| `npm start` | Inicia backend + frontend |
| `npm run dev` | Só frontend |
| `npm run backend` | Só backend |
| `npm run install-all` | Instala todas as dependências |
| `npm run docker:up` | Sobe infraestrutura Docker |
| `npm run setup` | Configuração inicial completa |

## 🎯 Funcionalidades

### Upload e Análise
1. Usuário envia arquivo via frontend (porta 5173)
2. Backend (porta 3002) recebe e processa
3. Sistema cria container Docker específico
4. Claude AI analisa o documento
5. Resultado retorna via WebSocket (porta 8080)

### Infraestrutura
- **PostgreSQL + Redis:** Para persistência futura
- **Prometheus + Grafana:** Monitoramento de métricas
- **WireGuard VPN:** Acesso seguro de admin
- **Docker:** Containers isolados por usuário

## 🔒 Segurança

- Senhas hardcoded foram removidas ✅
- Input sanitization implementado ✅
- Rate limiting configurado ✅
- Containers isolados por usuário ✅

## 📚 Próximos Passos

1. Implementar PostgreSQL + Redis para histórico
2. Ativar Prometheus + Grafana para monitoramento
3. Configurar WireGuard para acesso remoto
4. Deploy em produção com Docker Compose

---

**💡 Dica para Iniciantes:**
- Comece sempre pelo `1-frontend/` para entender a interface
- O arquivo principal do backend é `2-backend/api-server/claude-service/orchestrator.js`
- Use `npm start` para tudo funcionar automaticamente
- Verifique os logs em `5-storage/logs/` se algo der errado