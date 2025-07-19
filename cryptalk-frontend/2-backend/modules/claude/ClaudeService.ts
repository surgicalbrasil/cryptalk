/**
 * Claude Service - Implementação principal
 * Serviço modular para integração com Claude AI
 * Zero acoplamento, event-driven, TypeScript strict
 */

import { EventEmitter } from 'events';
import { 
  IClaudeService, 
  SessionConfig, 
  SessionInfo, 
  AnalysisRequest, 
  AnalysisResult, 
  Message, 
  ConversationContext 
} from '../../core/interfaces/IClaudeService';
import { SessionManager } from './SessionManager';
import { AnalysisEngine } from './AnalysisEngine';

export interface ClaudeServiceConfig {
  sessionTimeout?: number;
  analysisTimeout?: number;
  maxConcurrentAnalyses?: number;
  claudeCommand?: string;
  tempDirectory?: string;
}

export interface ClaudeEnvironment {
  apiKey?: string;
  claudeCommand: string;
  workingDirectory: string;
}

export class ClaudeService extends EventEmitter implements IClaudeService {
  private sessionManager: SessionManager;
  private analysisEngine: AnalysisEngine;
  private config: ClaudeServiceConfig;
  private environment: ClaudeEnvironment;
  private activeAnalyses = new Map<string, AnalysisResult>();
  private metrics = {
    totalSessions: 0,
    totalAnalyses: 0,
    totalResponseTime: 0,
    errorCount: 0
  };

  constructor(
    config: ClaudeServiceConfig = {},
    environment: ClaudeEnvironment
  ) {
    super();
    this.config = {
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      analysisTimeout: 5 * 60 * 1000,  // 5 minutes
      maxConcurrentAnalyses: 3,
      claudeCommand: 'claude',
      tempDirectory: '/tmp',
      ...config
    };
    this.environment = environment;

    // Initialize components
    this.sessionManager = new SessionManager({
      sessionTimeout: this.config.sessionTimeout!,
      maxMessageHistory: 50
    });

    this.analysisEngine = new AnalysisEngine({
      claudeCommand: this.config.claudeCommand!,
      analysisTimeout: this.config.analysisTimeout!,
      tempDirectory: this.config.tempDirectory!,
      environment: this.environment
    });

    // Set up event forwarding
    this.setupEventForwarding();
  }

  /**
   * Set up event forwarding from components
   */
  private setupEventForwarding(): void {
    // Forward session events
    this.sessionManager.on('session_created', (session: SessionInfo) => {
      this.metrics.totalSessions++;
      this.emit('session_created', session);
    });

    this.sessionManager.on('session_expired', (clientId: string) => {
      this.emit('session_expired', clientId);
    });

    // Forward analysis events
    this.analysisEngine.on('analysis_started', (data: { analysisId: string; clientId: string }) => {
      this.emit('analysis_started', data);
    });

    this.analysisEngine.on('analysis_progress', (data: { analysisId: string; progress: number; chunk?: string }) => {
      const analysis = this.activeAnalyses.get(data.analysisId);
      if (analysis) {
        analysis.progress = data.progress;
        this.activeAnalyses.set(data.analysisId, analysis);
      }
      this.emit('analysis_progress', data);
    });

    this.analysisEngine.on('analysis_completed', (data: { analysisId: string; result: any }) => {
      const analysis = this.activeAnalyses.get(data.analysisId);
      if (analysis) {
        analysis.status = 'completed';
        analysis.result = data.result;
        analysis.progress = 100;
        analysis.completedAt = new Date();
        this.activeAnalyses.set(data.analysisId, analysis);
        this.metrics.totalAnalyses++;
      }
      this.emit('analysis_completed', data);
    });

    this.analysisEngine.on('analysis_error', (data: { analysisId: string; error: string }) => {
      const analysis = this.activeAnalyses.get(data.analysisId);
      if (analysis) {
        analysis.status = 'failed';
        analysis.error = data.error;
        this.activeAnalyses.set(data.analysisId, analysis);
        this.metrics.errorCount++;
      }
      this.emit('error', { type: 'analysis_error', ...data });
    });
  }

  // Session Management
  async createSession(clientId: string, config?: SessionConfig): Promise<SessionInfo> {
    try {
      const sessionConfig = {
        sessionTimeout: this.config.sessionTimeout,
        analysisTimeout: this.config.analysisTimeout,
        maxMessageHistory: 50,
        ...config
      };

      const session = await this.sessionManager.createSession(clientId, sessionConfig);
      return session;
    } catch (error) {
      this.emit('error', { type: 'session_error', clientId, error: (error as Error).message });
      throw error;
    }
  }

  async endSession(clientId: string): Promise<void> {
    try {
      await this.sessionManager.endSession(clientId);
    } catch (error) {
      this.emit('error', { type: 'session_error', clientId, error: (error as Error).message });
      throw error;
    }
  }

