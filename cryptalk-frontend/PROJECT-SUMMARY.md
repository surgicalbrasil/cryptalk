# CrypTalk - Resumo Executivo

## 🎯 Objetivo do Projeto

CrypTalk é uma plataforma de comunicação médica segura que permite:
- Comunicação geral gratuita (off-chain)
- Compartilhamento seguro de documentos médicos (on-chain)
- Controle total pela Surgical Brasil sobre dados sensíveis

## 🔑 Características Principais

### 1. Dual Chat Architecture
- **Chat Geral**: Mensagens instantâneas, sem custos
- **Chat Médico**: Documentos criptografados, acesso controlado

### 2. Segurança Empresarial
- Apenas Surgical Brasil pode descriptografar documentos médicos
- Criptografia AES-256-GCM
- Arquivos armazenados no Web3Storage (descentralizado)

### 3. Controle de Acesso
- Admin controla quem pode usar o chat médico
- Baseado em status de pagamento
- Interface administrativa completa

### 4. Experiência do Usuário
- Login simples com MetaMask
- Sem necessidade de conta Web3Storage
- Interface intuitiva e responsiva

## 💼 Modelo de Negócio

1. **Chat Geral**: Gratuito (atrai clientes)
2. **Chat Médico**: Pago (monetização)
3. **Controle Total**: Surgical Brasil mantém acesso aos dados

## 🛠️ Stack Tecnológica

- **Frontend**: React + TypeScript + Vite
- **UI**: Chakra UI
- **Autenticação**: MetaMask (Ethereum DIDs)
- **Storage**: Web3Storage (IPFS)
- **Criptografia**: CryptoJS (AES-256-GCM)
- **Backend**: Node.js + Express

## 📊 Status Atual

✅ **Completo**:
- Sistema de autenticação
- Ambos os chats funcionando
- Upload de arquivos criptografados
- Painel administrativo
- Controle de acesso por pagamento

🚧 **Próximos Passos**:
- Deploy em produção
- Integração com gateway de pagamento
- App mobile
- Notificações em tempo real

## 🚀 Como Iniciar

### Desenvolvimento Rápido:
```bash
# Linux/Mac
./start-dev.sh

# Windows
start-dev.bat
```

### Manual:
1. `node simple-upload-server.js` (Terminal 1)
2. `npm run dev` (Terminal 2)
3. Acessar http://localhost:5173

## 👥 Usuários

### Cliente Regular
- Login com qualquer wallet
- Acesso ao chat geral
- Chat médico se pagamento em dia

### Administrador (Surgical Brasil)
- Wallet: `0x650687aD5F50E2DF6763f300BCAC9E03B4B4fCb6`
- Acesso total ao painel admin
- Controla acesso dos clientes
- Descriptografa todos os arquivos

## 📈 Vantagens Competitivas

1. **Segurança**: Empresa mantém controle total
2. **Compliance**: Adequado para dados médicos
3. **Escalabilidade**: Arquitetura descentralizada
4. **Custo**: Chat gratuito atrai usuários
5. **Monetização**: Chat pago gera receita

## 🎓 Documentação

- `DEVELOPMENT-STATUS.md` - Estado técnico detalhado
- `QUICK-START.md` - Guia de início rápido
- `ERROR-FIXES.md` - Soluções para erros comuns
- `ARQUITETURA_DUAL.md` - Arquitetura do sistema
- `SEGURANCA_CRIPTOGRAFIA.md` - Detalhes de segurança

---

**CrypTalk** - Transformando a comunicação médica com segurança e controle empresarial.