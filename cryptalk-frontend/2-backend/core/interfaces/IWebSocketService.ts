/**
 * Interface para serviços WebSocket e Comunicação em Tempo Real
 * Gerencia conexões, eventos e messaging de forma desacoplada
 */

export interface ClientConnection {
  clientId: string;
  ws: any; // WebSocket instance
  connectedAt: Date;
  lastActivity: Date;
  metadata: Record<string, any>;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
}

export interface WebSocketMessage {
  id: string;
  type: 'event' | 'command' | 'response' | 'notification';
  event: string;
  data: any;
  timestamp: Date;
  clientId?: string;
  messageId?: string;
}

export interface EventSubscription {
  clientId: string;
  eventType: string;
  filter?: Record<string, any>;
  callback?: Function;
}

export interface WebSocketConfig {
  port: number;
  host?: string;
  heartbeatInterval: number;
  reconnectAttempts: number;
  reconnectDelay: number;
  messageQueueSize: number;
  compression?: boolean;
  cors?: {
    origin: string[];
    credentials: boolean;
  };
}

export interface BroadcastOptions {
  excludeClient?: string;
  includeClients?: string[];
  filter?: (client: ClientConnection) => boolean;
  event: string;
  data: any;
}

export interface IWebSocketService {
  // Connection Management
  registerClient(clientId: string, ws: any, metadata?: Record<string, any>): Promise<void>;
  unregisterClient(clientId: string): Promise<void>;
  getClient(clientId: string): ClientConnection | null;
  getActiveClients(): ClientConnection[];
  
  // Messaging
  sendToClient(clientId: string, message: WebSocketMessage): Promise<boolean>;
  sendToClients(clientIds: string[], message: WebSocketMessage): Promise<boolean[]>;
  broadcastToAll(message: WebSocketMessage, options?: Partial<BroadcastOptions>): Promise<number>;
  
  // Event Management
  subscribe(clientId: string, eventType: string, filter?: Record<string, any>): Promise<void>;
  unsubscribe(clientId: string, eventType: string): Promise<void>;
  emit(event: string, data: any, targetClientId?: string): Promise<void>;
  
  // Server Management
  start(config: WebSocketConfig): Promise<void>;
  stop(): Promise<void>;
  getStatus(): {
    running: boolean;
    activeConnections: number;
    totalConnections: number;
    uptime: number;
  };
  
  // Health & Monitoring
  ping(clientId?: string): Promise<boolean | Record<string, boolean>>;
  getConnectionHealth(clientId: string): Promise<{
    isAlive: boolean;
    latency: number;
    lastActivity: Date;
    messagesSent: number;
    messagesReceived: number;
  }>;
  
  // Configuration
  updateConfig(config: Partial<WebSocketConfig>): Promise<void>;
  getConfig(): WebSocketConfig;
  
  // Events
  on(event: 'client_connected' | 'client_disconnected' | 'message_received' | 'error' | 'broadcast_sent', callback: Function): void;
  emit(event: string, data: any): void;
}

export interface IEventBus {
  // Event Publishing
  publish(event: string, data: any, metadata?: Record<string, any>): Promise<void>;
  publishToTopic(topic: string, event: string, data: any): Promise<void>;
  
  // Event Subscription
  subscribe(eventPattern: string, handler: (event: string, data: any) => void): string;
  unsubscribe(subscriptionId: string): void;
  
  // Topic Management
  createTopic(topic: string, config?: any): Promise<void>;
  deleteTopic(topic: string): Promise<void>;
  listTopics(): string[];
  
  // Event History
  getEventHistory(eventPattern?: string, limit?: number): Promise<Array<{
    event: string;
    data: any;
    timestamp: Date;
    metadata: Record<string, any>;
  }>>;
  
  // Health
  getMetrics(): Promise<{
    totalEvents: number;
    activeSubscriptions: number;
    eventsPerSecond: number;
    topEvents: Array<{event: string, count: number}>;
  }>;
}

export interface IMessageQueue {
  // Queue Operations
  enqueue(clientId: string, message: WebSocketMessage): Promise<void>;
  dequeue(clientId: string): Promise<WebSocketMessage | null>;
  peek(clientId: string): Promise<WebSocketMessage | null>;
  clear(clientId: string): Promise<number>;
  
  // Queue Management
  getQueueSize(clientId: string): Promise<number>;
  getQueuedMessages(clientId: string, limit?: number): Promise<WebSocketMessage[]>;
  
  // Batch Operations
  enqueueBatch(clientId: string, messages: WebSocketMessage[]): Promise<void>;
  dequeueBatch(clientId: string, count: number): Promise<WebSocketMessage[]>;
  
  // Persistence
  persistQueue(clientId: string): Promise<void>;
  restoreQueue(clientId: string): Promise<void>;
}

export interface INotificationService {
  // Notification Types
  sendNotification(clientId: string, notification: {
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    data?: any;
    persistent?: boolean;
  }): Promise<void>;
  
  sendProgressUpdate(clientId: string, update: {
    taskId: string;
    progress: number;
    status: string;
    message?: string;
  }): Promise<void>;
  
  sendAlert(clientId: string, alert: {
    level: 'low' | 'medium' | 'high' | 'critical';
    source: string;
    message: string;
    data?: any;
  }): Promise<void>;
}