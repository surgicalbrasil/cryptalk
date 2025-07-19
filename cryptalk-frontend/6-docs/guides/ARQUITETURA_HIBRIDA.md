# 🌐 Arquitetura Híbrida CrysTalk

## 📋 Visão Geral

A arquitetura híbrida do CrysTalk combina:
- **Frontend Público**: Hospedado em plataformas como Vercel, Netlify ou GitHub Pages
- **Backend Local**: Executado no WSL da máquina local
- **Cloudflare Tunnel**: Conecta o frontend público ao backend local
- **Armazenamento Local**: Arquivos salvos localmente no WSL
- **Claude Code Gratuito**: Processamento local sem custos

## 🏗️ Componentes da Arquitetura

### 1. Frontend Público
```
┌─────────────────────────────────────┐
│           Frontend Público          │
│  ┌─────────────────────────────────┐ │
│  │     Vercel/Netlify/GitHub       │ │
│  │        Pages Hosting            │ │
│  │                                 │ │
│  │  • React SPA                    │ │
│  │  • Configuração dinâmica        │ │
│  │  • Interface responsiva         │ │
│  │  • PWA capabilities             │ │
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 2. Cloudflare Tunnel
```
┌─────────────────────────────────────┐
│         Cloudflare Tunnel           │
│  ┌─────────────────────────────────┐ │
│  │    Internet → WSL Bridge        │ │
│  │                                 │ │
│  │  • Secure HTTPS tunnel          │ │
│  │  • Automatic SSL/TLS            │ │
│  │  • DDoS protection              │ │
│  │  • Global CDN                   │ │
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 3. Backend Local (WSL)
```
┌─────────────────────────────────────┐
│           Backend Local             │
│  ┌─────────────────────────────────┐ │
│  │         WSL Environment         │ │
│  │                                 │ │
│  │  • Express.js server            │ │
│  │  • WebSocket support            │ │
│  │  • File upload/download         │ │
│  │  • Claude Code integration      │ │
│  │  • Local file storage           │ │
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

## 🔄 Fluxo de Dados

```
Frontend Público → Cloudflare Tunnel → Backend WSL → Claude Code Local
      ↓                    ↓                 ↓              ↓
  [Interface]         [Secure Bridge]   [Processing]   [AI Analysis]
      ↓                    ↓                 ↓              ↓
   WebSocket ← Cloudflare Tunnel ← Real-time Updates ← Results
```

## 🚀 Configuração Rápida

### Pré-requisitos
- WSL2 instalado
- Node.js 18+
- npm ou yarn

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar Cloudflare Tunnel
```bash
# Executar setup do tunnel
npm run tunnel:setup

# Seguir instruções para login no Cloudflare
cloudflared tunnel login

# Criar tunnel permanente (opcional)
cloudflared tunnel create cryptalk-backend
```

### 3. Iniciar Sistema Híbrido
```bash
# Opção 1: Sistema completo automatizado
npm run deploy:full

# Opção 2: Componentes separados
npm run server:hybrid    # Backend
npm run tunnel:start     # Tunnel
npm run build:prod       # Build frontend
npm run deploy:frontend  # Deploy frontend
```

## 📂 Estrutura de Arquivos

```
cryptalk-frontend/
├── 🌐 Frontend
│   ├── src/
│   │   ├── config/
│   │   │   └── api.js           # Configuração híbrida
│   │   ├── services/
│   │   │   ├── api.js           # Serviço de API
│   │   │   └── websocket.js     # WebSocket service
│   │   └── components/
│   └── dist/                    # Build de produção
├── 🖥️ Backend
│   ├── server/
│   │   ├── server-hybrid.js     # Servidor híbrido
│   │   └── client-containers/   # Arquivos dos clientes
├── 🔧 Configuração
│   ├── .env.production          # Variáveis de produção
│   ├── tunnel-config.yml        # Configuração do tunnel
│   ├── vercel.json             # Configuração Vercel
│   └── netlify.toml            # Configuração Netlify
└── 📜 Scripts
    ├── scripts/
    │   ├── setup-tunnel.sh      # Setup do tunnel
    │   ├── deploy-frontend.sh   # Deploy do frontend
    │   └── deploy-full.sh       # Deploy completo
