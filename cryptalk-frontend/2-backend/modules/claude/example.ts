/**
 * Exemplo de uso do módulo Claude AI
 * Demonstra como usar o serviço modular em uma aplicação real
 */

import { 
  createClaudeService, 
  validateClaudeEnvironment,
  ClaudeService 
} from './index';

// Configuração da aplicação
const appConfig = {
  claudeCommand: 'claude',
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY,
  workingDirectory: process.cwd(),
  tempDirectory: '/tmp',
  sessionTimeout: 30 * 60 * 1000,     // 30 minutos
  analysisTimeout: 5 * 60 * 1000,     // 5 minutos
  maxConcurrentAnalyses: 3,
  maxFileSize: 50 * 1024 * 1024,      // 50MB
  allowedExtensions: ['.pdf', '.docx', '.txt', '.md', '.pptx']
};

class ClaudeApplicationService {
  private claudeService: ClaudeService | null = null;
  private isInitialized = false;

  /**
   * Inicializar o serviço Claude
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔍 Validating Claude environment...');
      
      // Validar ambiente primeiro
      const envValidation = await validateClaudeEnvironment({
        claudeCommand: appConfig.claudeCommand,
        apiKey: appConfig.apiKey,
        workingDirectory: appConfig.workingDirectory
      });

      if (!envValidation.isValid) {
        console.error('❌ Environment validation failed:');
        envValidation.issues.forEach(issue => console.error(`  - ${issue}`));
        throw new Error('Claude environment is not properly configured');
      }

      console.log('✅ Environment validation passed');
      console.log(`📊 Claude CLI version: ${envValidation.cliVersion}`);

      // Criar serviço Claude
      this.claudeService = createClaudeService(appConfig);

      // Configurar event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      console.log('🚀 Claude service initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize Claude service:', error);
      throw error;
    }
  }

  /**
   * Configurar listeners de eventos
   */
  private setupEventListeners(): void {
    if (!this.claudeService) return;

    // Eventos de sessão
    this.claudeService.on('session_created', (session) => {
      console.log(`📝 Session created: ${session.sessionId} for client ${session.clientId}`);
    });

    this.claudeService.on('session_expired', (clientId) => {
      console.log(`⏰ Session expired for client: ${clientId}`);
      // Aqui você poderia notificar o cliente via WebSocket, etc.
    });

    // Eventos de análise
    this.claudeService.on('analysis_started', (data) => {
      console.log(`🔬 Analysis started: ${data.analysisId} for client ${data.clientId}`);
    });

    this.claudeService.on('analysis_progress', (data) => {
      console.log(`📈 Analysis progress: ${data.analysisId} - ${data.progress}%`);
      
      // Emitir progresso via WebSocket para frontend
      // this.websocketService.emit(`analysis_progress_${data.analysisId}`, {
      //   progress: data.progress,
      //   chunk: data.chunk
      // });
    });

    this.claudeService.on('analysis_completed', (data) => {
      console.log(`✅ Analysis completed: ${data.analysisId}`);
      
      // Notificar frontend sobre conclusão
      // this.websocketService.emit(`analysis_completed_${data.analysisId}`, data.result);
    });

    // Eventos de erro
    this.claudeService.on('error', (error) => {
      console.error('💥 Claude service error:', error);
      
      // Log erro em sistema de monitoramento
      // this.errorLogger.log('claude_service_error', error);
    });
  }

  /**
   * Analisar documento
   */
  async analyzeDocument(
    clientId: string,
    filePath: string,
    documentType: 'pitch-deck' | 'patent' | 'financial' | 'tech-doc' | 'legal-doc',
    options?: {
      depth?: 'basic' | 'detailed' | 'comprehensive';
      format?: 'json' | 'markdown' | 'html';
      language?: string;
    }
  ): Promise<{ analysisId: string; initialResult?: any }> {
    if (!this.isInitialized || !this.claudeService) {
      throw new Error('Claude service not initialized');
    }

    try {
      // Criar sessão se não existir
      let session = await this.claudeService.getSessionStatus(clientId);
      if (!session) {
        console.log(`📝 Creating new session for client: ${clientId}`);
        session = await this.claudeService.createSession(clientId, {
          documentType,
          sessionTimeout: appConfig.sessionTimeout
        });
      }

      // Atualizar sessão com novo documento
      if (session.filePath !== filePath || session.documentType !== documentType) {
        console.log(`📄 Updating session document: ${filePath}`);
        // Note: SessionManager precisa ter método updateDocument público
        // await this.claudeService.sessionManager.updateDocument(clientId, filePath, documentType);
      }

      // Iniciar análise
      console.log(`🔍 Starting analysis for ${documentType}: ${filePath}`);
      const analysis = await this.claudeService.analyzeDocument({
        clientId,
        filePath,
        documentType,
        options: {
          depth: 'comprehensive',
          format: 'json',
          language: 'pt-BR',
          ...options
        }
      });

      return {
        analysisId: analysis.analysisId
      };

    } catch (error) {
      console.error(`❌ Failed to analyze document for client ${clientId}:`, error);
      throw error;
    }
  }

