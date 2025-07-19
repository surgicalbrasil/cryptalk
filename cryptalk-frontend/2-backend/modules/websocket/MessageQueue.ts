/**
 * MessageQueue - Sistema de filas de mensagens para reliability
 * Implementa filas persistentes para cada cliente WebSocket
 */

import { 
  IMessageQueue, 
  WebSocketMessage 
} from '../../core/interfaces/IWebSocketService';

interface QueueMetadata {
  clientId: string;
  createdAt: Date;
  lastAccessed: Date;
  totalMessages: number;
  persistedMessages: number;
}

interface QueueConfig {
  maxSize: number;
  persistToDisk: boolean;
  retryAttempts: number;
  retryDelay: number;
  compression: boolean;
}

export class MessageQueue implements IMessageQueue {
  private queues: Map<string, WebSocketMessage[]>;
  private metadata: Map<string, QueueMetadata>;
  private config: QueueConfig;
  private persistenceEnabled: boolean;

  constructor(config: Partial<QueueConfig> = {}) {
    this.queues = new Map();
    this.metadata = new Map();
    
    this.config = {
      maxSize: 1000,
      persistToDisk: false,
      retryAttempts: 3,
      retryDelay: 1000,
      compression: false,
      ...config
    };

    this.persistenceEnabled = this.config.persistToDisk;

    // Setup periodic cleanup
    this.setupCleanupInterval();
  }

  /**
   * Adicionar mensagem à fila
   */
  async enqueue(clientId: string, message: WebSocketMessage): Promise<void> {
    try {
      this.ensureQueueExists(clientId);
      
      const queue = this.queues.get(clientId)!;
      const metadata = this.metadata.get(clientId)!;

      // Verificar limite da fila
      if (queue.length >= this.config.maxSize) {
        // Remove mensagem mais antiga
        const removedMessage = queue.shift();
        console.warn(`[MessageQueue] Queue overflow for ${clientId}, removed message: ${removedMessage?.id}`);
      }

      // Adicionar timestamp se não existir
      if (!message.timestamp) {
        message.timestamp = new Date();
      }

      // Adicionar ID único se não existir
      if (!message.id) {
        message.id = this.generateMessageId();
      }

      queue.push(message);
      
      // Atualizar metadata
      metadata.lastAccessed = new Date();
      metadata.totalMessages++;

      // Persistir se habilitado
      if (this.persistenceEnabled) {
        await this.persistQueueToDisk(clientId);
      }

      console.log(`[MessageQueue] Enqueued message ${message.id} for client ${clientId}. Queue size: ${queue.length}`);
    } catch (error) {
      console.error(`[MessageQueue] Error enqueueing message for ${clientId}:`, error);
      throw error;
    }
  }

  /**
   * Remover mensagem da fila (FIFO)
   */
  async dequeue(clientId: string): Promise<WebSocketMessage | null> {
    try {
      const queue = this.queues.get(clientId);
      if (!queue || queue.length === 0) {
        return null;
      }

      const message = queue.shift()!;
      const metadata = this.metadata.get(clientId);
      
      if (metadata) {
        metadata.lastAccessed = new Date();
      }

      // Persistir alterações se habilitado
      if (this.persistenceEnabled) {
        await this.persistQueueToDisk(clientId);
      }

      console.log(`[MessageQueue] Dequeued message ${message.id} for client ${clientId}. Queue size: ${queue.length}`);
      return message;
    } catch (error) {
      console.error(`[MessageQueue] Error dequeuing message for ${clientId}:`, error);
      return null;
    }
  }

  /**
   * Ver próxima mensagem sem remover
   */
  async peek(clientId: string): Promise<WebSocketMessage | null> {
    try {
      const queue = this.queues.get(clientId);
      if (!queue || queue.length === 0) {
        return null;
      }

      const metadata = this.metadata.get(clientId);
      if (metadata) {
        metadata.lastAccessed = new Date();
      }

      return { ...queue[0] }; // Clone para evitar mutação
    } catch (error) {
      console.error(`[MessageQueue] Error peeking message for ${clientId}:`, error);
      return null;
    }
  }

  /**
   * Limpar todas as mensagens da fila
   */
  async clear(clientId: string): Promise<number> {
    try {
      const queue = this.queues.get(clientId);
      if (!queue) {
        return 0;
      }

      const messageCount = queue.length;
      queue.length = 0;

      const metadata = this.metadata.get(clientId);
      if (metadata) {
        metadata.lastAccessed = new Date();
      }

      // Persistir se habilitado
      if (this.persistenceEnabled) {
        await this.persistQueueToDisk(clientId);
      }

      console.log(`[MessageQueue] Cleared ${messageCount} messages for client ${clientId}`);
      return messageCount;
    } catch (error) {
      console.error(`[MessageQueue] Error clearing queue for ${clientId}:`, error);
      return 0;
    }
  }

  /**
   * Obter tamanho da fila
   */
  async getQueueSize(clientId: string): Promise<number> {
    const queue = this.queues.get(clientId);
    return queue ? queue.length : 0;
  }

  /**
   * Obter mensagens da fila (sem remover)
   */
  async getQueuedMessages(clientId: string, limit?: number): Promise<WebSocketMessage[]> {
    try {
      const queue = this.queues.get(clientId);
      if (!queue || queue.length === 0) {
        return [];
      }

      const metadata = this.metadata.get(clientId);
      if (metadata) {
        metadata.lastAccessed = new Date();
      }

      let messages = queue.slice(); // Clone array

      if (limit && limit > 0) {
        messages = messages.slice(0, limit);
      }

      // Clone mensagens para evitar mutação
      return messages.map(msg => ({ ...msg }));
    } catch (error) {
      console.error(`[MessageQueue] Error getting queued messages for ${clientId}:`, error);
      return [];
    }
  }

