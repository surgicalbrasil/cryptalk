/**
 * EventBus - Sistema de eventos central para desacoplamento
 * Implementa pub/sub pattern para comunicação inter-módulos
 */

import { EventEmitter } from 'events';
import { IEventBus } from '../../core/interfaces/IWebSocketService';

interface EventRecord {
  event: string;
  data: any;
  timestamp: Date;
  metadata: Record<string, any>;
}

interface TopicConfig {
  maxSubscribers?: number;
  maxEventHistory?: number;
  ttl?: number; // Time to live em ms
}

interface Subscription {
  id: string;
  pattern: string;
  handler: (event: string, data: any) => void;
  topic?: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}

interface EventMetrics {
  totalEvents: number;
  activeSubscriptions: number;
  eventsPerSecond: number;
  topEvents: Array<{event: string, count: number}>;
}

export class EventBus implements IEventBus {
  private emitter: EventEmitter;
  private subscriptions: Map<string, Subscription>;
  private topics: Map<string, TopicConfig>;
  private eventHistory: EventRecord[];
  private eventCounts: Map<string, number>;
  private metrics: EventMetrics;
  private lastMetricsUpdate: number;
  private eventsInLastSecond: number;
  private maxHistorySize: number;

  constructor(maxHistorySize: number = 1000) {
    this.emitter = new EventEmitter();
    this.subscriptions = new Map();
    this.topics = new Map();
    this.eventHistory = [];
    this.eventCounts = new Map();
    this.maxHistorySize = maxHistorySize;
    this.lastMetricsUpdate = Date.now();
    this.eventsInLastSecond = 0;
    
    this.metrics = {
      totalEvents: 0,
      activeSubscriptions: 0,
      eventsPerSecond: 0,
      topEvents: []
    };

    // Configurar limite máximo de listeners
    this.emitter.setMaxListeners(100);

    // Limpar histórico periodicamente
    this.setupCleanupInterval();
  }

  /**
   * Publicar evento
   */
  async publish(event: string, data: any, metadata: Record<string, any> = {}): Promise<void> {
    try {
      const eventRecord: EventRecord = {
        event,
        data,
        timestamp: new Date(),
        metadata: {
          ...metadata,
          eventId: this.generateEventId(),
          source: 'EventBus'
        }
      };

      // Adicionar ao histórico
      this.addToHistory(eventRecord);

      // Atualizar métricas
      this.updateMetrics(event);

      // Emitir evento
      this.emitter.emit(event, data, eventRecord.metadata);

      // Emitir evento genérico para wildcards
      this.emitter.emit('*', event, data, eventRecord.metadata);

      console.log(`[EventBus] Published event: ${event}`);
    } catch (error) {
      console.error(`[EventBus] Error publishing event ${event}:`, error);
      throw error;
    }
  }

