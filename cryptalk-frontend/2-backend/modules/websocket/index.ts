/**
 * WebSocket Module - Exportações principais
 * Módulo WebSocket/Events modular e desacoplado
 */

// Exportar interfaces
export {
  IWebSocketService,
  IEventBus,
  IMessageQueue,
  INotificationService,
  ClientConnection,
  WebSocketMessage,
  EventSubscription,
  WebSocketConfig,
  BroadcastOptions
} from '../../core/interfaces/IWebSocketService';

// Exportar implementações
export { EventBus } from './EventBus';
export { MessageQueue } from './MessageQueue';
export { NotificationService } from './NotificationService';
export { WebSocketService } from './WebSocketService';

// Exportar factory/builder para facilitar uso
import { EventBus } from './EventBus';
import { MessageQueue } from './MessageQueue';
import { NotificationService } from './NotificationService';
import { WebSocketService } from './WebSocketService';
import { WebSocketConfig } from '../../core/interfaces/IWebSocketService';

export interface WebSocketModuleConfig {
  websocket?: Partial<WebSocketConfig>;
  eventBus?: {
    maxHistorySize?: number;
  };
  messageQueue?: {
    maxSize?: number;
    persistToDisk?: boolean;
    retryAttempts?: number;
    retryDelay?: number;
    compression?: boolean;
  };
  notifications?: {
    maxHistoryPerClient?: number;
    defaultAutoClose?: number;
    enablePersistence?: boolean;
    enableBatching?: boolean;
    batchInterval?: number;
    maxBatchSize?: number;
  };
}

export interface WebSocketModule {
  eventBus: EventBus;
  messageQueue: MessageQueue;
  notificationService: NotificationService;
  webSocketService: WebSocketService;
  start: (config: WebSocketConfig) => Promise<void>;
  stop: () => Promise<void>;
  destroy: () => Promise<void>;
}

/**
 * Factory para criar módulo WebSocket completo
 */