  /**
   * Adicionar múltiplas mensagens
   */
  async enqueueBatch(clientId: string, messages: WebSocketMessage[]): Promise<void> {
    try {
      for (const message of messages) {
        await this.enqueue(clientId, message);
      }

      console.log(`[MessageQueue] Enqueued batch of ${messages.length} messages for client ${clientId}`);
    } catch (error) {
      console.error(`[MessageQueue] Error enqueueing batch for ${clientId}:`, error);
      throw error;
    }
  }

  /**
   * Remover múltiplas mensagens
   */
  async dequeueBatch(clientId: string, count: number): Promise<WebSocketMessage[]> {
    try {
      const messages: WebSocketMessage[] = [];
      
      for (let i = 0; i < count; i++) {
        const message = await this.dequeue(clientId);
        if (message) {
          messages.push(message);
        } else {
          break; // Fila vazia
        }
      }

      console.log(`[MessageQueue] Dequeued batch of ${messages.length} messages for client ${clientId}`);
      return messages;
    } catch (error) {
      console.error(`[MessageQueue] Error dequeuing batch for ${clientId}:`, error);
      return [];
    }
  }

  /**
   * Persistir fila no disco
   */
  async persistQueue(clientId: string): Promise<void> {
    if (!this.persistenceEnabled) {
      console.warn(`[MessageQueue] Persistence not enabled`);
      return;
    }

    try {
      await this.persistQueueToDisk(clientId);
      
      const metadata = this.metadata.get(clientId);
      if (metadata) {
        metadata.persistedMessages = await this.getQueueSize(clientId);
      }

      console.log(`[MessageQueue] Persisted queue for client ${clientId}`);
    } catch (error) {
      console.error(`[MessageQueue] Error persisting queue for ${clientId}:`, error);
      throw error;
    }
  }

  /**
   * Restaurar fila do disco
   */
  async restoreQueue(clientId: string): Promise<void> {
    if (!this.persistenceEnabled) {
      console.warn(`[MessageQueue] Persistence not enabled`);
      return;
    }

    try {
      await this.restoreQueueFromDisk(clientId);
      console.log(`[MessageQueue] Restored queue for client ${clientId}`);
    } catch (error) {
      console.error(`[MessageQueue] Error restoring queue for ${clientId}:`, error);
      throw error;
    }
  }

  /**
   * Obter estatísticas da fila
   */
  getQueueStats(clientId: string): QueueMetadata | null {
    const metadata = this.metadata.get(clientId);
    return metadata ? { ...metadata } : null;
  }

  /**
   * Obter estatísticas globais
   */
  getGlobalStats(): {
    totalQueues: number;
    totalMessages: number;
    totalSize: number;
    oldestQueue: Date | null;
    newestQueue: Date | null;
  } {
    let totalMessages = 0;
    let totalSize = 0;
    let oldestQueue: Date | null = null;
    let newestQueue: Date | null = null;

    for (const [clientId, queue] of this.queues) {
      totalMessages += queue.length;
      
      // Calcular tamanho aproximado
      const queueSize = queue.reduce((size, msg) => {
        return size + JSON.stringify(msg).length;
      }, 0);
      totalSize += queueSize;

      const metadata = this.metadata.get(clientId);
      if (metadata) {
        if (!oldestQueue || metadata.createdAt < oldestQueue) {
          oldestQueue = metadata.createdAt;
        }
        if (!newestQueue || metadata.createdAt > newestQueue) {
          newestQueue = metadata.createdAt;
        }
      }
    }

    return {
      totalQueues: this.queues.size,
      totalMessages,
      totalSize,
      oldestQueue,
      newestQueue
    };
  }

  /**
   * Métodos privados
   */
  private ensureQueueExists(clientId: string): void {
    if (!this.queues.has(clientId)) {
      this.queues.set(clientId, []);
      this.metadata.set(clientId, {
        clientId,
        createdAt: new Date(),
        lastAccessed: new Date(),
        totalMessages: 0,
        persistedMessages: 0
      });
    }
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async persistQueueToDisk(clientId: string): Promise<void> {
    // Implementação de persistência seria aqui
    // Por enquanto, apenas simular
    return new Promise((resolve) => {
      setTimeout(resolve, 10);
    });
  }

  private async restoreQueueFromDisk(clientId: string): Promise<void> {
    // Implementação de restauração seria aqui
    // Por enquanto, apenas simular
    return new Promise((resolve) => {
      setTimeout(resolve, 10);
    });
  }

  private setupCleanupInterval(): void {
    // Limpar filas vazias e antigas a cada 10 minutos
    setInterval(() => {
      this.cleanupOldQueues();
    }, 10 * 60 * 1000);
  }

  private cleanupOldQueues(): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hora
    const queuesToRemove: string[] = [];

    for (const [clientId, metadata] of this.metadata) {
      const queue = this.queues.get(clientId);
      
      // Remover se fila vazia e antiga
      if ((!queue || queue.length === 0) && 
          now - metadata.lastAccessed.getTime() > maxAge) {
        queuesToRemove.push(clientId);
      }
    }

    for (const clientId of queuesToRemove) {
      this.queues.delete(clientId);
      this.metadata.delete(clientId);
      console.log(`[MessageQueue] Cleaned up old queue for client ${clientId}`);
    }

    if (queuesToRemove.length > 0) {
      console.log(`[MessageQueue] Cleanup completed. Removed ${queuesToRemove.length} old queues`);
    }
  }

  /**
   * Destruir todas as filas e limpar recursos
   */
  destroy(): void {
    this.queues.clear();
    this.metadata.clear();
    console.log('[MessageQueue] Destroyed and cleaned up all queues');
  }
}