# Sistema de Análise de Documentos CrysTalk

## Visão Geral

O sistema de análise de documentos CrysTalk implementa uma arquitetura simplificada e funcional para análise automatizada de documentos usando Claude Code. O sistema segue um fluxo direto e eficiente:

```
Cliente → Upload → Seleção de Tipo → Container Isolado → Análise Claude → Chat em Tempo Real → Download → Limpeza
```

## Arquitetura Implementada

### 1. Estrutura de Pastas

```
server/
├── templates/              # MDs estruturais para análise
│   ├── pitch-deck.md      # Diretrizes para pitch decks
│   ├── patente.md         # Diretrizes para patentes
│   └── projecao.md        # Diretrizes para projeções
├── client-containers/      # Containers isolados por cliente
│   └── [clientId]/        # Pasta única por cliente
└── logs/                   # Logs do sistema
```

### 2. Componentes Principais

#### Backend (Node.js + Express)
- **Servidor principal**: `server/server.js`
- **Executor Claude**: `server/claude-executor.js`
- **WebSocket**: Comunicação em tempo real
- **Multer**: Upload de arquivos
- **Sistema de containers**: Isolamento por cliente

#### Frontend (React + Chakra UI)
- **Componente principal**: `src/components/DocumentAnalysis.tsx`
- **Integração no dashboard**: `src/pages/ModularDashboard.tsx`
- **Interface de chat**: Comunicação em tempo real
- **Upload modal**: Configuração de tipos de documento

### 3. Fluxo de Funcionamento

#### 3.1 Inicialização
1. Cliente acessa o sistema
2. Sistema cria ID único para o cliente
3. WebSocket é estabelecido
4. Container isolado é criado

#### 3.2 Upload e Análise
1. Cliente faz upload do arquivo
2. Cliente seleciona tipo de documento
3. Arquivo é salvo no container do cliente
4. Sistema executa Claude Code via terminal
5. Análise é enviada em tempo real via WebSocket
6. Resultado é exibido no chat

#### 3.3 Interação e Download
1. Cliente interage com o resultado
2. Cliente pode baixar arquivos
3. Sistema mantém histórico da sessão

#### 3.4 Limpeza
1. Cliente pode limpar sessão manualmente
2. Sistema limpa containers antigos automaticamente
3. Ao sair, todos os dados são removidos

## Tipos de Documento Suportados

### 1. Pitch Deck
- **Arquivo**: `server/templates/pitch-deck.md`
- **Análise**: Resumo executivo, mercado, modelo de negócio, equipe, tração, etc.
- **Formato**: PDF, PPT, PPTX

### 2. Patente
- **Arquivo**: `server/templates/patente.md`
- **Análise**: Patenteabilidade, prior art, reivindicações, valor comercial, etc.
- **Formato**: PDF, DOC, DOCX

### 3. Projeção Financeira
- **Arquivo**: `server/templates/projecao.md`
- **Análise**: Premissas, receitas, custos, fluxo de caixa, viabilidade, etc.
- **Formato**: XLS, XLSX, PDF

## Configuração e Instalação

### 1. Pré-requisitos
```bash
# Node.js 18+
node --version

# Claude Code instalado globalmente
npm install -g @anthropic-ai/claude-code
```

### 2. Instalação
```bash
# Clonar o repositório
git clone [repositório]
cd cryptalk-frontend

# Executar script de configuração
chmod +x scripts/setup-server.sh
./scripts/setup-server.sh

# Instalar dependências do frontend
npm install
```

### 3. Configuração
```bash
# Editar arquivo de configuração
nano server/.env

# Configurar API key do Claude
CLAUDE_API_KEY=your_api_key_here
```

### 4. Execução
```bash
# Iniciar sistema completo
chmod +x scripts/start-system.sh
./scripts/start-system.sh

# Ou iniciar componentes separadamente
cd server && npm start      # Backend
npm run dev                 # Frontend
```

## URLs e Portas

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001
- **WebSocket**: ws://localhost:8080

## API Endpoints

### Gerenciamento de Cliente
- `POST /api/client/create` - Criar nova sessão
- `DELETE /api/client/:clientId` - Limpar sessão

### Upload e Análise
- `POST /api/upload` - Upload de arquivo
- `POST /api/analyze` - Iniciar análise
- `GET /api/client/:clientId/files` - Listar arquivos

### Download
- `GET /api/download/:clientId/:fileName` - Download de arquivo

## Recursos Implementados

### ✅ Funcionalidades Principais
- [x] Upload de múltiplos formatos
- [x] Seleção de tipo de documento
- [x] Containers isolados por cliente
- [x] Análise via Claude Code
- [x] Chat em tempo real
- [x] Download de arquivos
- [x] Limpeza automática

### ✅ Segurança e Isolamento
- [x] Containers isolados por cliente
- [x] Validação de tipos de arquivo
- [x] Limite de tamanho de arquivo
- [x] Timeout de análise
- [x] Limpeza automática de dados

### ✅ Interface e UX
- [x] Interface moderna com Chakra UI
- [x] Chat em tempo real
- [x] Progress bars
- [x] Notificações toast
- [x] Status de conexão
- [x] Upload modal

## Logs e Monitoramento

### Logs do Sistema
```bash
# Visualizar logs em tempo real
tail -f server/logs/server.log

# Verificar processos ativos
curl http://localhost:3001/api/health
```

### Métricas
- Número de clientes ativos
- Processos Claude em execução
- Arquivos por cliente
- Tempo de análise médio

## Manutenção

### Limpeza Manual
```bash
# Limpar todos os containers
rm -rf server/client-containers/*

# Limpar logs
rm -rf server/logs/*
```

### Reinicialização
```bash
# Reiniciar servidor
pkill -f "node server.js"
./scripts/start-system.sh
```

## Troubleshooting

### Problemas Comuns

#### 1. Claude Code não encontrado
```bash
# Verificar instalação
which claude

# Reinstalar se necessário
npm install -g @anthropic-ai/claude-code
```

#### 2. Erro de permissão
```bash
# Ajustar permissões
chmod +x scripts/*.sh
sudo chown -R $USER:$USER server/
```

#### 3. WebSocket não conecta
```bash
# Verificar porta
netstat -tlnp | grep 8080

# Verificar firewall
sudo ufw allow 8080
```

#### 4. Upload falha
```bash
# Verificar espaço em disco
df -h

# Verificar permissões de escrita
ls -la server/client-containers/
```

## Próximos Passos

### Melhorias Futuras
- [ ] Suporte a mais tipos de documento
- [ ] Análise colaborativa
- [ ] Templates customizáveis
- [ ] Integração com APIs externas
- [ ] Sistema de notificações
- [ ] Dashboard de analytics

### Otimizações
- [ ] Cache de resultados
- [ ] Processamento em lotes
- [ ] Compressão de arquivos
- [ ] CDN para assets
- [ ] Load balancing

## Suporte

Para suporte técnico ou dúvidas sobre o sistema:
1. Verificar logs do sistema
2. Consultar documentação da API
3. Testar endpoints individualmente
4. Verificar configurações de ambiente