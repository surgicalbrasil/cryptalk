# CrypTalk Frontend

Sistema frontend para a plataforma CrypTalk - uma solução completa para análise de documentos com IA, chat em tempo real e armazenamento descentralizado.

## 🚀 Funcionalidades

- **Análise de Documentos com IA**: Processamento inteligente de documentos usando Claude AI
- **Chat em Tempo Real**: Interface de chat com timestamping e histórico
- **Armazenamento Descentralizado**: Integração com Web3 Storage e IPFS
- **Autenticação Segura**: Sistema de autenticação com Magic Link
- **Interface Moderna**: UI responsiva construída com React e Chakra UI
- **Múltiplos Formatos**: Suporte para PDF, DOC, DOCX, TXT, CSV, JSON, imagens
- **Dashboard Modular**: Painéis organizados por funcionalidade
- **Análise de Múltiplos Agentes**: Suporte para diferentes tipos de análise (patentes, pitch decks, projeções financeiras)

## 🏗️ Arquitetura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend│    │   Claude API    │    │   Web3 Storage  │
│   (Vite + TS)   │◄──►│   (Node.js)     │◄──►│     (IPFS)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       ▼                       │
         │              ┌─────────────────┐              │
         │              │  Magic Link     │              │
         │              │  (Auth)         │              │
         │              └─────────────────┘              │
         │                                                │
         ▼                                                ▼
┌─────────────────┐                            ┌─────────────────┐
│  Document       │                            │   WebSocket     │
│  Analysis       │                            │  (Real-time)    │
└─────────────────┘                            └─────────────────┘
```

## 📋 Pré-requisitos

- Node.js 18.0+
- npm 8.0+
- Navegador moderno (Chrome, Firefox, Safari, Edge)
- 2GB RAM mínimo
- 1GB espaço em disco

## 🛠️ Instalação Rápida

### 1. Clonar o Repositório

```bash
git clone https://github.com/surgicalbrasil/cryptalk.git
cd cryptalk-frontend
```

### 2. Configurar Ambiente

```bash
# Executar script de setup
npm run setup
```

### 3. Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar configurações
nano .env
```

### 4. Iniciar Aplicação

```bash
# Desenvolvimento
npm run dev

# Ou usar o alias
npm start
```

### 5. Acessar a Aplicação

Abra seu navegador e acesse: http://localhost:5173

## 🔧 Configuração Detalhada

### Variáveis de Ambiente

Edite o arquivo `.env` na raiz do projeto:

```env
# API Configuration
REACT_APP_API_URL=http://localhost:3001
REACT_APP_WEBSOCKET_URL=ws://localhost:3001

# Claude Code Integration
REACT_APP_CLAUDE_CODE_ENABLED=true
REACT_APP_CLAUDE_CODE_ENDPOINT=http://localhost:8080
REACT_APP_CLAUDE_CODE_API_KEY=sua-chave-claude-aqui

# Feature Flags
REACT_APP_DOCUMENT_ANALYSIS_ENABLED=true
REACT_APP_CHAT_INTERFACE_ENABLED=true
REACT_APP_REAL_TIME_ANALYSIS_ENABLED=true

# Auth Configuration
REACT_APP_AUTH_ENABLED=true
REACT_APP_MAGIC_PUBLISHABLE_KEY=sua-chave-magic-aqui

# Web3 Storage
REACT_APP_WEB3_STORAGE_TOKEN=seu-token-web3-storage-aqui

# Upload Limits
REACT_APP_MAX_FILE_SIZE=52428800  # 50MB
REACT_APP_MAX_FILES_PER_UPLOAD=5
```

### Configuração de Produção

Para produção, ajuste as seguintes variáveis:

```env
NODE_ENV=production
REACT_APP_DEBUG=false
REACT_APP_LOG_LEVEL=error
REACT_APP_API_URL=https://sua-api-producao.com
REACT_APP_WEBSOCKET_URL=wss://sua-api-producao.com
```

## 🎮 Uso

### Interface Web

A aplicação está disponível em:

- **Aplicação Principal**: http://localhost:5173
- **Modo de Produção**: http://localhost:4173 (após build)

### Funcionalidades Principais

#### 1. Análise de Documentos

1. Acesse a seção "Análise de Documentos"
2. Selecione o tipo de análise (patente, pitch deck, projeção financeira)
3. Faça upload dos documentos
4. Escolha o agente de IA apropriado
5. Aguarde o processamento e visualize os resultados

#### 2. Chat em Tempo Real

1. Acesse a seção "Chat"
2. Inicie uma conversa com timestamp automático
3. Histórico de mensagens é salvo automaticamente
4. Suporte a múltiplos formatos de mensagem

#### 3. Armazenamento Web3

1. Configure suas credenciais Web3 Storage
2. Documentos são automaticamente armazenados no IPFS
3. Acesse histórico de uploads
4. Controle de versões automático

### Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev          # Inicia servidor de desenvolvimento
npm start           # Alias para npm run dev

# Produção
npm run build       # Cria build de produção
npm run preview     # Visualiza build de produção
npm run deploy      # Script automatizado de deploy

