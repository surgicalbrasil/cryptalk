# 🎯 CrypTalk - Arquitetura Modular V2.0

> **Sistema de Análise de Documentos com IA usando Arquitetura Verdadeiramente Modular**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Claude AI](https://img.shields.io/badge/Claude%20AI-FF6B35?style=for-the-badge&logo=anthropic&logoColor=white)](https://claude.ai/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)

---

## 🚀 **O que é o CrypTalk?**

CrypTalk é uma plataforma de análise de documentos que utiliza Claude AI para fornecer insights profundos sobre:
- 📊 **Pitch Decks** - Análise de viabilidade e potencial
- 📋 **Documentos Financeiros** - Projeções e métricas
- ⚖️ **Documentos Legais** - Análise jurídica
- 🔬 **Documentos Técnicos** - Avaliação tecnológica
- 📜 **Patentes** - Análise de inovação

---

## 🏗️ **Arquitetura Modular V2.0**

### **📁 Estrutura Didática**
```
cryptalk/
├── 1-frontend/              # 🎨 Interface do usuário (React + Vite)
├── 2-backend/               # ⚙️ Backend modular (TypeScript)
│   ├── core/               # 🎯 Foundation (Config + DI + Interfaces)
│   ├── modules/            # 🧩 Módulos independentes
│   └── orchestrator.ts     # 🎼 Coordenador modular
├── 3-config/              # ⚙️ Configurações e infraestrutura
├── 4-scripts/             # 🔧 Automação e deployment
├── 5-storage/             # 💾 Dados, logs e uploads
└── 6-docs/                # 📚 Documentação completa
```

### **🧩 Módulos Independentes**
- **🐳 Docker Module** - Gerenciamento de containers isolados
- **🤖 Claude Module** - Serviços de IA e análise
- **📁 Upload Module** - Processamento e validação de arquivos
- **🌐 WebSocket Module** - Comunicação real-time

---

## ⚡ **Quick Start**

### **🔧 Pré-requisitos**
```bash
# Node.js 18+ e Docker instalados
node --version  # v18+
docker --version
```

### **📦 Instalação**
```bash
# Clone o repositório
git clone https://github.com/surgicalbrasil/cryptalk.git
cd cryptalk

# Instale dependências
npm run install-all

# Configure ambiente
cp .env.example .env
# Edite .env com suas chaves API
```

### **🚀 Executar**
```bash
# Desenvolvimento (arquitetura modular V2.0)
npm start

# ou arquitetura anterior (para comparação)
npm run start:old
```

### **🌐 Acessar**
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3002
- **Health Check:** http://localhost:3002/api/health
- **WebSocket:** ws://localhost:8080

---

## 🎯 **Características Técnicas**

### **✅ Arquitetura Verdadeiramente Modular**
- **Zero Acoplamento** entre módulos
- **Dependency Injection** com container
- **Event-Driven** communication
- **TypeScript Strict** com interfaces
- **Testabilidade** módulo por módulo

### **🔒 Segurança & Performance**
- Rate limiting configurável
- Validação robusta de arquivos
- Containers Docker isolados
- Input sanitization
- CORS e Helmet configurados

### **🔄 Event-Driven Architecture**
```typescript
// Comunicação via EventBus
dockerService.on('container-created', handler);
claudeService.on('analysis_progress', progressHandler);
fileService.on('file_uploaded', uploadHandler);
wsModule.eventBus.publish('event', data);
```

### **⚙️ Configuração Centralizada**
```typescript
// Zero hardcoding
const config = configService.getConfig();
const dockerService = createDockerService(config.docker);
const claudeService = createClaudeService(config.claude);
```

---

## 🧪 **Testes**

### **Testes por Módulo (Isolados)**
```bash
npm run test:docker     # Testa módulo Docker
npm run test:claude     # Testa módulo Claude
npm run test:upload     # Testa módulo Upload
npm run test:websocket  # Testa módulo WebSocket
```

### **Validação Completa**
```bash
npm run validate        # TypeScript validation
npm run test:modules    # Todos os testes modulares
npm run health          # Health check dos serviços
```

---

## 📊 **Monitoramento**

### **APIs de Status**
```bash
# Health check detalhado
curl http://localhost:3002/api/health

# Status dos serviços
curl http://localhost:3002/api/status

# Métricas dos módulos
npm run health
```

### **Infraestrutura (Opcional)**
```bash
# PostgreSQL + Redis + Prometheus + Grafana
npm run docker:up

# Monitoramento avançado
# Grafana: http://localhost:3001
# Prometheus: http://localhost:9091
```

---

## 🔄 **Workflows Suportados**

### **1. Análise de Documento**
```
Upload → Validação → Container → Claude AI → Resultado → WebSocket
```

### **2. Conversação Contextual**
```
Documento Analisado → Sessão → Pergunta → Claude → Resposta Contextual
```

### **3. Monitoramento Real-time**
```
WebSocket → Events → Progress Updates → Notificações
```

---

## 📚 **Documentação**

### **Guias Técnicos**
- [📖 Arquitetura Modular V2.0](6-docs/guides/ARQUITETURA_MODULAR_V2.md)
- [🏗️ Estrutura Modular](6-docs/guides/ESTRUTURA_MODULAR.md)
- [🐳 Docker Guide](6-docs/guides/DOCKER_GUIDE.md)
- [🔧 Deployment](6-docs/guides/DEPLOYMENT.md)

### **API Documentation**
- [🔌 Core Interfaces](2-backend/core/interfaces/)
- [🐳 Docker Module](2-backend/modules/docker/)
- [🤖 Claude Module](2-backend/modules/claude/)
- [📁 Upload Module](2-backend/modules/upload/)
- [🌐 WebSocket Module](2-backend/modules/websocket/)

---

## 🛠️ **Scripts Disponíveis**

### **Desenvolvimento**
```bash
npm start              # Backend modular + Frontend
npm run dev            # Só frontend
npm run backend        # Só backend modular
npm run backend:old    # Backend monolítico (legacy)
```

### **Infraestrutura**
```bash
npm run docker:up      # Sobe PostgreSQL + Redis + Monitoring
npm run docker:down    # Para containers
npm run setup          # Setup completo do ambiente
```

### **Testes & Qualidade**
```bash
npm run test           # Todos os testes
npm run test:modules   # Testes modulares
npm run validate       # Validação TypeScript
npm run health         # Health check
```

### **Deployment**
```bash
npm run build          # Build de produção
npm run deploy         # Deploy automatizado
npm run security       # Security lockdown
```

---

## 🔧 **Configuração Avançada**

### **Variáveis de Ambiente**
```bash
# APIs
ANTHROPIC_API_KEY=your_claude_api_key
CLAUDE_API_KEY=your_claude_api_key

# Servidor
PORT=3002
WS_PORT=8080
NODE_ENV=development

# Docker
DOCKER_IMAGE=claude-user-env:latest
MAX_CONTAINERS=10

# Segurança
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=100
```

### **Arquivo de Configuração**
```json
// 3-config/app-config.json
{
  "app": { "port": 3002, "env": "development" },
  "docker": { "maxConcurrent": 10, "maxAge": 1800000 },
  "claude": { "sessionTimeout": 1800000, "maxSessions": 50 },
  "upload": { "maxFileSize": 52428800, "allowedTypes": {...} },
  "websocket": { "port": 8080, "heartbeatInterval": 30000 }
}
```

---

## 🏆 **Benefícios da Arquitetura V2.0**

### **🔧 Para Desenvolvimento**
- **Desenvolvimento Paralelo** - Equipes trabalham em módulos independentes
- **Testes Isolados** - Cada módulo testável separadamente
- **Debug Simplificado** - Problemas isolados por módulo
- **Zero Breaking Changes** - Mudanças não quebram outros módulos

### **🚀 Para Produção**
- **Deploy Granular** - Atualizar apenas módulos alterados
- **Escalabilidade Horizontal** - Cada módulo escala independentemente
- **Monitoramento Detalhado** - Métricas por módulo
- **Recuperação Rápida** - Falhas isoladas

### **👥 Para Equipe**
- **Curva de Aprendizado** - Foco em um módulo por vez
- **Reutilização** - Módulos portáveis para outros projetos
- **Padrões Consistentes** - Interfaces forçam boas práticas
- **Documentação Viva** - Interfaces como documentação executável

---

## 🤝 **Contribuindo**

1. Fork o projeto
2. Crie sua feature branch (`git checkout -b feature/AmazingFeature`)
3. Execute os testes (`npm run test:modules`)
4. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
5. Push para a branch (`git push origin feature/AmazingFeature`)
6. Abra um Pull Request

---

## 📄 **Licença**

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## 🙏 **Agradecimentos**

- [Anthropic](https://www.anthropic.com/) pelo Claude AI
- [Docker](https://www.docker.com/) pela containerização
- [TypeScript](https://www.typescriptlang.org/) pela type safety
- [React](https://reactjs.org/) pela interface
- [Node.js](https://nodejs.org/) pelo runtime

---

## 📞 **Suporte**

- **Issues:** [GitHub Issues](https://github.com/surgicalbrasil/cryptalk/issues)
- **Documentação:** [Guias Completos](6-docs/guides/)
- **API Reference:** [Core Interfaces](2-backend/core/interfaces/)

---

<div align="center">

**Feito com ❤️ usando Arquitetura Modular de Nível Enterprise**

[⭐ Star no GitHub](https://github.com/surgicalbrasil/cryptalk) | [🐛 Report Bug](https://github.com/surgicalbrasil/cryptalk/issues) | [💡 Request Feature](https://github.com/surgicalbrasil/cryptalk/issues)

</div>