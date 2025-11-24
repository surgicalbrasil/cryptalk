/**
 * NotificationService - Serviço de notificações estruturadas
 * Gerencia diferentes tipos de notificações via WebSocket
 */

import { 
  INotificationService, 
  IWebSocketService 
} from '../../core/interfaces/IWebSocketService';
import { EventBus } from './EventBus';

interface NotificationTemplate {
  type: 'info' | 'warning' | 'error' | 'success';
  icon?: string;
  sound?: boolean;
  vibration?: boolean;
  autoClose?: number; // ms
  actions?: NotificationAction[];
}

interface NotificationAction {
  id: string;
  label: string;
  action: 'close' | 'redirect' | 'callback';
  data?: any;
}

interface NotificationHistory {
  id: string;
  clientId: string;
  type: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  persistent: boolean;
  data?: any;
}

interface NotificationConfig {
  maxHistoryPerClient: number;
  defaultAutoClose: number;
  enablePersistence: boolean;
  enableBatching: boolean;
  batchInterval: number;
  maxBatchSize: number;
}

export class NotificationService implements INotificationService {
  private webSocketService: IWebSocketService;
  private eventBus: EventBus;
  private config: NotificationConfig;
  private templates: Map<string, NotificationTemplate>;
  private history: Map<string, NotificationHistory[]>; // clientId -> notifications
  private batchQueue: Map<string, any[]>; // clientId -> notifications
  private batchTimeouts: Map<string, NodeJS.Timeout>;

  constructor(
    webSocketService: IWebSocketService, 
    eventBus: EventBus,
    config: Partial<NotificationConfig> = {}
  ) {
    this.webSocketService = webSocketService;
    this.eventBus = eventBus;
    
    this.config = {
      maxHistoryPerClient: 100,
      defaultAutoClose: 5000,
      enablePersistence: true,
      enableBatching: false,
      batchInterval: 1000,
      maxBatchSize: 10,
      ...config
    };

    this.templates = new Map();
    this.history = new Map();
    this.batchQueue = new Map();
    this.batchTimeouts = new Map();

    this.setupDefaultTemplates();
    this.setupEventListeners();
  }

  /**
   * Enviar notificação
   */
  async sendNotification(clientId: string, notification: {
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    data?: any;
    persistent?: boolean;
  }): Promise<void> {
    try {
      const notificationId = this.generateNotificationId();
      const template = this.templates.get(notification.type) || this.templates.get('info')!;
      
      const fullNotification = {
        id: notificationId,
        type: 'notification',
        event: 'notification_received',
        timestamp: new Date(),
        clientId,
        data: {
          id: notificationId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          icon: template.icon,
          sound: template.sound,
          vibration: template.vibration,
          autoClose: template.autoClose || this.config.defaultAutoClose,
          persistent: notification.persistent || false,
          actions: template.actions || [],
          data: notification.data
        }
      };

      // Adicionar ao histórico
      this.addToHistory(clientId, {
        id: notificationId,
        clientId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        timestamp: new Date(),
        read: false,
        persistent: notification.persistent || false,
        data: notification.data
      });

      // Enviar notificação
      if (this.config.enableBatching) {
        this.addToBatch(clientId, fullNotification);
      } else {
        await this.webSocketService.sendToClient(clientId, fullNotification);
      }

      // Publicar evento
      await this.eventBus.publish('notification:sent', {
        clientId,
        notificationId,
        type: notification.type,
        title: notification.title
      });

      console.log(`[NotificationService] Sent ${notification.type} notification to ${clientId}: ${notification.title}`);
    } catch (error) {
      console.error(`[NotificationService] Error sending notification to ${clientId}:`, error);
      throw error;
    }
  }

  /**
   * Enviar atualização de progresso
   */
  async sendProgressUpdate(clientId: string, update: {
    taskId: string;
    progress: number;
    status: string;
    message?: string;
  }): Promise<void> {
    try {
      const updateId = this.generateNotificationId();
      
      const progressNotification = {
        id: updateId,
        type: 'event',
        event: 'progress_update',
        timestamp: new Date(),
        clientId,
        data: {
          id: updateId,
          taskId: update.taskId,
          progress: Math.max(0, Math.min(100, update.progress)), // Clamp 0-100
          status: update.status,
          message: update.message,
          timestamp: new Date().toISOString()
        }
      };

      // Enviar atualização
      await this.webSocketService.sendToClient(clientId, progressNotification);

      // Publicar evento
      await this.eventBus.publish('progress:updated', {
        clientId,
        taskId: update.taskId,
        progress: update.progress,
        status: update.status
      });

      console.log(`[NotificationService] Sent progress update to ${clientId}: ${update.taskId} (${update.progress}%)`);
    } catch (error) {
      console.error(`[NotificationService] Error sending progress update to ${clientId}:`, error);
      throw error;
    }
  }

