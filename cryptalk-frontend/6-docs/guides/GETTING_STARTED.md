# 🚀 CrypTalk - Guia de Início Rápido

## **📋 Pré-requisitos**

Antes de iniciar, certifique-se de ter instalado:

- **Node.js** 18.0+ ([Download](https://nodejs.org/))
- **npm** 8.0+ (incluído com Node.js)
- **Git** ([Download](https://git-scm.com/))

## **🛠️ Instalação**

### 1. **Clone o Repositório**
```bash
git clone https://github.com/seu-usuario/cryptalk-frontend.git
cd cryptalk-frontend
```

### 2. **Instale as Dependências**
```bash
npm install
```

### 3. **Configure as Variáveis de Ambiente**
```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Edite as configurações
nano .env
```

**Configurações essenciais:**
```env
# Desenvolvimento
VITE_APP_MODE=development
VITE_TEST_MODE=true

# Web3 Storage (obtenha em https://web3.storage)
VITE_WEB3_STORAGE_TOKEN=your_token_here

# Magic Link (obtenha em https://magic.link)
VITE_MAGIC_PUBLISHABLE_KEY=your_key_here
```

## **🚀 Executando o Sistema**

### **Modo de Desenvolvimento**
```bash
npm run dev
```
- Abre em: `http://localhost:5173`
- Hot reload ativo
- Modo de teste habilitado

### **Build de Produção**
```bash
npm run build
```
- Gera build otimizado em `/dist`
- Arquivos comprimidos e minificados

### **Preview do Build**
```bash
npm run preview
```
- Visualiza o build de produção localmente

## **🎯 Estrutura do Projeto**

```
cryptalk-frontend/
├── src/
│   ├── system.ts              # 🔧 Sistema Core
│   ├── modules/               # 📦 Módulos
│   │   ├── storage.ts         #   📁 Armazenamento
│   │   ├── chat.ts            #   💬 Chat
│   │   └── payments.ts        #   💰 Pagamentos
│   ├── features/              # 🎨 Funcionalidades
│   │   ├── storage/           #   📁 Componentes de Storage
│   │   ├── chat/              #   💬 Componentes de Chat
│   │   └── payments/          #   💰 Componentes de Pagamento
│   ├── pages/                 # 📄 Páginas
│   │   ├── ModularDashboard.tsx
│   │   ├── Login.tsx
│   │   └── Settings.tsx
│   ├── components/            # 🧩 Componentes
│   └── contexts/              # 🔄 Contexts
└── index.ts                   # 📦 API Principal
```

## **🔧 Funcionalidades Principais**

### **1. Sistema Modular**
- **EventBus**: Comunicação entre módulos
- **Provider Pattern**: Fácil troca de implementações
- **Type Safety**: TypeScript completo

### **2. Off Chain Space**
- **File Upload**: Upload de arquivos para Web3.Storage
- **Document Management**: Gerenciamento de documentos
- **AI Reviews**: Análise de documentos com IA

### **3. On Chain Space**
- **Crypto Payments**: Pagamentos com criptomoedas
- **Wallet Integration**: Integração com MetaMask
- **Transaction History**: Histórico de transações

### **4. Chat System**
- **Real-time Chat**: Chat em tempo real
- **Encrypted Messages**: Mensagens criptografadas
- **File Sharing**: Compartilhamento de arquivos

## **🎮 Como Usar**

### **1. Acesso ao Sistema**
- Abra `http://localhost:5173`
- No modo de teste, acesso é automático
- Para produção, configure autenticação

### **2. Off Chain Space**
- Clique na aba "📁 Off Chain Space"
- Faça upload de arquivos
- Visualize documentos salvos
- Use análise de IA

### **3. On Chain Space**
- Clique na aba "⛓️ On Chain Space"
- Conecte sua carteira MetaMask
- Faça pagamentos
- Visualize transações

### **4. Chat**
- Acesse o chat em tempo real
- Envie mensagens criptografadas
- Compartilhe arquivos

## **🔐 Configuração de Produção**

### **1. Desabilite o Modo de Teste**
```env
VITE_TEST_MODE=false
VITE_APP_MODE=production
```

### **2. Configure Autenticação**
```env
# Magic Link
VITE_MAGIC_PUBLISHABLE_KEY=pk_live_your_key

# JWT
VITE_JWT_SECRET=your_super_secret_key
```

### **3. Configure Web3 Storage**
```env
VITE_WEB3_STORAGE_TOKEN=your_production_token
```

### **4. Build e Deploy**
```bash
# Build otimizado
npm run build

# Deploy no seu servidor
# Copie a pasta /dist para seu servidor web
```

## **🐛 Solução de Problemas**

### **Erro: "Module not found"**
```bash
# Limpe cache e reinstale
rm -rf node_modules package-lock.json
npm install
```

### **Erro: "Port already in use"**
```bash
# Mude a porta no vite.config.ts
export default defineConfig({
  server: {
    port: 3000  // ou outra porta
  }
})
```

### **Erro: "Build failed"**
```bash
# Verifique se todas as dependências estão instaladas
npm install

# Execute o build com mais detalhes
npm run build --verbose
```

## **📚 Documentação**

- **[Arquitetura](ARCHITECTURE.md)** - Documentação técnica
- **[Status do Sistema](SYSTEM_STATUS.md)** - Status atual
- **[README](README.md)** - Documentação completa

## **🤝 Suporte**

Se encontrar problemas:

1. **Verifique a documentação** acima
2. **Consulte os logs** do navegador (F12)
3. **Verifique as configurações** do `.env`
4. **Abra uma issue** no GitHub

## **🎉 Próximos Passos**

1. **Customize** a interface conforme suas necessidades
2. **Adicione novos módulos** usando o padrão estabelecido
3. **Configure** integrações adicionais
4. **Teste** em ambiente de produção
5. **Monitore** o sistema em produção

---

**✨ Parabéns! Seu sistema CrypTalk está pronto para uso! 🚀**

Para mais informações, consulte a documentação completa ou entre em contato com a equipe de suporte.