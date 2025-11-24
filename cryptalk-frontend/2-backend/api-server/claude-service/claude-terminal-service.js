/**
 * Claude Terminal Service
 * Serviço dedicado para comunicação com Claude Code no terminal WSL
 * Responsabilidade única: Bridge entre backend e seu Claude Code terminal
 */

const net = require('net');
const EventEmitter = require('events');

class ClaudeTerminalService extends EventEmitter {
  constructor() {
    super();
    this.terminalPort = 8888;
    this.terminalHost = 'localhost';
    this.conversations = new Map(); // clientId -> conversa
    this.isTerminalReady = false;
    
    this.checkTerminalConnection();
  }

  /**
   * Verifica se Claude Code terminal está disponível
   */
  async checkTerminalConnection() {
    try {
      await this.pingTerminal();
      this.isTerminalReady = true;
      console.log('✅ Claude Code terminal conectado');
    } catch (error) {
      this.isTerminalReady = false;
      console.log('❌ Claude Code terminal não disponível');
      console.log('💡 Execute: node terminal-listener.js no WSL');
    }
  }

  /**
   * Ping para testar conexão
   */
  async pingTerminal() {
    return new Promise((resolve, reject) => {
      const client = net.createConnection(this.terminalPort, this.terminalHost);
      
      client.on('connect', () => {
        client.write('ping');
        client.end();
        resolve(true);
      });
      
      client.on('error', reject);
      
      setTimeout(() => {
        client.destroy();
        reject(new Error('Terminal timeout'));
      }, 3000);
    });
  }

  /**
   * Inicia análise de documento com Claude Code
   */
  async startDocumentAnalysis(clientId, filePath, documentType) {
    if (!this.isTerminalReady) {
      throw new Error('Claude Code terminal não está disponível');
    }

    const conversation = {
      id: clientId,
      filePath,
      documentType,
      messages: [],
      startTime: Date.now(),
      lastActivity: Date.now()
    };

    // Comando inicial para análise
    const initialPrompt = this.buildAnalysisPrompt(filePath, documentType);
    const response = await this.sendToTerminal(initialPrompt);

    // Salvar conversa
    conversation.messages.push({
      role: 'system',
      content: initialPrompt,
      timestamp: Date.now()
    });

    conversation.messages.push({
      role: 'assistant', 
      content: response,
      timestamp: Date.now()
    });

    this.conversations.set(clientId, conversation);

    return {
      success: true,
      analysisResult: response,
      conversationId: clientId
    };
  }

  /**
   * Continua conversa sobre documento
   */
  async continueConversation(clientId, userQuestion) {
    const conversation = this.conversations.get(clientId);
    
    if (!conversation) {
      throw new Error('Conversa não encontrada. Faça upload do documento novamente.');
    }

    // Construir contexto da conversa
    const contextualPrompt = this.buildConversationPrompt(conversation, userQuestion);
    const response = await this.sendToTerminal(contextualPrompt);

    // Adicionar ao histórico
    conversation.messages.push({
      role: 'user',
      content: userQuestion,
      timestamp: Date.now()
    });

    conversation.messages.push({
      role: 'assistant',
      content: response, 
      timestamp: Date.now()
    });

    conversation.lastActivity = Date.now();

    return {
      success: true,
      response: response,
      conversationId: clientId
    };
  }

  /**
   * Envia comando para Claude Code terminal
   */
  async sendToTerminal(prompt) {
    return new Promise((resolve, reject) => {
      const client = net.createConnection(this.terminalPort, this.terminalHost);
      let response = '';

      client.on('connect', () => {
        console.log('📡 Enviando para Claude Code terminal...');
        client.write(JSON.stringify({
          type: 'analyze',
          prompt: prompt,
          timestamp: Date.now()
        }));
      });

      client.on('data', (data) => {
        response += data.toString();
      });

      client.on('end', () => {
        try {
          const parsed = JSON.parse(response);
          resolve(parsed.response || response);
        } catch {
          resolve(response); // Se não for JSON, retorna texto puro
        }
      });

      client.on('error', (error) => {
        console.error('❌ Erro comunicação terminal:', error);
        reject(new Error('Falha na comunicação com Claude Code terminal'));
      });

      // Timeout de 60 segundos para análises
      setTimeout(() => {
        client.destroy();
        reject(new Error('Timeout na análise (60s)'));
      }, 60000);
    });
  }

  /**
   * Constrói prompt inicial para análise
   */
  buildAnalysisPrompt(filePath, documentType) {
    const templates = {
      'pitch-deck': `
        Analise o pitch deck localizado em: ${filePath}
        
        Por favor, forneça uma análise estruturada abordando:
        1. Resumo Executivo
        2. Problema e Solução
        3. Mercado e Oportunidade
        4. Modelo de Negócio
        5. Equipe
        6. Tração e Validação
        7. Estratégia de Marketing
        8. Finanças e Projeções
        9. Riscos e Mitigação
        10. Próximos Passos
        
        Seja detalhado e forneça insights específicos sobre cada seção.
      `,
      'financial': `
        Analise o documento financeiro em: ${filePath}
        
        Foque em:
        - Análise de receitas e despesas
        - Fluxo de caixa
        - Indicadores financeiros
        - Projeções e cenários
        - Recomendações
      `,
      'legal': `
        Analise o documento legal em: ${filePath}
        
        Avalie:
        - Estrutura do documento
        - Cláusulas importantes
        - Riscos legais
        - Recomendações
      `
    };

    return templates[documentType] || `Analise o documento em: ${filePath}`;
  }

  /**
   * Constrói prompt contextual para conversa
   */
  buildConversationPrompt(conversation, userQuestion) {
    const context = `
Contexto da conversa:
- Arquivo analisado: ${conversation.filePath}
- Tipo: ${conversation.documentType}

Histórico recente:
${conversation.messages.slice(-4).map(msg => 
  `${msg.role}: ${msg.content.substring(0, 200)}...`
).join('\n')}

Nova pergunta do usuário: ${userQuestion}

Responda de forma contextual, considerando o documento analisado e a conversa anterior.
`;

    return context;
  }

  /**
   * Encerra conversa e limpa recursos
   */
  endConversation(clientId) {
    if (this.conversations.has(clientId)) {
      this.conversations.delete(clientId);
      console.log(`🧹 Conversa ${clientId} encerrada`);
      return true;
    }
    return false;
  }

  /**
   * Status do serviço
   */
  getStatus() {
    return {
      terminalReady: this.isTerminalReady,
      activeConversations: this.conversations.size,
      conversations: Array.from(this.conversations.keys())
    };
  }
}

module.exports = ClaudeTerminalService;