```

## 🎯 Comandos Principais

### Backend
```bash
npm run server:hybrid     # Iniciar backend híbrido
npm run server:prod      # Backend em produção
```

### Tunnel
```bash
npm run tunnel:setup     # Configurar tunnel
npm run tunnel:start     # Iniciar tunnel
npm run tunnel:stop      # Parar tunnel
npm run tunnel:status    # Status do tunnel
```

### Frontend
```bash
npm run build:prod       # Build de produção
npm run deploy:frontend  # Deploy do frontend
```

### Sistema Completo
```bash
npm run hybrid:start     # Backend + Tunnel
npm run hybrid:dev       # Dev + Backend + Tunnel
npm run deploy:full      # Deploy completo
```

## 🔧 Configuração Personalizada

### Variáveis de Ambiente

**`.env.production`**
```bash
# Backend
NODE_ENV=production
PORT=3001
SERVER_HOST=0.0.0.0

# Tunnel URLs (atualizadas automaticamente)
BACKEND_URL=https://your-tunnel.trycloudflare.com
WEBSOCKET_URL=wss://your-tunnel.trycloudflare.com

# CORS para frontend público
CORS_ORIGIN=https://your-app.vercel.app,https://your-app.netlify.app
```

### Configuração do Tunnel

**`tunnel-config.yml`**
```yaml
tunnel: cryptalk-backend
credentials-file: ~/.cloudflared/credentials.json

ingress:
  - hostname: "*.trycloudflare.com"
    service: http://localhost:3001
  - service: http://localhost:3001
```

## 🔐 Segurança

### Recursos de Segurança
- **HTTPS obrigatório** via Cloudflare
- **CORS configurado** para domínios específicos
- **Rate limiting** para prevenir abuso
- **Helmet.js** para headers de segurança
- **Input validation** em todos os endpoints
- **File type validation** para uploads

### Configuração de CORS
```javascript
const corsOptions = {
  origin: [
    'https://your-app.vercel.app',
    'https://your-app.netlify.app',
    'https://your-app.github.io'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};
```

## 📊 Monitoramento

### Logs
```bash
# Logs do backend
tail -f /tmp/cryptalk-production.log

# Logs do tunnel
tail -f /tmp/tunnel.log

# Status do sistema
npm run tunnel:status
```

### Métricas
- **Health checks** em `/api/health`
- **System info** em `/api/info`
- **WebSocket status** em tempo real
- **File upload metrics**

## 🚀 Deploy em Produção

### Vercel
```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy
npm run deploy:frontend vercel
```

### Netlify
```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Deploy
npm run deploy:frontend netlify
```

### GitHub Pages
```bash
# Instalar gh-pages
npm install -g gh-pages

# Deploy
npm run deploy:frontend github-pages
```

## 🔄 Workflow de Desenvolvimento

### 1. Desenvolvimento Local
```bash
# Terminal 1: Backend
npm run server:hybrid

# Terminal 2: Frontend
npm run dev

# Terminal 3: Tunnel (se necessário)
npm run tunnel:start
```

### 2. Teste de Produção
```bash
# Build e teste local
npm run build:prod
npm run preview

# Deploy completo
npm run deploy:full
```

### 3. Deploy Final
```bash
# Deploy apenas frontend
npm run deploy:frontend vercel

# Deploy completo com tunnel
npm run deploy:full vercel
```

## 🐛 Troubleshooting

### Problemas Comuns

#### 1. Tunnel não conecta
```bash
# Verificar status
npm run tunnel:status

# Reiniciar tunnel
npm run tunnel:stop
npm run tunnel:start

# Verificar logs
tail -f /tmp/tunnel.log
```

#### 2. Backend não responde
```bash
# Verificar porta
netstat -tlnp | grep :3001

# Verificar logs
tail -f /tmp/cryptalk-production.log

# Reiniciar backend
npm run server:prod
```

#### 3. Frontend não conecta
```bash
# Verificar configuração
cat dist/config.js

# Verificar CORS
curl -I https://your-tunnel.trycloudflare.com/api/health
```

## 💡 Vantagens da Arquitetura

### ✅ Benefícios
- **Custo zero** para hospedagem do frontend
- **Processamento local** com Claude Code gratuito
- **Segurança** com arquivos armazenados localmente
- **Escalabilidade** do frontend via CDN
- **Flexibilidade** para diferentes plataformas

### ⚠️ Considerações
- **Dependência da internet** para tunnel
- **Máquina local** deve estar sempre ligada
- **Latência** adicional do tunnel
- **Configuração** mais complexa

## 🔮 Próximos Passos

1. **Implementar cache** para reduzir latência
2. **Adicionar PWA** para funcionamento offline
3. **Configurar backup** automático
4. **Implementar métricas** avançadas
5. **Adicionar suporte** a múltiplos tunnels

## 📞 Suporte

Para problemas ou dúvidas:
1. Verificar logs do sistema
2. Consultar documentação do Cloudflare
3. Testar conectividade da rede
4. Verificar configurações de firewall

---

**🎉 Parabéns! Sua arquitetura híbrida está configurada!**