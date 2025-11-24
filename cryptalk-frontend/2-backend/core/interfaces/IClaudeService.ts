/**
 * Interface para serviços Claude AI modular
 * Gerencia sessões, análises e conversações de forma desacoplada
 */

export interface SessionConfig {
  sessionTimeout?: number;
  analysisTimeout?: number;
  maxMessageHistory?: number;
  documentType?: string;
  templatePath?: string;
}

export interface SessionInfo {
  sessionId: string;
  clientId: string;
  status: 'active' | 'expired' | 'terminated';
  filePath?: string;
  documentType?: string;
  messages: Message[];
  context: string;
  createdAt: Date;
  lastActivity: Date;
  metadata: Record<string, any>;
}

export interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface AnalysisRequest {
  clientId: string;
  filePath: string;
  documentType: 'pitch-deck' | 'patent' | 'financial' | 'tech-doc' | 'legal-doc';
  options?: {
    depth?: 'basic' | 'detailed' | 'comprehensive';
    format?: 'json' | 'markdown' | 'html';
    language?: string;
  };
}

export interface AnalysisResult {
  analysisId: string;
  clientId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: {
    summary: string;
    insights: string[];
    recommendations: string[];
    metadata: Record<string, any>;
  };
  error?: string;
  progress: number;
  startedAt: Date;
  completedAt?: Date;
}

export interface ConversationContext {
  documentSummary: string;
  previousAnalysis: string;
  userPreferences: Record<string, any>;
  sessionHistory: Message[];
}

export interface IClaudeService {
  // Session Management
  createSession(clientId: string, config?: SessionConfig): Promise<SessionInfo>;
  endSession(clientId: string): Promise<void>;
  getSessionStatus(clientId: string): Promise<SessionInfo | null>;
  renewSession(clientId: string): Promise<void>;
  
  // Document Analysis
  analyzeDocument(request: AnalysisRequest): Promise<AnalysisResult>;
  getAnalysisStatus(analysisId: string): Promise<AnalysisResult>;
  cancelAnalysis(analysisId: string): Promise<void>;
  
  // Conversation
  sendMessage(clientId: string, message: string, context?: Partial<ConversationContext>): Promise<Message>;
  getConversationHistory(clientId: string, limit?: number): Promise<Message[]>;
  clearConversation(clientId: string): Promise<void>;
  
  // Configuration
  updateConfiguration(config: Partial<SessionConfig>): Promise<void>;
  validateEnvironment(): Promise<{
    claudeAvailable: boolean;
    apiKeyValid: boolean;
    cliVersion?: string;
  }>;
  getCapabilities(): Promise<{
    supportedFormats: string[];
    maxFileSize: number;
    features: string[];
  }>;
  
  // Monitoring
  getMetrics(): Promise<{
    activeSessions: number;
    totalAnalyses: number;
    averageResponseTime: number;
    errorRate: number;
  }>;
  getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  }>;
  
  // Events
  on(event: 'analysis_started' | 'analysis_progress' | 'analysis_completed' | 'session_expired' | 'error', callback: Function): void;
  emit(event: string, data: any): void;
}

export interface ISessionManager {
  // Advanced Session Operations
  migrateSession(fromClientId: string, toClientId: string): Promise<void>;
  cloneSession(sourceClientId: string, targetClientId: string): Promise<SessionInfo>;
  archiveSession(clientId: string): Promise<void>;
  restoreSession(clientId: string, archiveId: string): Promise<SessionInfo>;
}

export interface IAnalysisEngine {
  // Document Processing
  preprocessDocument(filePath: string, documentType: string): Promise<string>;
  executeAnalysis(processedContent: string, template: string): Promise<string>;
  postprocessResult(rawResult: string, format: string): Promise<any>;
  
  // Template Management
  loadTemplate(documentType: string): Promise<string>;
  validateTemplate(template: string): Promise<boolean>;
  cacheTemplate(documentType: string, template: string): Promise<void>;
}