  /**
   * Enviar alerta
   */
  async sendAlert(clientId: string, alert: {
    level: 'low' | 'medium' | 'high' | 'critical';
    source: string;
    message: string;
    data?: any;
  }): Promise<void> {
    try {
      const alertId = this.generateNotificationId();
      
      // Mapear nível para tipo de notificação
      const typeMapping = {
        low: 'info',
        medium: 'warning',
        high: 'error',
        critical: 'error'
      };
      
      const alertNotification = {
        id: alertId,
        type: 'event',
        event: 'alert_received',
        timestamp: new Date(),
        clientId,
        data: {
          id: alertId,
          level: alert.level,
          source: alert.source,
          message: alert.message,
          type: typeMapping[alert.level],
          persistent: alert.level === 'critical',
          urgent: alert.level === 'critical' || alert.level === 'high',
          data: alert.data,
          timestamp: new Date().toISOString()
        }
      };

      // Adicionar ao histórico como notificação crítica
      if (alert.level === 'high' || alert.level === 'critical') {
        this.addToHistory(clientId, {
          id: alertId,
          clientId,
          type: typeMapping[alert.level],
          title: `${alert.level.toUpperCase()} Alert`,
          message: `[${alert.source}] ${alert.message}`,
          timestamp: new Date(),
          read: false,
          persistent: alert.level === 'critical',
          data: alert.data
        });
      }

      // Enviar alerta
      await this.webSocketService.sendToClient(clientId, alertNotification);

      // Publicar evento
      await this.eventBus.publish('alert:sent', {
        clientId,
        alertId,
        level: alert.level,
        source: alert.source,
        message: alert.message
      });

      console.log(`[NotificationService] Sent ${alert.level} alert to ${clientId}: [${alert.source}] ${alert.message}`);
    } catch (error) {
      console.error(`[NotificationService] Error sending alert to ${clientId}:`, error);
      throw error;
    }
  }

  /**
   * Marcar notificação como lida
   */
  async markAsRead(clientId: string, notificationId: string): Promise<void> {
    try {
      const clientHistory = this.history.get(clientId);
      if (!clientHistory) return;

      const notification = clientHistory.find(n => n.id === notificationId);
      if (notification) {
        notification.read = true;
        
        // Publicar evento
        await this.eventBus.publish('notification:read', {
          clientId,
          notificationId
        });

        console.log(`[NotificationService] Marked notification ${notificationId} as read for ${clientId}`);
      }
    } catch (error) {
      console.error(`[NotificationService] Error marking notification as read:`, error);
    }
  }

  /**
   * Obter histórico de notificações
   */
  getNotificationHistory(clientId: string, limit?: number, unreadOnly?: boolean): NotificationHistory[] {
    const clientHistory = this.history.get(clientId) || [];
    
    let filtered = unreadOnly ? clientHistory.filter(n => !n.read) : clientHistory;
    
    if (limit) {
      filtered = filtered.slice(-limit);
    }

    return filtered.map(n => ({ ...n })); // Clone para evitar mutação
  }

  /**
   * Limpar histórico de notificações
   */
  async clearHistory(clientId: string): Promise<number> {
    const clientHistory = this.history.get(clientId);
    if (!clientHistory) return 0;

    const count = clientHistory.length;
    this.history.set(clientId, []);

    // Publicar evento
    await this.eventBus.publish('notification:history_cleared', {
      clientId,
      clearedCount: count
    });

    console.log(`[NotificationService] Cleared ${count} notifications for ${clientId}`);
    return count;
  }

  /**
   * Obter estatísticas de notificações
   */
  getNotificationStats(clientId?: string): {
    totalNotifications: number;
    unreadNotifications: number;
    notificationsByType: Record<string, number>;
    oldestNotification?: Date;
    newestNotification?: Date;
  } {
    if (clientId) {
      const clientHistory = this.history.get(clientId) || [];
      return this.calculateStats(clientHistory);
    }

    // Estatísticas globais
    const allNotifications: NotificationHistory[] = [];
    for (const clientHistory of this.history.values()) {
      allNotifications.push(...clientHistory);
    }

    return this.calculateStats(allNotifications);
  }

  /**
   * Métodos privados
   */
  private setupDefaultTemplates(): void {
    this.templates.set('info', {
      type: 'info',
      icon: '🔵',
      sound: false,
      vibration: false,
      autoClose: 5000
    });

    this.templates.set('success', {
      type: 'success',
      icon: '✅',
      sound: false,
      vibration: false,
      autoClose: 3000
    });

    this.templates.set('warning', {
      type: 'warning',
      icon: '⚠️',
      sound: true,
      vibration: true,
      autoClose: 7000
    });

    this.templates.set('error', {
      type: 'error',
      icon: '❌',
      sound: true,
      vibration: true,
      autoClose: 0, // Não fechar automaticamente
      actions: [
        { id: 'close', label: 'Close', action: 'close' },
        { id: 'retry', label: 'Retry', action: 'callback', data: { action: 'retry' } }
      ]
    });
  }