  async getSessionStatus(clientId: string): Promise<SessionInfo | null> {
    return this.sessionManager.getSessionStatus(clientId);
  }

  async renewSession(clientId: string): Promise<void> {
    try {
      await this.sessionManager.renewSession(clientId);
    } catch (error) {
      this.emit('error', { type: 'session_error', clientId, error: (error as Error).message });
      throw error;
    }
  }

  // Document Analysis
  async analyzeDocument(request: AnalysisRequest): Promise<AnalysisResult> {
    try {
      // Check concurrent analysis limit
      const activeCount = Array.from(this.activeAnalyses.values())
        .filter(a => a.status === 'processing').length;
      
      if (activeCount >= this.config.maxConcurrentAnalyses!) {
        throw new Error('Maximum concurrent analyses limit reached');
      }

      // Generate analysis ID
      const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create analysis result object
      const analysisResult: AnalysisResult = {
        analysisId,
        clientId: request.clientId,
        status: 'pending',
        progress: 0,
        startedAt: new Date()
      };

      this.activeAnalyses.set(analysisId, analysisResult);

      // Start analysis asynchronously
      this.performAnalysis(analysisId, request).catch(error => {
        const analysis = this.activeAnalyses.get(analysisId);
        if (analysis) {
          analysis.status = 'failed';
          analysis.error = error.message;
          this.activeAnalyses.set(analysisId, analysis);
        }
        this.emit('error', { type: 'analysis_error', analysisId, error: error.message });
      });

      return analysisResult;
    } catch (error) {
      this.emit('error', { type: 'analysis_error', error: (error as Error).message });
      throw error;
    }
  }

  private async performAnalysis(analysisId: string, request: AnalysisRequest): Promise<void> {
    const analysis = this.activeAnalyses.get(analysisId);
    if (!analysis) return;

    // Update status to processing
    analysis.status = 'processing';
    analysis.progress = 5;
    this.activeAnalyses.set(analysisId, analysis);
    this.emit('analysis_started', { analysisId, clientId: request.clientId });

    try {
      // Preprocess document
      analysis.progress = 10;
      this.activeAnalyses.set(analysisId, analysis);
      this.emit('analysis_progress', { analysisId, progress: 10 });

      const processedContent = await this.analysisEngine.preprocessDocument(
        request.filePath, 
        request.documentType
      );

      // Load template
      analysis.progress = 20;
      this.activeAnalyses.set(analysisId, analysis);
      this.emit('analysis_progress', { analysisId, progress: 20 });

      const template = await this.analysisEngine.loadTemplate(request.documentType);

      // Execute analysis
      analysis.progress = 30;
      this.activeAnalyses.set(analysisId, analysis);
      this.emit('analysis_progress', { analysisId, progress: 30 });

      const rawResult = await this.analysisEngine.executeAnalysis(processedContent, template);

      // Post-process result
      analysis.progress = 80;
      this.activeAnalyses.set(analysisId, analysis);
      this.emit('analysis_progress', { analysisId, progress: 80 });

      const format = request.options?.format || 'json';
      const finalResult = await this.analysisEngine.postprocessResult(rawResult, format);

      // Complete analysis
      analysis.status = 'completed';
      analysis.progress = 100;
      analysis.result = {
        summary: finalResult.summary || 'Analysis completed',
        insights: finalResult.insights || [],
        recommendations: finalResult.recommendations || [],
        metadata: {
          documentType: request.documentType,
          format,
          processedAt: new Date().toISOString(),
          ...finalResult.metadata
        }
      };
      analysis.completedAt = new Date();
      this.activeAnalyses.set(analysisId, analysis);

      this.emit('analysis_completed', { analysisId, result: analysis.result });
    } catch (error) {
      analysis.status = 'failed';
      analysis.error = (error as Error).message;
      this.activeAnalyses.set(analysisId, analysis);
      throw error;
    }
  }

  async getAnalysisStatus(analysisId: string): Promise<AnalysisResult> {
    const analysis = this.activeAnalyses.get(analysisId);
    if (!analysis) {
      throw new Error('Analysis not found');
    }
    return { ...analysis };
  }

  async cancelAnalysis(analysisId: string): Promise<void> {
    const analysis = this.activeAnalyses.get(analysisId);
    if (!analysis) {
      throw new Error('Analysis not found');
    }

    if (analysis.status === 'processing') {
      analysis.status = 'failed';
      analysis.error = 'Analysis cancelled by user';
      this.activeAnalyses.set(analysisId, analysis);
      await this.analysisEngine.cancelAnalysis(analysisId);
    }
  }

