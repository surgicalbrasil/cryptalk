# Guia de Teste - CrypTalk Frontend

## 🚀 Servidor de Desenvolvimento

O servidor está rodando em: http://localhost:5173/

## 📋 Fluxo de Teste Completo

### 1. Login com MetaMask
- Acesse http://localhost:5173/
- Clique em "Connect MetaMask"
- Aprove a conexão no MetaMask
- Você será redirecionado para `/workflow`

### 2. Chat com Surgical Brasil
- Na aba "1. Chat & Discuss":
  - Envie mensagens para discutir o serviço
  - Teste o envio de arquivos PDF clicando no botão "PDF"
  - As mensagens são automaticamente endereçadas para Surgical Brasil

### 3. Pagamento
- Clique em "Continue to Payment" ou vá para aba "2. Make Payment"
- O endereço da Surgical Brasil já está preenchido: `0x650687aD5F50E2DF6763f300BCAC9E03B4B4fCb6`
- Digite o valor do pagamento (ex: 0.001 ETH)
- Clique em "Send with MetaMask"
- Aprove a transação no MetaMask
- Após confirmação, você poderá acessar a aba de upload

### 4. Upload de PDF
- Com o pagamento confirmado, acesse a aba "3. Upload Files"
- Selecione um arquivo PDF
- Clique em "Upload File"
- O arquivo será criptografado e enviado ao Web3Storage

## 🔍 Verificações de Integridade

### ✅ Componentes Verificados:
- **Autenticação MetaMask**: Funcionando
- **Chat com timestamp**: Implementado
- **Envio de PDF no chat**: Implementado
- **Pagamento Polygon**: Configurado
- **Upload criptografado**: Implementado
- **DID da empresa**: `did:key:z6MkpTMTCcMMKgRFPAvoAtgf9Sip8uk2KoF7LU2JTvqLDmjQ`

### ⚠️ Requisitos para Teste Completo:
1. MetaMask instalado e configurado
2. Rede Polygon (Mumbai testnet) configurada
3. Alguns MATIC de teste na carteira
4. Arquivo PDF para teste

## 🛠️ Comandos Úteis

```bash
# Iniciar servidor
npm run dev

# Verificar logs
# Abra o console do navegador (F12)

# Parar servidor
Ctrl + C
```

## 📱 Estrutura de Arquivos Principais

- `/src/pages/LoginMetaMask.tsx` - Tela de login
- `/src/pages/ClientWorkflow.tsx` - Fluxo completo integrado
- `/src/pages/Chat.tsx` - Sistema de mensagens com upload
- `/src/pages/Payments.tsx` - Sistema de pagamentos
- `/src/services/Web3StorageService.ts` - Upload criptografado
- `/src/config/AppConfig.ts` - Configurações da empresa