  /**
   * Publicar evento em tópico específico
   */
  async publishToTopic(topic: string, event: string, data: any): Promise<void> {
    try {
      if (!this.topics.has(topic)) {
        throw new Error(`Topic '${topic}' does not exist`);
      }

      const topicEvent = `${topic}:${event}`;
      await this.publish(topicEvent, data, { topic, originalEvent: event });

      console.log(`[EventBus] Published to topic ${topic}: ${event}`);
    } catch (error) {
      console.error(`[EventBus] Error publishing to topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Subscrever a evento
   */
  subscribe(eventPattern: string, handler: (event: string, data: any) => void): string {
    try {
      const subscriptionId = this.generateSubscriptionId();
      
      const subscription: Subscription = {
        id: subscriptionId,
        pattern: eventPattern,
        handler,
        createdAt: new Date(),
        metadata: {}
      };

      // Determinar se é wildcard ou evento específico
      if (eventPattern.includes('*') || eventPattern.includes('?')) {
        // Wildcard subscription - usar evento genérico
        const wrappedHandler = (event: string, data: any, metadata: Record<string, any>) => {
          if (this.matchesPattern(event, eventPattern)) {
            handler(event, data);
          }
        };
        this.emitter.on('*', wrappedHandler);
        subscription.metadata.wrappedHandler = wrappedHandler;
      } else {
        // Evento específico
        this.emitter.on(eventPattern, handler);
      }

      this.subscriptions.set(subscriptionId, subscription);
      this.updateSubscriptionMetrics();

      console.log(`[EventBus] Subscribed to pattern: ${eventPattern} (ID: ${subscriptionId})`);
      return subscriptionId;
    } catch (error) {
      console.error(`[EventBus] Error subscribing to ${eventPattern}:`, error);
      throw error;
    }
  }

  /**
   * Cancelar subscrição
   */
  unsubscribe(subscriptionId: string): void {
    try {
      const subscription = this.subscriptions.get(subscriptionId);
      if (!subscription) {
        console.warn(`[EventBus] Subscription ${subscriptionId} not found`);
        return;
      }

      // Remover listener
      if (subscription.metadata.wrappedHandler) {
        this.emitter.off('*', subscription.metadata.wrappedHandler);
      } else {
        this.emitter.off(subscription.pattern, subscription.handler);
      }

      this.subscriptions.delete(subscriptionId);
      this.updateSubscriptionMetrics();

      console.log(`[EventBus] Unsubscribed: ${subscriptionId}`);
    } catch (error) {
      console.error(`[EventBus] Error unsubscribing ${subscriptionId}:`, error);
    }
  }

  /**
   * Criar tópico
   */
  async createTopic(topic: string, config: TopicConfig = {}): Promise<void> {
    try {
      const topicConfig: TopicConfig = {
        maxSubscribers: 50,
        maxEventHistory: 100,
        ttl: 24 * 60 * 60 * 1000, // 24 horas
        ...config
      };

      this.topics.set(topic, topicConfig);

      console.log(`[EventBus] Created topic: ${topic}`);
    } catch (error) {
      console.error(`[EventBus] Error creating topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Deletar tópico
   */
  async deleteTopic(topic: string): Promise<void> {
    try {
      if (!this.topics.has(topic)) {
        throw new Error(`Topic '${topic}' does not exist`);
      }

      // Remover todas as subscrições do tópico
      const topicSubscriptions = Array.from(this.subscriptions.entries())
        .filter(([_, sub]) => sub.pattern.startsWith(`${topic}:`));

      for (const [subId] of topicSubscriptions) {
        this.unsubscribe(subId);
      }

      this.topics.delete(topic);

      console.log(`[EventBus] Deleted topic: ${topic}`);
    } catch (error) {
      console.error(`[EventBus] Error deleting topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Listar tópicos
   */
  listTopics(): string[] {
    return Array.from(this.topics.keys());
  }

  /**
   * Obter histórico de eventos
   */
  async getEventHistory(eventPattern?: string, limit?: number): Promise<EventRecord[]> {
    try {
      let history = this.eventHistory;

      // Filtrar por padrão se fornecido
      if (eventPattern) {
        history = history.filter(record => 
          this.matchesPattern(record.event, eventPattern)
        );
      }

      // Aplicar limite
      if (limit) {
        history = history.slice(-limit);
      }

      return history.map(record => ({ ...record })); // Clone para evitar mutação
    } catch (error) {
      console.error(`[EventBus] Error getting event history:`, error);
      return [];
    }
  }

  /**
   * Obter métricas
   */
  async getMetrics(): Promise<EventMetrics> {
    try {
      this.updateEventsPerSecond();
      
      // Calcular top eventos
      const topEvents = Array.from(this.eventCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([event, count]) => ({ event, count }));

      return {
        ...this.metrics,
        topEvents,
        activeSubscriptions: this.subscriptions.size
      };
    } catch (error) {
      console.error(`[EventBus] Error getting metrics:`, error);
      return this.metrics;
    }
  }

  /**
   * Utilitários privados
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private matchesPattern(event: string, pattern: string): boolean {
    // Converter pattern para regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(event);
  }

  private addToHistory(eventRecord: EventRecord): void {
    this.eventHistory.push(eventRecord);

    // Manter tamanho do histórico limitado
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  private updateMetrics(event: string): void {
    this.metrics.totalEvents++;
    this.eventsInLastSecond++;

    // Contar ocorrências do evento
    const currentCount = this.eventCounts.get(event) || 0;
    this.eventCounts.set(event, currentCount + 1);
  }

  private updateSubscriptionMetrics(): void {
    this.metrics.activeSubscriptions = this.subscriptions.size;
  }

  private updateEventsPerSecond(): void {
    const now = Date.now();
    const elapsed = now - this.lastMetricsUpdate;

    if (elapsed >= 1000) {
      this.metrics.eventsPerSecond = this.eventsInLastSecond / (elapsed / 1000);
      this.eventsInLastSecond = 0;
      this.lastMetricsUpdate = now;
    }
  }

  private setupCleanupInterval(): void {
    // Limpar histórico e métricas antigas a cada 5 minutos
    setInterval(() => {
      this.cleanupOldData();
    }, 5 * 60 * 1000);
  }

  private cleanupOldData(): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hora

    // Limpar eventos antigos do histórico
    this.eventHistory = this.eventHistory.filter(
      record => now - record.timestamp.getTime() < maxAge
    );

    // Resetar contadores se muito antigos
    if (now - this.lastMetricsUpdate > maxAge) {
      this.eventCounts.clear();
      this.metrics.totalEvents = 0;
    }

    console.log(`[EventBus] Cleanup completed. History size: ${this.eventHistory.length}`);
  }

  /**
   * Destruir EventBus e limpar recursos
   */
  destroy(): void {
    // Remover todos os listeners
    this.emitter.removeAllListeners();

    // Limpar todas as estruturas de dados
    this.subscriptions.clear();
    this.topics.clear();
    this.eventHistory.length = 0;
    this.eventCounts.clear();

    console.log('[EventBus] Destroyed and cleaned up');
  }
}