  // Conversation
  async sendMessage(
    clientId: string, 
    message: string, 
    context?: Partial<ConversationContext>
  ): Promise<Message> {
    try {
      const session = await this.sessionManager.getSessionStatus(clientId);
      if (!session) {
        throw new Error('Session not found. Please start a new session.');
      }

      // Create user message
      const userMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'user',
        content: message,
        timestamp: new Date(),
        metadata: { context }
      };

      // Add to session history
      await this.sessionManager.addMessage(clientId, userMessage);

      // Build conversation context
      const conversationContext = await this.buildConversationContext(clientId, context);

      // Generate response using analysis engine
      const responseContent = await this.analysisEngine.generateResponse(
        message,
        conversationContext,
        session.filePath,
        session.documentType
      );

      // Create assistant message
      const assistantMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        metadata: { 
          conversationContext: !!context,
          sessionId: session.sessionId 
        }
      };

      // Add to session history
      await this.sessionManager.addMessage(clientId, assistantMessage);

      // Update session activity
      await this.sessionManager.updateActivity(clientId);

      return assistantMessage;
    } catch (error) {
      this.emit('error', { type: 'conversation_error', clientId, error: (error as Error).message });
      throw error;
    }
  }

  private async buildConversationContext(
    clientId: string, 
    context?: Partial<ConversationContext>
  ): Promise<ConversationContext> {
    const session = await this.sessionManager.getSessionStatus(clientId);
    if (!session) {
      throw new Error('Session not found');
    }

    const recentMessages = session.messages.slice(-10);

    return {
      documentSummary: context?.documentSummary || session.context,
      previousAnalysis: context?.previousAnalysis || '',
      userPreferences: context?.userPreferences || {},
      sessionHistory: recentMessages
    };
  }

  async getConversationHistory(clientId: string, limit = 10): Promise<Message[]> {
    const session = await this.sessionManager.getSessionStatus(clientId);
    if (!session) {
      return [];
    }
    return session.messages.slice(-limit);
  }

  async clearConversation(clientId: string): Promise<void> {
    try {
      await this.sessionManager.clearMessages(clientId);
    } catch (error) {
      this.emit('error', { type: 'conversation_error', clientId, error: (error as Error).message });
      throw error;
    }
  }

  // Configuration
  async updateConfiguration(config: Partial<SessionConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    await this.sessionManager.updateDefaultConfig(config);
  }

  async validateEnvironment(): Promise<{
    claudeAvailable: boolean;
    apiKeyValid: boolean;
    cliVersion?: string;
  }> {
    return this.analysisEngine.validateEnvironment();
  }

  async getCapabilities(): Promise<{
    supportedFormats: string[];
    maxFileSize: number;
    features: string[];
  }> {
    return this.analysisEngine.getCapabilities();
  }

  // Monitoring
  async getMetrics(): Promise<{
    activeSessions: number;
    totalAnalyses: number;
    averageResponseTime: number;
    errorRate: number;
  }> {
    const sessionMetrics = await this.sessionManager.getMetrics();
    const totalRequests = this.metrics.totalAnalyses + sessionMetrics.totalSessions;
    
    return {
      activeSessions: sessionMetrics.activeSessions,
      totalAnalyses: this.metrics.totalAnalyses,
      averageResponseTime: totalRequests > 0 ? this.metrics.totalResponseTime / totalRequests : 0,
      errorRate: totalRequests > 0 ? this.metrics.errorCount / totalRequests : 0
    };
  }

  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  }> {
    try {
      const envStatus = await this.validateEnvironment();
      const metrics = await this.getMetrics();
      const sessionHealth = await this.sessionManager.getHealthStatus();

      const isHealthy = envStatus.claudeAvailable && 
                       envStatus.apiKeyValid && 
                       metrics.errorRate < 0.1 &&
                       sessionHealth.status !== 'unhealthy';

      const isDegraded = !isHealthy && (
        envStatus.claudeAvailable && 
        metrics.errorRate < 0.3 &&
        sessionHealth.status !== 'unhealthy'
      );

      return {
        status: isHealthy ? 'healthy' : (isDegraded ? 'degraded' : 'unhealthy'),
        details: {
          environment: envStatus,
          metrics,
          sessionHealth,
          activeAnalyses: this.activeAnalyses.size,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: (error as Error).message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  // Cleanup
  async shutdown(): Promise<void> {
    // Cancel all active analyses
    for (const [analysisId] of this.activeAnalyses) {
      try {
        await this.cancelAnalysis(analysisId);
      } catch (error) {
        // Log but don't throw
        console.warn(`Failed to cancel analysis ${analysisId}:`, error);
      }
    }

    // Shutdown components
    await this.sessionManager.shutdown();
    await this.analysisEngine.shutdown();

    // Clear all maps
    this.activeAnalyses.clear();
    
    // Remove all listeners
    this.removeAllListeners();
  }
}