/**
 * Índice centralizado de todas as interfaces do CrypTalk
 * Facilita importação e manutenção das interfaces modulares
 */

// Docker & Container Services
export * from './IDockerService';
export type { 
  IDockerService, 
  IContainerManager,
  ContainerConfig, 
  ContainerInfo, 
  ContainerStats,
  ResourceConfig 
} from './IDockerService';

// Claude AI Services  
export * from './IClaudeService';
export type {
  IClaudeService,
  ISessionManager,
  IAnalysisEngine,
  SessionConfig,
  SessionInfo,
  Message,
  AnalysisRequest,
  AnalysisResult,
  ConversationContext
} from './IClaudeService';

// File & Upload Services
export * from './IFileService';
export type {
  IFileService,
  IUploadManager,
  IFileValidator,
  FileMetadata,
  UploadConfig,
  DocumentTypeConfig,
  ValidationResult,
  FileStats,
  DocumentType
} from './IFileService';

// WebSocket & Communication Services
export * from './IWebSocketService';
export type {
  IWebSocketService,
  IEventBus,
  IMessageQueue,
  INotificationService,
  ClientConnection,
  WebSocketMessage,
  EventSubscription,
  WebSocketConfig,
  BroadcastOptions
} from './IWebSocketService';

/**
 * Union types para facilitar o uso
 */
export type ServiceInterface = 
  | IDockerService 
  | IClaudeService 
  | IFileService 
  | IWebSocketService;

export type ServiceType = 'docker' | 'claude' | 'file' | 'websocket';

/**
 * Configuração base para todos os serviços
 */
export interface BaseServiceConfig {
  serviceName: string;
  serviceType: ServiceType;
  enabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  metrics: {
    enabled: boolean;
    interval: number;
  };
}

/**
 * Interface base que todos os serviços devem implementar
 */
export interface IBaseService {
  readonly serviceName: string;
  readonly serviceType: ServiceType;
  
  // Lifecycle
  initialize(config: BaseServiceConfig): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  restart(): Promise<void>;
  
  // Health & Status
  isHealthy(): Promise<boolean>;
  getStatus(): Promise<{
    status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
    uptime: number;
    lastError?: string;
  }>;
  
  // Metrics
  getMetrics(): Promise<Record<string, any>>;
  
  // Events
  on(event: string, callback: Function): void;
  emit(event: string, data: any): void;
}