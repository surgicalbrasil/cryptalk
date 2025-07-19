/**
 * WebSocketService - Implementação principal do serviço WebSocket
 * Gerencia conexões, mensagens e eventos de forma modular e desacoplada
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { 
  IWebSocketService, 
  ClientConnection, 
  WebSocketMessage, 
  EventSubscription, 
  WebSocketConfig, 
  BroadcastOptions 
} from '../../core/interfaces/IWebSocketService';
import { EventBus } from './EventBus';
import { MessageQueue } from './MessageQueue';

interface ConnectionMetrics {
  messagesSent: number;
  messagesReceived: number;
  bytesTransferred: number;
  lastPingTime?: number;
  avgLatency: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'critical';
}

interface ServerMetrics {
  startTime: Date;
  totalConnections: number;
  activeConnections: number;
  totalMessagesSent: number;
  totalMessagesReceived: number;
  totalBytesTransferred: number;
}

export class WebSocketService extends EventEmitter implements IWebSocketService {
  private server?: WebSocket.Server;
  private clients: Map<string, ClientConnection>;
  private subscriptions: Map<string, EventSubscription[]>;
  private config: WebSocketConfig;
  private eventBus: EventBus;
  private messageQueue: MessageQueue;
  private connectionMetrics: Map<string, ConnectionMetrics>;
  private serverMetrics: ServerMetrics;
  private heartbeatInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;
  private isRunning: boolean;

  constructor(eventBus: EventBus, messageQueue: MessageQueue) {
    super();
    
    this.clients = new Map();
    this.subscriptions = new Map();
    this.connectionMetrics = new Map();
    this.eventBus = eventBus;
    this.messageQueue = messageQueue;
    this.isRunning = false;

    // Configuração padrão
    this.config = {
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
    };

    this.serverMetrics = {
      startTime: new Date(),
      totalConnections: 0,
      activeConnections: 0,
      totalMessagesSent: 0,
      totalMessagesReceived: 0,
      totalBytesTransferred: 0
    };

    this.setupEventListeners();
  }

  /**
   * Iniciar servidor WebSocket
   */
  async start(config: WebSocketConfig): Promise<void> {
    try {
      if (this.isRunning) {
        throw new Error('WebSocket server is already running');
      }

      this.config = { ...this.config, ...config };

      // Criar servidor WebSocket
      this.server = new WebSocket.Server({
        port: this.config.port,
        host: this.config.host,
        perMessageDeflate: this.config.compression
      });

      this.setupServerHandlers();
      this.startHeartbeat();
      this.startCleanupInterval();

      this.isRunning = true;
      this.serverMetrics.startTime = new Date();

      console.log(`[WebSocketService] Server started on ${this.config.host}:${this.config.port}`);
      
      // Publicar evento de início
      await this.eventBus.publish('websocket:server_started', {
        host: this.config.host,
        port: this.config.port,
        timestamp: new Date()
      });

      this.emit('server_started', { host: this.config.host, port: this.config.port });
    } catch (error) {
      console.error('[WebSocketService] Error starting server:', error);
      throw error;
    }
  }

  /**
   * Parar servidor WebSocket
   */
  async stop(): Promise<void> {
    try {
      if (!this.isRunning) {
        return;
      }

      this.isRunning = false;

      // Parar intervalos
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }

      // Fechar todas as conexões
      const clientIds = Array.from(this.clients.keys());
      for (const clientId of clientIds) {
        await this.unregisterClient(clientId);
      }

      // Fechar servidor
      if (this.server) {
        await new Promise<void>((resolve, reject) => {
          this.server!.close((error) => {
            if (error) reject(error);
            else resolve();
          });
        });
      }

      console.log('[WebSocketService] Server stopped');
      
      // Publicar evento de parada
      await this.eventBus.publish('websocket:server_stopped', {
        timestamp: new Date()
      });

      this.emit('server_stopped');
    } catch (error) {
      console.error('[WebSocketService] Error stopping server:', error);
      throw error;
    }
  }

  /**
   * Registrar cliente
   */
  async registerClient(clientId: string, ws: WebSocket, metadata: Record<string, any> = {}): Promise<void> {
    try {
      // Verificar se cliente já existe
      if (this.clients.has(clientId)) {
        await this.unregisterClient(clientId);
      }

      const connection: ClientConnection = {
        clientId,
        ws,
        connectedAt: new Date(),
        lastActivity: new Date(),
        metadata,
        status: 'connected'
      };

      this.clients.set(clientId, connection);

      // Inicializar métricas
      this.connectionMetrics.set(clientId, {
        messagesSent: 0,
        messagesReceived: 0,
        bytesTransferred: 0,
        avgLatency: 0,
        connectionQuality: 'excellent'
      });

      // Configurar handlers de WebSocket
      this.setupWebSocketHandlers(clientId, ws);

      // Atualizar métricas do servidor
      this.serverMetrics.totalConnections++;
      this.serverMetrics.activeConnections = this.clients.size;

      console.log(`[WebSocketService] Client registered: ${clientId}`);
      
      // Publicar evento
      await this.eventBus.publish('websocket:client_connected', {
        clientId,
        metadata,
        timestamp: new Date()
      });

      this.emit('client_connected', { clientId, metadata });
    } catch (error) {
      console.error(`[WebSocketService] Error registering client ${clientId}:`, error);
      throw error;
    }
  }

  /**
   * Desregistrar cliente
   */
  async unregisterClient(clientId: string): Promise<void> {
    try {
      const connection = this.clients.get(clientId);
      if (!connection) {
        return;
      }

      // Fechar WebSocket se ainda aberto
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.close(1000, 'Client unregistered');
      }

      // Limpar subscrições
      this.subscriptions.delete(clientId);

      // Remover cliente
      this.clients.delete(clientId);
      this.connectionMetrics.delete(clientId);

      // Atualizar métricas
      this.serverMetrics.activeConnections = this.clients.size;

      console.log(`[WebSocketService] Client unregistered: ${clientId}`);
      
      // Publicar evento
      await this.eventBus.publish('websocket:client_disconnected', {
        clientId,
        timestamp: new Date()
      });

      this.emit('client_disconnected', { clientId });
    } catch (error) {
      console.error(`[WebSocketService] Error unregistering client ${clientId}:`, error);
    }
  }

  /**
   * Obter cliente
   */
  getClient(clientId: string): ClientConnection | null {
    const connection = this.clients.get(clientId);
    return connection ? { ...connection } : null;
  }

  /**
   * Obter clientes ativos
   */
  getActiveClients(): ClientConnection[] {
    return Array.from(this.clients.values()).map(conn => ({ ...conn }));
  }

  /**
   * Enviar mensagem para cliente específico
   */
  async sendToClient(clientId: string, message: WebSocketMessage): Promise<boolean> {
    try {
      const connection = this.clients.get(clientId);
      if (!connection) {
        console.warn(`[WebSocketService] Client ${clientId} not found`);
        return false;
      }

      if (connection.ws.readyState !== WebSocket.OPEN) {
        // Adicionar à fila se conexão não está aberta
        await this.messageQueue.enqueue(clientId, message);
        console.warn(`[WebSocketService] Connection not open for ${clientId}, message queued`);
        return false;
      }

      // Adicionar metadata se não existir
      if (!message.id) {
        message.id = this.generateMessageId();
      }
      if (!message.timestamp) {
        message.timestamp = new Date();
      }

      const messageString = JSON.stringify(message);
      connection.ws.send(messageString);

      // Atualizar métricas
      this.updateConnectionMetrics(clientId, 'sent', messageString.length);
      connection.lastActivity = new Date();

      console.log(`[WebSocketService] Message sent to ${clientId}: ${message.event}`);
      
      // Publicar evento
      await this.eventBus.publish('websocket:message_sent', {
        clientId,
        messageId: message.id,
        event: message.event,
        timestamp: new Date()
      });

      this.emit('message_sent', { clientId, message });
      return true;
    } catch (error) {
      console.error(`[WebSocketService] Error sending message to ${clientId}:`, error);
      
      // Adicionar à fila em caso de erro
      try {
        await this.messageQueue.enqueue(clientId, message);
      } catch (queueError) {
        console.error(`[WebSocketService] Error queuing message:`, queueError);
      }
      
      return false;
    }
  }

  /**
   * Enviar mensagem para múltiplos clientes
   */
  async sendToClients(clientIds: string[], message: WebSocketMessage): Promise<boolean[]> {
    const results: boolean[] = [];
    
    for (const clientId of clientIds) {
      const success = await this.sendToClient(clientId, message);
      results.push(success);
    }

    return results;
  }

  /**
   * Broadcast para todos os clientes
   */
  async broadcastToAll(message: WebSocketMessage, options: Partial<BroadcastOptions> = {}): Promise<number> {
    try {
      let targetClients = Array.from(this.clients.keys());

      // Aplicar filtros
      if (options.excludeClient) {
        targetClients = targetClients.filter(id => id !== options.excludeClient);
      }

      if (options.includeClients) {
        targetClients = targetClients.filter(id => options.includeClients!.includes(id));
      }

      if (options.filter) {
        targetClients = targetClients.filter(id => {
          const connection = this.clients.get(id);
          return connection ? options.filter!(connection) : false;
        });
      }

      // Enviar para clientes filtrados
      const results = await this.sendToClients(targetClients, message);
      const successCount = results.filter(Boolean).length;

      console.log(`[WebSocketService] Broadcast sent to ${successCount}/${targetClients.length} clients`);
      
      // Publicar evento
      await this.eventBus.publish('websocket:broadcast_sent', {
        targetCount: targetClients.length,
        successCount,
        event: message.event,
        timestamp: new Date()
      });

      this.emit('broadcast_sent', { targetCount: targetClients.length, successCount, message });
      return successCount;
    } catch (error) {
      console.error('[WebSocketService] Error broadcasting message:', error);
      return 0;
    }
  }

  /**
   * Subscrever a evento
   */
  async subscribe(clientId: string, eventType: string, filter: Record<string, any> = {}): Promise<void> {
    try {
      if (!this.subscriptions.has(clientId)) {
        this.subscriptions.set(clientId, []);
      }

      const subscription: EventSubscription = {
        clientId,
        eventType,
        filter
      };

      this.subscriptions.get(clientId)!.push(subscription);

      console.log(`[WebSocketService] Client ${clientId} subscribed to ${eventType}`);
      
      // Publicar evento
      await this.eventBus.publish('websocket:subscription_added', {
        clientId,
        eventType,
        filter,
        timestamp: new Date()
      });
    } catch (error) {
      console.error(`[WebSocketService] Error subscribing ${clientId} to ${eventType}:`, error);
      throw error;
    }
  }

  /**
   * Cancelar subscrição
   */
  async unsubscribe(clientId: string, eventType: string): Promise<void> {
    try {
      const clientSubs = this.subscriptions.get(clientId);
      if (!clientSubs) return;

      const index = clientSubs.findIndex(sub => sub.eventType === eventType);
      if (index !== -1) {
        clientSubs.splice(index, 1);
        
        console.log(`[WebSocketService] Client ${clientId} unsubscribed from ${eventType}`);
        
        // Publicar evento
        await this.eventBus.publish('websocket:subscription_removed', {
          clientId,
          eventType,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error(`[WebSocketService] Error unsubscribing ${clientId} from ${eventType}:`, error);
    }
  }

  /**
   * Emitir evento
   */
  async emit(event: string, data: any, targetClientId?: string): Promise<void> {
    try {
      const message: WebSocketMessage = {
        id: this.generateMessageId(),
        type: 'event',
        event,
        data,
        timestamp: new Date()
      };

      if (targetClientId) {
        await this.sendToClient(targetClientId, message);
      } else {
        // Enviar para clientes subscritos
        const subscribedClients = this.getSubscribedClients(event);
        await this.sendToClients(subscribedClients, message);
      }

      // Publicar no EventBus também
      await this.eventBus.publish(`websocket:${event}`, data);
    } catch (error) {
      console.error(`[WebSocketService] Error emitting event ${event}:`, error);
    }
  }

  /**
   * Ping cliente(s)
   */
  async ping(clientId?: string): Promise<boolean | Record<string, boolean>> {
    try {
      if (clientId) {
        return await this.pingClient(clientId);
      } else {
        const results: Record<string, boolean> = {};
        const clients = Array.from(this.clients.keys());
        
        for (const id of clients) {
          results[id] = await this.pingClient(id);
        }
        
        return results;
      }
    } catch (error) {
      console.error('[WebSocketService] Error pinging:', error);
      return clientId ? false : {};
    }
  }

  /**
   * Obter health da conexão
   */
  async getConnectionHealth(clientId: string): Promise<{
    isAlive: boolean;
    latency: number;
    lastActivity: Date;
    messagesSent: number;
    messagesReceived: number;
  }> {
    const connection = this.clients.get(clientId);
    const metrics = this.connectionMetrics.get(clientId);

    if (!connection || !metrics) {
      throw new Error(`Client ${clientId} not found`);
    }

    const isAlive = connection.ws.readyState === WebSocket.OPEN;
    
    return {
      isAlive,
      latency: metrics.avgLatency,
      lastActivity: connection.lastActivity,
      messagesSent: metrics.messagesSent,
      messagesReceived: metrics.messagesReceived
    };
  }

  /**
   * Atualizar configuração
   */
  async updateConfig(config: Partial<WebSocketConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    
    // Reiniciar heartbeat se intervalo mudou
    if (config.heartbeatInterval && this.heartbeatInterval) {
      this.stopHeartbeat();
      this.startHeartbeat();
    }

    console.log('[WebSocketService] Configuration updated');
  }

  /**
   * Obter configuração
   */
  getConfig(): WebSocketConfig {
    return { ...this.config };
  }

  /**
   * Obter status do servidor
   */
  getStatus(): {
    running: boolean;
    activeConnections: number;
    totalConnections: number;
    uptime: number;
  } {
    const uptime = this.isRunning ? Date.now() - this.serverMetrics.startTime.getTime() : 0;
    
    return {
      running: this.isRunning,
      activeConnections: this.serverMetrics.activeConnections,
      totalConnections: this.serverMetrics.totalConnections,
      uptime
    };
  }

  /**
   * Métodos privados
   */
  private setupEventListeners(): void {
    // Escutar eventos do EventBus
    this.eventBus.subscribe('websocket:*', async (event: string, data: any) => {
      // Repassar eventos do WebSocket para o EventBus
      this.emit(event.replace('websocket:', ''), data);
    });
  }

  private setupServerHandlers(): void {
    if (!this.server) return;

    this.server.on('connection', (ws, request) => {
      console.log('[WebSocketService] New WebSocket connection from', request.socket.remoteAddress);
      
      // Cliente será registrado quando enviar mensagem de registro
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'register' && message.clientId) {
            await this.registerClient(message.clientId, ws, message.metadata || {});
          }
        } catch (error) {
          console.error('[WebSocketService] Error processing registration message:', error);
        }
      });
    });

    this.server.on('error', (error) => {
      console.error('[WebSocketService] Server error:', error);
      this.emit('error', error);
    });
  }

  private setupWebSocketHandlers(clientId: string, ws: WebSocket): void {
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await this.handleClientMessage(clientId, message);
      } catch (error) {
        console.error(`[WebSocketService] Error handling message from ${clientId}:`, error);
      }
    });

    ws.on('close', async (code, reason) => {
      console.log(`[WebSocketService] Client ${clientId} disconnected: ${code} ${reason}`);
      await this.unregisterClient(clientId);
    });

    ws.on('error', (error) => {
      console.error(`[WebSocketService] WebSocket error for ${clientId}:`, error);
      this.emit('error', { clientId, error });
    });

    ws.on('pong', (data) => {
      this.handlePongResponse(clientId, data);
    });
  }

  private async handleClientMessage(clientId: string, message: any): Promise<void> {
    const connection = this.clients.get(clientId);
    if (!connection) return;

    // Atualizar atividade
    connection.lastActivity = new Date();
    this.updateConnectionMetrics(clientId, 'received', JSON.stringify(message).length);

    // Publicar evento de mensagem recebida
    await this.eventBus.publish('websocket:message_received', {
      clientId,
      messageType: message.type,
      event: message.event,
      timestamp: new Date()
    });

    this.emit('message_received', { clientId, message });

    // Processar mensagens especiais
    if (message.type === 'ping') {
      await this.sendToClient(clientId, {
        id: this.generateMessageId(),
        type: 'pong',
        event: 'pong',
        data: { timestamp: message.data?.timestamp },
        timestamp: new Date()
      });
    }
  }

  private getSubscribedClients(event: string): string[] {
    const subscribedClients: string[] = [];
    
    for (const [clientId, subscriptions] of this.subscriptions) {
      const isSubscribed = subscriptions.some(sub => 
        sub.eventType === event || this.matchesEventPattern(event, sub.eventType)
      );
      
      if (isSubscribed) {
        subscribedClients.push(clientId);
      }
    }
    
    return subscribedClients;
  }

  private matchesEventPattern(event: string, pattern: string): boolean {
    // Simples matching de wildcards
    const regexPattern = pattern.replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(event);
  }

  private async pingClient(clientId: string): Promise<boolean> {
    try {
      const connection = this.clients.get(clientId);
      if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
        return false;
      }

      const pingTime = Date.now();
      const metrics = this.connectionMetrics.get(clientId);
      if (metrics) {
        metrics.lastPingTime = pingTime;
      }

      connection.ws.ping();
      
      // Aguardar resposta com timeout
      return await new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(false), 5000);
        
        const handler = () => {
          clearTimeout(timeout);
          resolve(true);
        };
        
        connection.ws.once('pong', handler);
      });
    } catch (error) {
      console.error(`[WebSocketService] Error pinging client ${clientId}:`, error);
      return false;
    }
  }

  private handlePongResponse(clientId: string, data: Buffer): void {
    const metrics = this.connectionMetrics.get(clientId);
    if (!metrics || !metrics.lastPingTime) return;

    const latency = Date.now() - metrics.lastPingTime;
    metrics.avgLatency = (metrics.avgLatency + latency) / 2;

    // Atualizar qualidade da conexão baseada na latência
    if (latency < 100) {
      metrics.connectionQuality = 'excellent';
    } else if (latency < 300) {
      metrics.connectionQuality = 'good';
    } else if (latency < 1000) {
      metrics.connectionQuality = 'poor';
    } else {
      metrics.connectionQuality = 'critical';
    }
  }

  private updateConnectionMetrics(clientId: string, type: 'sent' | 'received', bytes: number): void {
    const metrics = this.connectionMetrics.get(clientId);
    if (!metrics) return;

    if (type === 'sent') {
      metrics.messagesSent++;
      this.serverMetrics.totalMessagesSent++;
    } else {
      metrics.messagesReceived++;
      this.serverMetrics.totalMessagesReceived++;
    }

    metrics.bytesTransferred += bytes;
    this.serverMetrics.totalBytesTransferred += bytes;
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      const clients = Array.from(this.clients.keys());
      
      for (const clientId of clients) {
        try {
          const isAlive = await this.pingClient(clientId);
          if (!isAlive) {
            console.warn(`[WebSocketService] Client ${clientId} failed ping, removing`);
            await this.unregisterClient(clientId);
          }
        } catch (error) {
          console.error(`[WebSocketService] Error in heartbeat for ${clientId}:`, error);
        }
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(async () => {
      await this.processMessageQueues();
    }, 5000); // A cada 5 segundos
  }

  private async processMessageQueues(): Promise<void> {
    for (const clientId of this.clients.keys()) {
      try {
        const queueSize = await this.messageQueue.getQueueSize(clientId);
        if (queueSize > 0) {
          const messages = await this.messageQueue.dequeueBatch(clientId, 10);
          
          for (const message of messages) {
            await this.sendToClient(clientId, message);
          }
        }
      } catch (error) {
        console.error(`[WebSocketService] Error processing queue for ${clientId}:`, error);
      }
    }
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Destruir serviço e limpar recursos
   */
  async destroy(): Promise<void> {
    await this.stop();
    this.removeAllListeners();
    console.log('[WebSocketService] Destroyed and cleaned up');
  }
}