  private setupEventListeners(): void {
    // Escutar eventos de desconexão para limpeza
    this.eventBus.subscribe('client:disconnected', (event: string, data: any) => {
      if (data.clientId) {
        this.cleanupClientData(data.clientId);
      }
    });
  }

  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addToHistory(clientId: string, notification: NotificationHistory): void {
    if (!this.history.has(clientId)) {
      this.history.set(clientId, []);
    }

    const clientHistory = this.history.get(clientId)!;
    clientHistory.push(notification);

    // Manter limite do histórico
    if (clientHistory.length > this.config.maxHistoryPerClient) {
      clientHistory.shift();
    }
  }

  private addToBatch(clientId: string, notification: any): void {
    if (!this.batchQueue.has(clientId)) {
      this.batchQueue.set(clientId, []);
    }

    const batch = this.batchQueue.get(clientId)!;
    batch.push(notification);

    // Configurar timeout para envio do lote
    if (this.batchTimeouts.has(clientId)) {
      clearTimeout(this.batchTimeouts.get(clientId)!);
    }

    const timeout = setTimeout(() => {
      this.flushBatch(clientId);
    }, this.config.batchInterval);

    this.batchTimeouts.set(clientId, timeout);

    // Forçar envio se lote está cheio
    if (batch.length >= this.config.maxBatchSize) {
      this.flushBatch(clientId);
    }
  }

  private async flushBatch(clientId: string): Promise<void> {
    const batch = this.batchQueue.get(clientId);
    if (!batch || batch.length === 0) return;

    try {
      // Limpar timeout
      const timeout = this.batchTimeouts.get(clientId);
      if (timeout) {
        clearTimeout(timeout);
        this.batchTimeouts.delete(clientId);
      }

      // Enviar lote
      const batchNotification = {
        id: this.generateNotificationId(),
        type: 'event',
        event: 'notification_batch',
        timestamp: new Date(),
        clientId,
        data: {
          notifications: batch,
          count: batch.length
        }
      };

      await this.webSocketService.sendToClient(clientId, batchNotification);

      // Limpar lote
      this.batchQueue.set(clientId, []);

      console.log(`[NotificationService] Flushed batch of ${batch.length} notifications to ${clientId}`);
    } catch (error) {
      console.error(`[NotificationService] Error flushing batch for ${clientId}:`, error);
    }
  }

  private calculateStats(notifications: NotificationHistory[]): {
    totalNotifications: number;
    unreadNotifications: number;
    notificationsByType: Record<string, number>;
    oldestNotification?: Date;
    newestNotification?: Date;
  } {
    const stats = {
      totalNotifications: notifications.length,
      unreadNotifications: notifications.filter(n => !n.read).length,
      notificationsByType: {} as Record<string, number>,
      oldestNotification: undefined as Date | undefined,
      newestNotification: undefined as Date | undefined
    };

    for (const notification of notifications) {
      // Contar por tipo
      stats.notificationsByType[notification.type] = 
        (stats.notificationsByType[notification.type] || 0) + 1;

      // Encontrar mais antiga e mais nova
      if (!stats.oldestNotification || notification.timestamp < stats.oldestNotification) {
        stats.oldestNotification = notification.timestamp;
      }
      if (!stats.newestNotification || notification.timestamp > stats.newestNotification) {
        stats.newestNotification = notification.timestamp;
      }
    }

    return stats;
  }

  private cleanupClientData(clientId: string): void {
    // Limpar histórico
    this.history.delete(clientId);
    
    // Limpar lote
    this.batchQueue.delete(clientId);
    
    // Limpar timeout
    const timeout = this.batchTimeouts.get(clientId);
    if (timeout) {
      clearTimeout(timeout);
      this.batchTimeouts.delete(clientId);
    }

    console.log(`[NotificationService] Cleaned up data for client ${clientId}`);
  }

  /**
   * Destruir serviço e limpar recursos
   */
  destroy(): void {
    // Limpar todos os timeouts
    for (const timeout of this.batchTimeouts.values()) {
      clearTimeout(timeout);
    }

    // Limpar todas as estruturas de dados
    this.templates.clear();
    this.history.clear();
    this.batchQueue.clear();
    this.batchTimeouts.clear();

    console.log('[NotificationService] Destroyed and cleaned up');
  }
}