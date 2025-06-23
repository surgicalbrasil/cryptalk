# 🏗️ Arquitetura Dual CrypTalk - Versão 1.1.0

## 🔐 Sistema de Autenticação Dupla

### **Login Progressivo**

#### 1. 📧 **Autenticação por Email** (Entrada Principal)
- **Tecnologia:** Magic Link SDK
- **Processo:** Email → Link Mágico → Acesso Imediato
- **Recursos Disponíveis:**
  - Chat Off-Chain
  - Upload básico de arquivos
  - Visualização de informações
- **Custo:** Gratuito
- **Requisitos:** Apenas email

```
🟢 Login com Email
├── Digite seu email
├── Receba link mágico
├── Clique para acessar
└── Plataforma disponível!
```

#### 2. 🦊 **Conexão de Carteira** (Recursos Avançados)
- **Tecnologia:** MetaMask
- **Processo:** Conectar carteira quando necessário
- **Recursos Desbloqueados:**
  - Chat On-Chain com timestamps
  - Pagamentos em criptomoeda
  - Armazenamento com prova blockchain
- **Custo:** Gas fees quando usar blockchain
- **Requisitos:** MetaMask instalado

```
🔐 Conectar Carteira (Opcional)
├── Acesse recursos on-chain
├── Conecte MetaMask
├── Aprove conexão
└── Recursos blockchain disponíveis!
```

## 📱 Interface do Cliente Atualizada

### **Nova Navegação Principal**
```
📱 CrypTalk - Surgical Brasil

👤 [user@email.com] [📧 Email] [🦊 Carteira Opcional]

┌─────────────────────────────────────┐
│ Dashboard | Chats ▼ | ⛓️ On Chain | │
│ 💳 Pagamentos | 🏥 Surgical Brasil │
└─────────────────────────────────────┘
```

### **Página On Chain (Nova)**
```
⛓️ On Chain - Recursos Blockchain

🦊 Status da Carteira
├── [Conectar MetaMask] ou ✅ Conectada
├── Endereço: 0x123...abc
└── Rede: Polygon Mumbai

💰 Pagamentos Seguros
├── Processar pagamentos crypto
├── Histórico de transações
└── Comprovantes blockchain

⏰ Chat com Timestamp
├── Mensagens imutáveis
├── Registro permanente
└── Compliance legal
```

## 💬 Dois Canais de Comunicação

### 1. 💬 **Chat Off-Chain** (Email Suficiente)
- **Acesso:** Login com email
- **Uso:** Dúvidas gerais, agendamentos
- **Armazenamento:** Temporário/local
- **Velocidade:** Instantâneo
- **Custo:** Zero

```
🟢 Chat Off-Chain - Surgical Brasil
├── "Bom dia! Gostaria de agendar consulta"
├── "Qual o valor do procedimento?"
├── "Envio folder informativo" 📄
└── Resposta instantânea, sem blockchain
```

### 2. 🔒 **Chat On-Chain** (Requer Carteira)
- **Acesso:** Email + Carteira conectada
- **Uso:** Documentos médicos, contratos
- **Armazenamento:** Blockchain permanente
- **Protocolo:** CrypTalk SDK
- **Custo:** Gas fees mínimas

```
🔐 Chat On-Chain - Surgical Brasil
├── "Exame de ressonância" 🏥 [Timestamp: Block #12345]
├── "Pagamento processado" 💳 [TxHash: 0xabc...]
├── "Modelo 3D implante" 🦷 [CID: Qm123...]
└── Registro imutável na blockchain
```

## 🔐 Arquitetura de Segurança

### **Criptografia de Arquivos**
```
📁 Upload de Arquivo
├── 1. Arquivo Original
├── 2. Criptografia AES-256-CBC
├── 3. Geração de fileId único
├── 4. Upload para IPFS (arquivo criptografado)
├── 5. Armazenamento de metadados
│   ├── CID: público (arquivo criptografado)
│   └── fileId: privado (chave de descriptografia)
└── 6. Apenas Surgical Brasil pode descriptografar
```

### **Gestão de Chaves**
- **Sem Armazenamento Persistente:** Chaves derivadas on-demand
- **Derivação por Assinatura:** MetaMask assina → deriva chave
- **Rotação Diária:** Timestamp na assinatura
- **PBKDF2:** 100.000 iterações para segurança

## 🚀 Fluxo de Trabalho Atualizado

### **Para Novos Usuários**
```
1. Acessa CrypTalk
2. Login com Email (Magic Link)
3. Usa chat off-chain imediatamente
4. Conecta carteira quando precisar
5. Acessa recursos blockchain
```

### **Para Usuários Avançados**
```
1. Login com Email
2. Conecta MetaMask imediatamente
3. Acesso total desde o início
4. Chat on-chain disponível
5. Pagamentos e timestamps ativos
```

## 🏗️ Componentes Principais

### **Serviços de Autenticação**
- `MagicLinkAuthService`: Email authentication
- `AuthContext`: Estado unificado de auth
- `WalletConnectionModal`: Solicitação de carteira
- `useWalletConnection`: Hook para gestão

### **Serviços On-Chain**
- `OnChainChatService`: Chat com timestamp
- `PaymentService`: Pagamentos crypto
- `CompanyCryptoService`: Criptografia de arquivos
- `Web3StorageService`: Armazenamento IPFS

### **Interface de Usuário**
- `OnChain.tsx`: Dashboard blockchain
- `UserProfile.tsx`: Status de autenticação
- `WalletConnectionModal.tsx`: Modal de conexão
- `ClientWorkflow.tsx`: Fluxo de trabalho

## 📊 Comparação de Recursos

| Recurso | Email Only | Email + Carteira |
|---------|------------|------------------|
| Chat Off-Chain | ✅ | ✅ |
| Upload Básico | ✅ | ✅ |
| Chat On-Chain | ❌ | ✅ |
| Pagamentos | ❌ | ✅ |
| Timestamps | ❌ | ✅ |
| Prova Legal | ❌ | ✅ |

## 🎯 Benefícios da Arquitetura

1. **Acessibilidade:** Qualquer pessoa com email pode usar
2. **Progressividade:** Recursos aparecem conforme necessário
3. **Segurança:** Blockchain apenas quando relevante
4. **Economia:** Usuários pagam gas apenas se precisarem
5. **Compliance:** Registros imutáveis para casos médicos

## 🔮 Próximos Passos

- Integração completa com CrypTalk SDK
- Suporte para múltiplas carteiras
- Sistema de notificações
- Dashboard de analytics
- Mobile app com suporte dual auth