export function createWebSocketModule(config: WebSocketModuleConfig = {}): WebSocketModule {
  // Criar EventBus
  const eventBus = new EventBus(config.eventBus?.maxHistorySize);

  // Criar MessageQueue
  const messageQueue = new MessageQueue(config.messageQueue);

  // Criar WebSocketService
  const webSocketService = new WebSocketService(eventBus, messageQueue);

  // Criar NotificationService
  const notificationService = new NotificationService(
    webSocketService, 
    eventBus, 
    config.notifications
  );

  // Configurar eventos inter-serviços
  setupInterServiceEvents(eventBus, webSocketService, notificationService);

  return {
    eventBus,
    messageQueue,
    notificationService,
    webSocketService,

    async start(wsConfig: WebSocketConfig): Promise<void> {
      console.log('[WebSocketModule] Starting WebSocket module...');
      
      try {
        // Iniciar serviços em ordem
        await webSocketService.start(wsConfig);
        
        console.log('[WebSocketModule] WebSocket module started successfully');
        
        // Publicar evento de inicialização
        await eventBus.publish('websocket-module:started', {
          config: wsConfig,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('[WebSocketModule] Error starting module:', error);
        throw error;
      }
    },

    async stop(): Promise<void> {
      console.log('[WebSocketModule] Stopping WebSocket module...');
      
      try {
        await webSocketService.stop();
        
        console.log('[WebSocketModule] WebSocket module stopped successfully');
        
        // Publicar evento de parada
        await eventBus.publish('websocket-module:stopped', {
          timestamp: new Date()
        });
      } catch (error) {
        console.error('[WebSocketModule] Error stopping module:', error);
        throw error;
      }
    },

    async destroy(): Promise<void> {
      console.log('[WebSocketModule] Destroying WebSocket module...');
      
      try {
        // Destruir serviços em ordem reversa
        notificationService.destroy();
        await webSocketService.destroy();
        messageQueue.destroy();
        eventBus.destroy();
        
        console.log('[WebSocketModule] WebSocket module destroyed successfully');
      } catch (error) {
        console.error('[WebSocketModule] Error destroying module:', error);
        throw error;
      }
    }
  };
}

/**
 * Configurar eventos entre serviços para desacoplamento
 */
function setupInterServiceEvents(
  eventBus: EventBus, 
  webSocketService: WebSocketService, 
  notificationService: NotificationService
): void {
  // Repassar eventos do WebSocketService para o EventBus
  webSocketService.on('client_connected', async (data) => {
    await eventBus.publish('client:connected', data);
  });

  webSocketService.on('client_disconnected', async (data) => {
    await eventBus.publish('client:disconnected', data);
  });

  webSocketService.on('message_received', async (data) => {
    await eventBus.publish('message:received', data);
  });

  webSocketService.on('message_sent', async (data) => {
    await eventBus.publish('message:sent', data);
  });

  webSocketService.on('broadcast_sent', async (data) => {
    await eventBus.publish('broadcast:sent', data);
  });

  webSocketService.on('error', async (data) => {
    await eventBus.publish('websocket:error', data);
  });

  // Configurar notificações automáticas para eventos importantes
  eventBus.subscribe('websocket:error', async (event: string, data: any) => {
    if (data.clientId) {
      await notificationService.sendAlert(data.clientId, {
        level: 'high',
        source: 'WebSocket',
        message: `WebSocket error: ${data.error?.message || 'Unknown error'}`,
        data: { error: data.error }
      });
    }
  });

  eventBus.subscribe('client:connected', async (event: string, data: any) => {
    await notificationService.sendNotification(data.clientId, {
      type: 'success',
      title: 'Connected',
      message: 'Successfully connected to WebSocket server',
      data: { connectedAt: data.timestamp }
    });
  });

  console.log('[WebSocketModule] Inter-service events configured');
}

/**
 * Helper para criar configuração padrão
 */
export function createDefaultConfig(): WebSocketModuleConfig {
  return {
    websocket: {
      port: 8080,
      host: '0.0.0.0',
      heartbeatInterval: 30000,
      reconnectAttempts: 3,
      reconnectDelay: 1000,
      messageQueueSize: 1000,
      compression: false,
      cors: {
        origin: ['*'],
        credentials: true
      }
    },
    eventBus: {
      maxHistorySize: 1000
    },
    messageQueue: {
      maxSize: 1000,
      persistToDisk: false,
      retryAttempts: 3,
      retryDelay: 1000,
      compression: false
    },
    notifications: {
      maxHistoryPerClient: 100,
      defaultAutoClose: 5000,
      enablePersistence: true,
      enableBatching: false,
      batchInterval: 1000,
      maxBatchSize: 10
    }
  };
}

/**
 * Utilitário para validar configuração
 */
export function validateConfig(config: WebSocketModuleConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validar configuração do WebSocket
  if (config.websocket) {
    if (config.websocket.port && (config.websocket.port < 1 || config.websocket.port > 65535)) {
      errors.push('WebSocket port must be between 1 and 65535');
    }

    if (config.websocket.heartbeatInterval && config.websocket.heartbeatInterval < 1000) {
      errors.push('Heartbeat interval must be at least 1000ms');
    }

    if (config.websocket.reconnectAttempts && config.websocket.reconnectAttempts < 0) {
      errors.push('Reconnect attempts must be non-negative');
    }

    if (config.websocket.messageQueueSize && config.websocket.messageQueueSize < 1) {
      errors.push('Message queue size must be at least 1');
    }
  }

  // Validar configuração do EventBus
  if (config.eventBus?.maxHistorySize && config.eventBus.maxHistorySize < 1) {
    errors.push('EventBus max history size must be at least 1');
  }

  // Validar configuração da MessageQueue
  if (config.messageQueue) {
    if (config.messageQueue.maxSize && config.messageQueue.maxSize < 1) {
      errors.push('MessageQueue max size must be at least 1');
    }

    if (config.messageQueue.retryAttempts && config.messageQueue.retryAttempts < 0) {
      errors.push('MessageQueue retry attempts must be non-negative');
    }

    if (config.messageQueue.retryDelay && config.messageQueue.retryDelay < 0) {
      errors.push('MessageQueue retry delay must be non-negative');
    }
  }

  // Validar configuração de notificações
  if (config.notifications) {
    if (config.notifications.maxHistoryPerClient && config.notifications.maxHistoryPerClient < 1) {
      errors.push('Notifications max history per client must be at least 1');
    }

    if (config.notifications.defaultAutoClose && config.notifications.defaultAutoClose < 0) {
      errors.push('Notifications default auto close must be non-negative');
    }

    if (config.notifications.batchInterval && config.notifications.batchInterval < 100) {
      errors.push('Notifications batch interval must be at least 100ms');
    }

    if (config.notifications.maxBatchSize && config.notifications.maxBatchSize < 1) {
      errors.push('Notifications max batch size must be at least 1');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}