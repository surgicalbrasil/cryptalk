const { spawn } = require('child_process');
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');

/**
 * Gerenciador de Conversas Claude Code
 * Mantém sessões ativas para conversa contínua
 */
class ClaudeConversationManager extends EventEmitter {
  constructor() {
    super();
    this.activeSessions = new Map(); // clientId -> session
    this.sessionTimeouts = new Map();
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutos
  }

  /**
   * Inicia uma nova sessão Claude Code para análise de documento
   */
  async startDocumentAnalysis(clientId, filePath, documentType, templatePath) {
    try {
      console.log(`🎯 Iniciando sessão Claude Code para cliente: ${clientId}`);
      
      // Limpar sessão anterior se existir
      if (this.activeSessions.has(clientId)) {
        await this.endSession(clientId);
      }

      // Preparar contexto inicial
      const initialContext = this.buildInitialContext(filePath, documentType, templatePath);
      
      // Criar sessão Claude Code
      const session = {
        clientId,
        filePath,
        documentType,
        templatePath,
        context: initialContext,
        messages: [],
        isActive: true,
        startTime: Date.now(),
        lastActivity: Date.now()
      };

      // Executar análise inicial
      const analysisResult = await this.runClaudeAnalysis(session, initialContext);
      
      // Salvar sessão
      this.activeSessions.set(clientId, session);
      this.setupSessionTimeout(clientId);

      // Adicionar resultado inicial ao histórico
      session.messages.push({
        role: 'assistant',
        content: analysisResult,
        timestamp: Date.now(),
        type: 'initial_analysis'
      });

      console.log(`✅ Sessão Claude Code criada para cliente: ${clientId}`);
      
      return {
        success: true,
        sessionId: clientId,
        initialAnalysis: analysisResult,
        message: 'Análise inicial concluída. Você pode fazer perguntas sobre o documento.'
      };

    } catch (error) {
      console.error(`❌ Erro ao iniciar sessão Claude Code:`, error);
      throw error;
    }
  }

  /**
   * Continua conversa em sessão existente
   */
  async continueConversation(clientId, userMessage) {
    try {
      const session = this.activeSessions.get(clientId);
      if (!session || !session.isActive) {
        throw new Error('Sessão não encontrada ou expirada. Faça upload do documento novamente.');
      }

      console.log(`💬 Continuando conversa para cliente: ${clientId}`);
      
      // Atualizar última atividade
      session.lastActivity = Date.now();
      this.resetSessionTimeout(clientId);

      // Adicionar mensagem do usuário
      session.messages.push({
        role: 'user',
        content: userMessage,
        timestamp: Date.now(),
        type: 'question'
      });

      // Construir contexto da conversa
      const conversationContext = this.buildConversationContext(session, userMessage);
      
      // Executar Claude Code com contexto da conversa
      const response = await this.runClaudeAnalysis(session, conversationContext);

      // Adicionar resposta ao histórico
      session.messages.push({
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
        type: 'response'
      });

      console.log(`✅ Resposta gerada para cliente: ${clientId}`);

      return {
        success: true,
        response: response,
        sessionActive: true,
        messageCount: session.messages.length
      };

    } catch (error) {
      console.error(`❌ Erro na conversa:`, error);
      throw error;
    }
  }

  /**
   * Constrói contexto inicial para análise
   */
  buildInitialContext(filePath, documentType, templatePath) {
    const template = fs.readFileSync(templatePath, 'utf8');
    
    return `# Análise de Documento - ${documentType.toUpperCase()}

## Arquivo para Análise
**Arquivo:** ${path.basename(filePath)}
**Tipo:** ${documentType}
**Localização:** ${filePath}

## Template de Análise
${template}

## Instruções
1. Analise o documento seguindo o template estrutural
2. Forneça uma análise completa e detalhada
3. Mantenha o contexto para perguntas posteriores
4. Use linguagem clara e objetiva
5. Destaque pontos fortes e áreas de melhoria

Análise o documento agora:`;
  }

