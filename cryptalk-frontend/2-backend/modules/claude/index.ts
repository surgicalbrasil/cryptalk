/**
 * Claude Module - Exportações principais
 * Módulo modular para integração com Claude AI
 * Zero acoplamento, event-driven, TypeScript strict
 */

// Main service export
export { ClaudeService } from './ClaudeService';
export type { ClaudeServiceConfig, ClaudeEnvironment } from './ClaudeService';

// Session management exports
export { SessionManager } from './SessionManager';
export type { SessionManagerConfig, SessionMetrics } from './SessionManager';

// Analysis engine exports
export { AnalysisEngine } from './AnalysisEngine';
export type { AnalysisEngineConfig, DocumentTemplate, AnalysisContext } from './AnalysisEngine';

// Re-export interfaces from core
export {
  type IClaudeService,
  type ISessionManager,
  type IAnalysisEngine,
  type SessionConfig,
  type SessionInfo,
  type Message,
  type AnalysisRequest,
  type AnalysisResult,
  type ConversationContext
} from '../../core/interfaces/IClaudeService';

/**
 * Factory function to create a fully configured Claude service
 */
export function createClaudeService(config: {
  // Service configuration
  sessionTimeout?: number;
  analysisTimeout?: number;
  maxConcurrentAnalyses?: number;
  maxSessions?: number;
  
  // Environment configuration
  claudeCommand?: string;
  apiKey?: string;
  workingDirectory?: string;
  tempDirectory?: string;
  
  // File processing configuration
  maxFileSize?: number;
  allowedExtensions?: string[];
}): ClaudeService {
  
  const environment = {
    claudeCommand: config.claudeCommand || 'claude',
    apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY,
    workingDirectory: config.workingDirectory || process.cwd()
  };

  const serviceConfig = {
    sessionTimeout: config.sessionTimeout || 30 * 60 * 1000, // 30 minutes
    analysisTimeout: config.analysisTimeout || 5 * 60 * 1000, // 5 minutes
    maxConcurrentAnalyses: config.maxConcurrentAnalyses || 3,
    claudeCommand: environment.claudeCommand,
    tempDirectory: config.tempDirectory || '/tmp'
  };

  return new ClaudeService(serviceConfig, environment);
}

/**
 * Factory function to create a session manager with default configuration
 */
export function createSessionManager(config?: Partial<SessionManagerConfig>): SessionManager {
  const defaultConfig: SessionManagerConfig = {
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    maxMessageHistory: 50,
    cleanupInterval: 5 * 60 * 1000, // 5 minutes
    maxSessions: 1000
  };

  return new SessionManager({ ...defaultConfig, ...config });
}

/**
 * Factory function to create an analysis engine with default configuration
 */
export function createAnalysisEngine(config: {
  claudeCommand?: string;
  apiKey?: string;
  workingDirectory?: string;
  tempDirectory?: string;
  analysisTimeout?: number;
  maxFileSize?: number;
  allowedExtensions?: string[];
}): AnalysisEngine {
  const environment = {
    claudeCommand: config.claudeCommand || 'claude',
    apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY,
    workingDirectory: config.workingDirectory || process.cwd()
  };

  const engineConfig = {
    claudeCommand: environment.claudeCommand,
    analysisTimeout: config.analysisTimeout || 5 * 60 * 1000, // 5 minutes
    tempDirectory: config.tempDirectory || '/tmp',
    environment,
    maxFileSize: config.maxFileSize || 50 * 1024 * 1024, // 50MB
    allowedExtensions: config.allowedExtensions || [
      '.pdf', '.doc', '.docx', '.txt', '.ppt', '.pptx', 
      '.xls', '.xlsx', '.md', '.rtf', '.odt'
    ]
  };

  return new AnalysisEngine(engineConfig);
}

/**
 * Validate Claude environment setup
 */
export async function validateClaudeEnvironment(config?: {
  claudeCommand?: string;
  apiKey?: string;
  workingDirectory?: string;
}): Promise<{
  isValid: boolean;
  claudeAvailable: boolean;
  apiKeyValid: boolean;
  workingDirectoryExists: boolean;
  cliVersion?: string;
  issues: string[];
}> {
  const issues: string[] = [];
  
  // Create temporary analysis engine for validation
  const tempEngine = createAnalysisEngine({
    claudeCommand: config?.claudeCommand,
    apiKey: config?.apiKey,
    workingDirectory: config?.workingDirectory,
    tempDirectory: '/tmp'
  });

  try {
    const envStatus = await tempEngine.validateEnvironment();
    
    // Check working directory
    const workingDirectory = config?.workingDirectory || process.cwd();
    let workingDirectoryExists = false;
    try {
      const fs = await import('fs');
      await fs.promises.access(workingDirectory);
      workingDirectoryExists = true;
    } catch {
      workingDirectoryExists = false;
      issues.push(`Working directory does not exist: ${workingDirectory}`);
    }

    // Check API key
    if (!config?.apiKey && !process.env.ANTHROPIC_API_KEY && !process.env.CLAUDE_API_KEY) {
      issues.push('No API key found in config or environment variables (ANTHROPIC_API_KEY or CLAUDE_API_KEY)');
    }

    // Check Claude CLI
    if (!envStatus.claudeAvailable) {
      issues.push(`Claude CLI not available: ${config?.claudeCommand || 'claude'}`);
    }

    if (!envStatus.apiKeyValid) {
      issues.push('Invalid or missing API key for Claude CLI');
    }

    await tempEngine.shutdown();

    return {
      isValid: issues.length === 0,
      claudeAvailable: envStatus.claudeAvailable,
      apiKeyValid: envStatus.apiKeyValid,
      workingDirectoryExists,
      cliVersion: envStatus.cliVersion,
      issues
    };

  } catch (error) {
    await tempEngine.shutdown();
    issues.push(`Environment validation failed: ${(error as Error).message}`);
    
    return {
      isValid: false,
      claudeAvailable: false,
      apiKeyValid: false,
      workingDirectoryExists: false,
      issues
    };
  }
}

/**
 * Module information and version
 */
export const moduleInfo = {
  name: 'claude-module',
  version: '1.0.0',
  description: 'Modular Claude AI integration service',
  features: [
    'Document analysis',
    'Interactive conversations',
    'Session management',
    'Progress tracking',
    'Multiple output formats',
    'Template-based analysis',
    'Event-driven architecture',
    'Zero coupling design'
  ],
  supportedDocumentTypes: [
    'pitch-deck',
    'patent',
    'financial',
    'tech-doc',
    'legal-doc'
  ],
  supportedFormats: [
    'json',
    'markdown',
    'html'
  ]
};

/**
 * Default export for convenience
 */
export default {
  ClaudeService,
  SessionManager,
  AnalysisEngine,
  createClaudeService,
  createSessionManager,
  createAnalysisEngine,
  validateClaudeEnvironment,
  moduleInfo
};