# Manutenção
npm run lint        # Executa linting
npm run setup       # Configura ambiente
npm run clean       # Limpa e reinstala dependências
```

## 📊 Estrutura do Projeto

```
cryptalk-frontend/
├── src/
│   ├── components/          # Componentes reutilizáveis
│   ├── features/           # Funcionalidades por módulo
│   │   ├── document-analysis/
│   │   ├── chat/
│   │   ├── storage/
│   │   ├── ai-reviews/
│   │   └── payments/
│   ├── pages/              # Páginas da aplicação
│   ├── services/           # Serviços e APIs
│   ├── contexts/           # Contextos do React
│   ├── hooks/              # Hooks customizados
│   ├── shared/             # Utilitários compartilhados
│   └── types/              # Definições TypeScript
├── public/                 # Arquivos públicos
├── scripts/               # Scripts de automação
├── docs/                  # Documentação
└── dist/                  # Build de produção
```

### Tecnologias Utilizadas

- **React 18**: Framework principal
- **TypeScript**: Tipagem estática
- **Vite**: Build tool moderna
- **Chakra UI**: Biblioteca de componentes
- **React Router**: Roteamento
- **Magic SDK**: Autenticação
- **Web3 Storage**: Armazenamento descentralizado
- **Axios**: Cliente HTTP
- **React Query**: Gerenciamento de estado servidor

## 🔒 Segurança

### Práticas Implementadas

- **Autenticação Segura**: Magic Link para autenticação sem senhas
- **Validação de Arquivos**: Tipos e tamanhos limitados
- **Comunicação Segura**: HTTPS em produção
- **Headers de Segurança**: Configurações adequadas para produção
- **Sanitização de Dados**: Validação de entrada em todas as APIs
- **Armazenamento Descentralizado**: Dados críticos no IPFS

### Configuração de Segurança

```bash
# Variáveis de ambiente sensíveis
# Nunca commitar as chaves reais
REACT_APP_MAGIC_PUBLISHABLE_KEY=pk_live_...
REACT_APP_CLAUDE_CODE_API_KEY=sk_live_...
REACT_APP_WEB3_STORAGE_TOKEN=token_...
```

## 🚀 Deploy

### Deploy para Produção

```bash
# 1. Preparar ambiente
npm run setup

# 2. Configurar variáveis de produção
# Editar .env com valores de produção

# 3. Executar deploy
npm run deploy

# 4. Servir arquivos estáticos
npm run preview
```

### Deploy com Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Deploy com Netlify

```bash
# Instalar Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

## 🔧 Desenvolvimento

### Comandos Úteis

```bash
# Desenvolvimento
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run preview      # Visualizar build
npm run lint         # Linting

# Manutenção
npm run clean        # Limpar e reinstalar
npm run setup        # Configurar ambiente
npm run deploy       # Deploy automatizado
```

### Estrutura de Desenvolvimento

- **Componentes**: Seguem padrões de design consistentes
- **Hooks**: Lógica reutilizável em hooks customizados
- **Serviços**: Camada de abstração para APIs
- **Contextos**: Gerenciamento de estado global
- **Utilitários**: Funções auxiliares compartilhadas

## 🐛 Solução de Problemas

### Problemas Comuns

#### Erro de instalação

```bash
# Limpar cache do npm
npm cache clean --force

# Reinstalar dependências
npm run clean
```

#### Porta em uso

```bash
# Verificar portas em uso
netstat -tuln | grep :5173

# Matar processo
kill -9 $(lsof -t -i:5173)

# Ou usar porta diferente
npm run dev -- --port 3000
```

#### Erro de build

```bash
# Verificar dependências
npm ls

# Atualizar dependências
npm update

# Recriar build
rm -rf dist && npm run build
```

### Logs e Debug

```bash
# Modo de debug
REACT_APP_DEBUG=true npm run dev

# Logs no navegador
# Abrir DevTools -> Console
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Faça commit das mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Padrões de Código

- Use TypeScript para tipagem
- Siga os padrões do ESLint
- Mantenha componentes pequenos e focados
- Documente funções complexas
- Escreva testes quando necessário

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 🆘 Suporte

Para suporte e dúvidas:

- **Issues**: https://github.com/surgicalbrasil/cryptalk/issues
- **Discussões**: https://github.com/surgicalbrasil/cryptalk/discussions
- **Email**: suporte@cryptalk.com

## 📚 Documentação Adicional

- [Guia de Desenvolvimento](GETTING_STARTED.md)
- [Arquitetura do Sistema](ARCHITECTURE.md)
- [Status do Sistema](SYSTEM_STATUS.md)
- [Integração de Análise](DOCUMENT_ANALYSIS_INTEGRATION.md)

## 🏆 Funcionalidades Implementadas

- ✅ Interface de usuário moderna com Chakra UI
- ✅ Sistema de autenticação com Magic Link
- ✅ Upload e análise de documentos
- ✅ Chat em tempo real com timestamps
- ✅ Integração com Claude AI
- ✅ Armazenamento Web3/IPFS
- ✅ Dashboard modular e responsivo
- ✅ Sistema de tipos TypeScript completo

---

**Desenvolvido pela equipe CrypTalk** 🚀