  /**
   * Constrói contexto da conversa para perguntas subsequentes
   */
  buildConversationContext(session, userMessage) {
    // Últimas 5 mensagens para manter contexto
    const recentMessages = session.messages.slice(-5);
    
    let context = `# Conversa sobre Análise de Documento

## Documento Analisado
**Arquivo:** ${path.basename(session.filePath)}
**Tipo:** ${session.documentType}

## Histórico da Conversa
`;

    recentMessages.forEach(msg => {
      const role = msg.role === 'user' ? 'USUÁRIO' : 'ASSISTENTE';
      context += `\n### ${role}:\n${msg.content}\n`;
    });

    context += `\n### NOVA PERGUNTA DO USUÁRIO:\n${userMessage}

## Instruções
- Responda baseado no documento analisado e no contexto da conversa
- Mantenha consistência com análises anteriores
- Use informações específicas do documento
- Seja claro e direto na resposta

Responda à pergunta:`;

    return context;
  }

  /**
   * Executa Claude Code com contexto fornecido
   */
  async runClaudeAnalysis(session, context) {
    return new Promise((resolve, reject) => {
      console.log(`🤖 Executando Claude Code...`);
      
      // Salvar contexto em arquivo temporário
      const contextFile = `/tmp/claude-context-${session.clientId}.md`;
      fs.writeFileSync(contextFile, context);

      // Executar Claude Code
      const claude = spawn('claude', [contextFile], {
        cwd: '/home/surgical',
        env: process.env
      });

      let output = '';
      let errorOutput = '';

      claude.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        
        // Emitir progresso em tempo real
        this.emit('progress', {
          clientId: session.clientId,
          chunk: chunk,
          type: 'analysis_progress'
        });
      });

      claude.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      claude.on('close', (code) => {
        // Limpar arquivo temporário
        try {
          fs.unlinkSync(contextFile);
        } catch (error) {
          console.warn('Erro ao limpar arquivo temporário:', error.message);
        }

        if (code === 0) {
          console.log(`✅ Claude Code executado com sucesso`);
          resolve(output);
        } else {
          console.error(`❌ Claude Code falhou com código: ${code}`);
          console.error(`Erro: ${errorOutput}`);
          reject(new Error(`Claude Code falhou: ${errorOutput}`));
        }
      });

      claude.on('error', (error) => {
        console.error(`❌ Erro ao executar Claude Code:`, error);
        reject(error);
      });
    });
  }

  /**
   * Configura timeout da sessão
   */
  setupSessionTimeout(clientId) {
    const timeoutId = setTimeout(() => {
      console.log(`⏰ Sessão expirada para cliente: ${clientId}`);
      this.endSession(clientId);
    }, this.sessionTimeout);

    this.sessionTimeouts.set(clientId, timeoutId);
  }

  /**
   * Reseta timeout da sessão
   */
  resetSessionTimeout(clientId) {
    const existingTimeout = this.sessionTimeouts.get(clientId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    this.setupSessionTimeout(clientId);
  }

  /**
   * Encerra sessão
   */
  async endSession(clientId) {
    const session = this.activeSessions.get(clientId);
    if (session) {
      session.isActive = false;
      this.activeSessions.delete(clientId);
    }

    const timeout = this.sessionTimeouts.get(clientId);
    if (timeout) {
      clearTimeout(timeout);
      this.sessionTimeouts.delete(clientId);
    }

    console.log(`🔚 Sessão encerrada para cliente: ${clientId}`);
  }

  /**
   * Obtém status da sessão
   */
  getSessionStatus(clientId) {
    const session = this.activeSessions.get(clientId);
    if (!session) {
      return { active: false, message: 'Sessão não encontrada' };
    }

    return {
      active: session.isActive,
      messageCount: session.messages.length,
      startTime: session.startTime,
      lastActivity: session.lastActivity,
      documentType: session.documentType,
      fileName: path.basename(session.filePath)
    };
  }

  /**
   * Obtém histórico da conversa
   */
  getConversationHistory(clientId, limit = 10) {
    const session = this.activeSessions.get(clientId);
    if (!session) {
      return [];
    }

    return session.messages.slice(-limit);
  }
}

module.exports = ClaudeConversationManager;