  /**
   * Continuar conversa sobre documento
   */
  async continueConversation(
    clientId: string,
    message: string,
    context?: any
  ): Promise<{ response: string; messageId: string }> {
    if (!this.isInitialized || !this.claudeService) {
      throw new Error('Claude service not initialized');
    }

    try {
      console.log(`💬 Processing message from client ${clientId}: "${message.substring(0, 50)}..."`);

      const response = await this.claudeService.sendMessage(clientId, message, context);

      console.log(`✅ Response generated for client ${clientId}`);

      return {
        response: response.content,
        messageId: response.id
      };

    } catch (error) {
      console.error(`❌ Failed to process message for client ${clientId}:`, error);
      throw error;
    }
  }

  /**
   * Obter status de análise
   */
  async getAnalysisStatus(analysisId: string): Promise<any> {
    if (!this.claudeService) {
      throw new Error('Claude service not initialized');
    }

    return this.claudeService.getAnalysisStatus(analysisId);
  }

  /**
   * Obter histórico de conversa
   */
  async getConversationHistory(clientId: string, limit = 10): Promise<any[]> {
    if (!this.claudeService) {
      throw new Error('Claude service not initialized');
    }

    return this.claudeService.getConversationHistory(clientId, limit);
  }

  /**
   * Encerrar sessão
   */
  async endSession(clientId: string): Promise<void> {
    if (!this.claudeService) {
      throw new Error('Claude service not initialized');
    }

    console.log(`🔚 Ending session for client: ${clientId}`);
    await this.claudeService.endSession(clientId);
  }

  /**
   * Obter métricas do serviço
   */
  async getMetrics(): Promise<any> {
    if (!this.claudeService) {
      throw new Error('Claude service not initialized');
    }

    return this.claudeService.getMetrics();
  }

  /**
   * Obter status de saúde
   */
  async getHealthStatus(): Promise<any> {
    if (!this.claudeService) {
      return {
        status: 'unhealthy',
        details: { error: 'Service not initialized' }
      };
    }

    return this.claudeService.getHealthStatus();
  }

  /**
   * Finalizar serviço gracefully
   */
  async shutdown(): Promise<void> {
    if (this.claudeService) {
      console.log('🛑 Shutting down Claude service...');
      await this.claudeService.shutdown();
      this.claudeService = null;
      this.isInitialized = false;
      console.log('✅ Claude service shutdown completed');
    }
  }
}

// Exemplo de uso em uma aplicação Express
export class ClaudeAPIController {
  private claudeApp: ClaudeApplicationService;

  constructor() {
    this.claudeApp = new ClaudeApplicationService();
  }

  /**
   * Inicializar controlador
   */
  async initialize(): Promise<void> {
    await this.claudeApp.initialize();
  }

  /**
   * POST /api/claude/analyze
   * Iniciar análise de documento
   */
  async analyzeDocument(req: any, res: any): Promise<void> {
    try {
      const { clientId, filePath, documentType, options } = req.body;

      if (!clientId || !filePath || !documentType) {
        return res.status(400).json({
          error: 'Missing required fields: clientId, filePath, documentType'
        });
      }

      const result = await this.claudeApp.analyzeDocument(
        clientId,
        filePath,
        documentType,
        options
      );

      res.json({
        success: true,
        analysisId: result.analysisId,
        message: 'Analysis started successfully'
      });

    } catch (error) {
      console.error('API Error - analyzeDocument:', error);
      res.status(500).json({
        error: 'Failed to start analysis',
        details: (error as Error).message
      });
    }
  }

