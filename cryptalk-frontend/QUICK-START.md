# CrypTalk - Guia de Início Rápido

## 🚀 Como Retomar o Desenvolvimento

### 1. Verificar Pré-requisitos
```bash
# Node.js instalado
node --version  # v16+ recomendado

# w3 CLI instalado
w3 --version

# Git configurado
git status
```

### 2. Iniciar os Serviços

#### A. Backend Upload Server (Terminal 1)
```bash
cd /home/surgical/my-claude-project/CrypTalk/cryptalk-frontend
node simple-upload-server.js
# Deve mostrar: "Backend Upload Server rodando na porta 3001"
```

#### B. Frontend Dev Server (Terminal 2)
```bash
cd /home/surgical/my-claude-project/CrypTalk/cryptalk-frontend
npm run dev
# Acesse: http://localhost:5173
```

### 3. Testar Funcionalidades

#### Como Admin (Surgical Brasil)
1. Fazer login com wallet: `0x650687aD5F50E2DF6763f300BCAC9E03B4B4fCb6`
2. Acessar Painel Admin no header
3. Gerenciar acesso de clientes ao chat on-chain
4. Visualizar e descriptografar mensagens

#### Como Cliente
1. Fazer login com qualquer outra wallet
2. Usar Chat Geral (sempre disponível)
3. Tentar Chat Médico (verificará permissão)
4. Fazer upload de arquivos

### 4. Estrutura de Navegação

```
Header
├── Dashboard
├── Chats (dropdown)
│   ├── Chat Geral (off-chain)
│   └── Chat Médico (on-chain)
├── Painel Admin (só para admin)
├── Pagamentos
└── Surgical Brasil
```

### 5. Fluxo de Controle de Acesso

1. Cliente tenta acessar Chat Médico
2. Sistema verifica em `AccessControlService`
3. Se bloqueado → mostra mensagem de erro
4. Admin pode desbloquear no Painel Admin

### 6. Troubleshooting Comum

**Erro: "Cannot connect to localhost"**
```bash
# Verificar se os servidores estão rodando
ps aux | grep -E "(node|vite)"
```

**Erro: "Web3Storage upload failed"**
```bash
# Verificar configuração do w3
w3 whoami
w3 space ls
```

**Erro: "Access denied to on-chain chat"**
- Verificar no painel admin se o cliente tem acesso
- Verificar status de pagamento

### 7. Arquivos para Editar Frequentemente

- `src/services/AccessControlService.ts` - Lógica de controle de acesso
- `src/pages/AdminDashboard.tsx` - Interface administrativa
- `src/pages/Chat.tsx` - Interface principal do chat
- `src/services/OnChainChatService.ts` - Lógica do chat seguro

### 8. Variáveis de Ambiente

Criar arquivo `.env` se não existir:
```env
VITE_COMPANY_WALLET=0x650687aD5F50E2DF6763f300BCAC9E03B4B4fCb6
VITE_BACKEND_URL=http://localhost:3001
```

---

## 📞 Suporte

Em caso de dúvidas, consultar:
- `DEVELOPMENT-STATUS.md` - Status detalhado
- `ARQUITETURA_DUAL.md` - Arquitetura do sistema
- `SEGURANCA_CRIPTOGRAFIA.md` - Detalhes de segurança