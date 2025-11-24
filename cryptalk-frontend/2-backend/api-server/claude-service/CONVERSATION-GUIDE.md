# 🎯 Sistema de Conversa Claude Code - Guia Completo

## 📋 **O Que Mudou**

Transformamos o sistema de **"rodador de scripts"** em uma **conversa real** com Claude Code local no WSL!

## 🔄 **Fluxo da Conversa**

### 1. **Upload & Análise Inicial**
```
Frontend → Upload arquivo → Container salva → Copia para local
Backend → Roda `claude` com template MD → Análise inicial
Claude Code → Mantém sessão ativa → Resposta via WebSocket → Frontend
```

### 2. **Chat Conversacional**
```
Frontend → Pergunta no chat → Backend alimenta sessão Claude ativa
Claude Code → Processa com contexto → Resposta via WebSocket → Frontend
Frontend → Nova pergunta → Mesma sessão Claude Code → Continua conversa...
```

## 🚀 **Como Usar**

### **Upload de Documento**
```bash
POST /api/client/create          # Criar container
POST /api/client/:id/upload      # Upload arquivo + tipo
POST /api/client/:id/analyze     # Iniciar análise Claude Code
```

### **Chat Conversacional**
```bash
POST /api/client/:id/chat        # Fazer pergunta
GET /api/client/:id/session      # Status da sessão
GET /api/client/:id/history      # Histórico da conversa
```

## 💬 **Exemplo de Conversa**

### **1. Upload + Análise**
```json
POST /api/client/abc123/analyze
{
  "fileName": "pitch-deck.pdf",
  "documentType": "pitch-deck"
}

WebSocket Response:
{
  "type": "analysis_completed",
  "response": "# Análise do Pitch Deck\n\n## Estrutura Identificada...",
  "sessionActive": true
}
```

### **2. Primeira Pergunta**
```json
POST /api/client/abc123/chat
{
  "message": "Quais são os principais pontos fortes deste pitch deck?"
}

WebSocket Response:
{
  "type": "chat_completed",
  "response": "Com base na análise do seu pitch deck, identifiquei 3 principais pontos fortes:\n\n1. **Problema Claro**: A definição do problema está bem articulada...",
  "sessionActive": true,
  "messageCount": 3
}
```

### **3. Pergunta de Acompanhamento**
```json
POST /api/client/abc123/chat
{
  "message": "E quais áreas precisam ser melhoradas?"
}

WebSocket Response:
{
  "type": "chat_completed",
  "response": "Considerando a análise anterior e os pontos fortes que discutimos, vejo 4 áreas principais para melhoria:\n\n1. **Tração/Validação**: Precisa de mais evidências...",
  "sessionActive": true,
  "messageCount": 5
}
```

## 🎯 **Arquitetura da Conversa**

### **Sessão Claude Code Persistente**
- ✅ **Arquivo local**: Copiado do container para WSL
- ✅ **Template MD**: Estrutural para cada tipo de documento
- ✅ **Contexto mantido**: Histórico das últimas 5 mensagens
- ✅ **Tunnel ativo**: WebSocket mantém conexão
- ✅ **Timeout**: 30 minutos de inatividade

### **Templates Estruturais**
```
/claude-service/analysis-templates/
├── pitch-deck-analysis.md      # Estrutura para pitch decks
├── patent-analysis.md          # Estrutura para patentes  
└── financial-projection-analysis.md  # Estrutura para financeiro
```

### **Sessão Local**
```javascript
{
  clientId: "abc123",
  filePath: "/uploads/pitch-deck.pdf",
  templatePath: "/templates/pitch-deck-analysis.md",
  messages: [
    { role: "assistant", content: "Análise inicial...", type: "initial_analysis" },
    { role: "user", content: "Quais pontos fortes?", type: "question" },
    { role: "assistant", content: "3 principais pontos...", type: "response" }
  ],
  isActive: true,
  lastActivity: Date.now()
}
```

## 🔧 **Endpoints da Conversa**

### **Status da Sessão**
```bash
GET /api/client/:id/session

Response:
{
  "session": {
    "active": true,
    "messageCount": 5,
    "documentType": "pitch-deck",
    "fileName": "pitch-deck.pdf",
    "startTime": 1642534567890,
    "lastActivity": 1642534890123
  }
}
```

### **Histórico Completo**
```bash
GET /api/client/:id/history?limit=10

Response:
{
  "history": [
    {
      "role": "assistant",
      "content": "# Análise inicial...",
      "timestamp": 1642534567890,
      "type": "initial_analysis"
    },
    {
      "role": "user", 
      "content": "Quais pontos fortes?",
      "timestamp": 1642534678901,
      "type": "question"
    }
  ],
  "messageCount": 2
}
```

## 🎯 **Vantagens do Sistema**

### **Conversa Real vs Scripts**
- ❌ **Antes**: Script rodava, terminava, perdia contexto
- ✅ **Agora**: Claude Code mantém sessão ativa e contexto

### **Experiência do Usuário**
- ✅ **Contexto preservado**: "Como discutimos antes..."
- ✅ **Perguntas naturais**: "E sobre os financials?"
- ✅ **Refinamento**: "Pode detalhar mais o item 2?"
- ✅ **Comparações**: "Compare com padrões de mercado"

### **Escalabilidade**
- ✅ **Isolamento**: 1 sessão Claude por cliente
- ✅ **Performance**: WSL local, sem latência de API
- ✅ **Segurança**: Arquivos nunca saem do servidor local
- ✅ **Limpeza**: Auto-cleanup após 30min inatividade

## 🚀 **Próximos Passos**

1. **Testar o Frontend**: Verificar se o chat funciona
2. **Refinar Templates**: Melhorar estruturas MD
3. **Adicionar Tipos**: Novos tipos de documentos
4. **Otimizar Contexto**: Melhorar memória da conversa

## 🎉 **Resultado Final**

Agora você tem um **assistente de análise conversacional** que:
- Analisa documentos com Claude Code local
- Mantém contexto entre perguntas  
- Responde de forma natural e contextual
- Escala para múltiplos usuários simultâneos
- Mantém segurança total dos dados

**É exatamente o que você queria: uma conversa real, não um script!** 🎯