  /**
   * POST /api/claude/conversation
   * Continuar conversa
   */
  async continueConversation(req: any, res: any): Promise<void> {
    try {
      const { clientId, message, context } = req.body;

      if (!clientId || !message) {
        return res.status(400).json({
          error: 'Missing required fields: clientId, message'
        });
      }

      const result = await this.claudeApp.continueConversation(
        clientId,
        message,
        context
      );

      res.json({
        success: true,
        response: result.response,
        messageId: result.messageId
      });

    } catch (error) {
      console.error('API Error - continueConversation:', error);
      res.status(500).json({
        error: 'Failed to process message',
        details: (error as Error).message
      });
    }
  }

  /**
   * GET /api/claude/analysis/:analysisId
   * Obter status de análise
   */
  async getAnalysisStatus(req: any, res: any): Promise<void> {
    try {
      const { analysisId } = req.params;
      const status = await this.claudeApp.getAnalysisStatus(analysisId);

      res.json({
        success: true,
        status
      });

    } catch (error) {
      console.error('API Error - getAnalysisStatus:', error);
      res.status(404).json({
        error: 'Analysis not found',
        details: (error as Error).message
      });
    }
  }

  /**
   * GET /api/claude/conversation/:clientId
   * Obter histórico de conversa
   */
  async getConversationHistory(req: any, res: any): Promise<void> {
    try {
      const { clientId } = req.params;
      const { limit = 10 } = req.query;

      const history = await this.claudeApp.getConversationHistory(
        clientId,
        parseInt(limit as string, 10)
      );

      res.json({
        success: true,
        history
      });

    } catch (error) {
      console.error('API Error - getConversationHistory:', error);
      res.status(500).json({
        error: 'Failed to get conversation history',
        details: (error as Error).message
      });
    }
  }

  /**
   * DELETE /api/claude/session/:clientId
   * Encerrar sessão
   */
  async endSession(req: any, res: any): Promise<void> {
    try {
      const { clientId } = req.params;
      await this.claudeApp.endSession(clientId);

      res.json({
        success: true,
        message: 'Session ended successfully'
      });

    } catch (error) {
      console.error('API Error - endSession:', error);
      res.status(500).json({
        error: 'Failed to end session',
        details: (error as Error).message
      });
    }
  }

  /**
   * GET /api/claude/metrics
   * Obter métricas do serviço
   */
  async getMetrics(req: any, res: any): Promise<void> {
    try {
      const metrics = await this.claudeApp.getMetrics();

      res.json({
        success: true,
        metrics
      });

    } catch (error) {
      console.error('API Error - getMetrics:', error);
      res.status(500).json({
        error: 'Failed to get metrics',
        details: (error as Error).message
      });
    }
  }

  /**
   * GET /api/claude/health
   * Verificar saúde do serviço
   */
  async getHealth(req: any, res: any): Promise<void> {
    try {
      const health = await this.claudeApp.getHealthStatus();

      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;

      res.status(statusCode).json({
        success: health.status !== 'unhealthy',
        health
      });

    } catch (error) {
      console.error('API Error - getHealth:', error);
      res.status(503).json({
        success: false,
        health: {
          status: 'unhealthy',
          details: { error: (error as Error).message }
        }
      });
    }
  }

  /**
   * Finalizar controlador
   */
  async shutdown(): Promise<void> {
    await this.claudeApp.shutdown();
  }
}

// Exemplo de setup de shutdown graceful
function setupGracefulShutdown(claudeController: ClaudeAPIController): void {
  const shutdown = async (signal: string) => {
    console.log(`\n📡 Received ${signal}. Starting graceful shutdown...`);
    
    try {
      await claudeController.shutdown();
      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  
  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    console.error('💥 Uncaught Exception:', error);
    await claudeController.shutdown();
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    await claudeController.shutdown();
    process.exit(1);
  });
}

// Exportar para uso
export {
  ClaudeApplicationService,
  setupGracefulShutdown
};

// Exemplo de inicialização completa
export async function createClaudeApp(): Promise<ClaudeAPIController> {
  const controller = new ClaudeAPIController();
  await controller.initialize();
  setupGracefulShutdown(controller);
  return controller;
}