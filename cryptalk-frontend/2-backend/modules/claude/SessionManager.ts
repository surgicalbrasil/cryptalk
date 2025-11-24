/**
 * Session Manager - Gerenciamento de sessões
 * Gerencia estado de sessões isolado
 * Zero acoplamento, event-driven
 */

import { EventEmitter } from 'events';
import { 
  SessionConfig, 
  SessionInfo, 
  Message,
  ISessionManager 
} from '../../core/interfaces/IClaudeService';

export interface SessionManagerConfig {
  sessionTimeout: number;
  maxMessageHistory: number;
  cleanupInterval?: number;
  maxSessions?: number;
}

export interface SessionMetrics {
  activeSessions: number;
  totalSessions: number;
  averageSessionDuration: number;
  expiredSessions: number;
}

export class SessionManager extends EventEmitter implements ISessionManager {
  private sessions = new Map<string, SessionInfo>();
  private sessionTimeouts = new Map<string, NodeJS.Timeout>();
  private config: SessionManagerConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private metrics = {
    totalSessions: 0,
    expiredSessions: 0,
    totalSessionTime: 0
  };

  constructor(config: SessionManagerConfig) {
    super();
    this.config = {
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
      maxSessions: 1000,
      ...config
    };

    this.startCleanupProcess();
  }

  /**
   * Create a new session
   */
  async createSession(clientId: string, config?: SessionConfig): Promise<SessionInfo> {
    try {
      // End existing session if it exists
      if (this.sessions.has(clientId)) {
        await this.endSession(clientId);
      }

      // Check session limits
      if (this.sessions.size >= this.config.maxSessions!) {
        throw new Error('Maximum number of sessions reached');
      }

      const sessionId = `session_${clientId}_${Date.now()}`;
      const now = new Date();

      const session: SessionInfo = {
        sessionId,
        clientId,
        status: 'active',
        messages: [],
        context: '',
        createdAt: now,
        lastActivity: now,
        metadata: {
          config: config || {},
          version: '1.0',
          userAgent: 'Claude Module'
        }
      };

      this.sessions.set(clientId, session);
      this.setupSessionTimeout(clientId, config?.sessionTimeout);
      this.metrics.totalSessions++;

      this.emit('session_created', session);

      return { ...session };
    } catch (error) {
      this.emit('session_error', { clientId, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * End a session
   */
  async endSession(clientId: string): Promise<void> {
    try {
      const session = this.sessions.get(clientId);
      if (!session) {
        return; // Session doesn't exist, nothing to do
      }

      // Calculate session duration for metrics
      const duration = new Date().getTime() - session.createdAt.getTime();
      this.metrics.totalSessionTime += duration;

      // Update session status
      session.status = 'terminated';
      session.lastActivity = new Date();

      // Clear timeout
      const timeout = this.sessionTimeouts.get(clientId);
      if (timeout) {
        clearTimeout(timeout);
        this.sessionTimeouts.delete(clientId);
      }

      // Remove session
      this.sessions.delete(clientId);

      this.emit('session_ended', { clientId, duration });
    } catch (error) {
      this.emit('session_error', { clientId, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Get session status
   */
  async getSessionStatus(clientId: string): Promise<SessionInfo | null> {
    const session = this.sessions.get(clientId);
    if (!session) {
      return null;
    }

    // Check if session is expired
    if (this.isSessionExpired(session)) {
      await this.expireSession(clientId);
      return null;
    }

    return { ...session };
  }

  /**
   * Renew session (extend timeout)
   */
  async renewSession(clientId: string): Promise<void> {
    try {
      const session = this.sessions.get(clientId);
      if (!session) {
        throw new Error('Session not found');
      }

      if (session.status !== 'active') {
        throw new Error('Cannot renew inactive session');
      }

      // Update last activity
      session.lastActivity = new Date();
      this.sessions.set(clientId, session);

      // Reset timeout
      this.resetSessionTimeout(clientId);

      this.emit('session_renewed', { clientId });
    } catch (error) {
      this.emit('session_error', { clientId, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Add message to session
   */
  async addMessage(clientId: string, message: Message): Promise<void> {
    try {
      const session = this.sessions.get(clientId);
      if (!session) {
        throw new Error('Session not found');
      }

      if (session.status !== 'active') {
        throw new Error('Cannot add message to inactive session');
      }

      // Add message
      session.messages.push(message);

      // Trim messages if exceeding limit
      if (session.messages.length > this.config.maxMessageHistory) {
        session.messages = session.messages.slice(-this.config.maxMessageHistory);
      }

      // Update activity
      session.lastActivity = new Date();
      this.sessions.set(clientId, session);

      this.emit('message_added', { clientId, messageId: message.id });
    } catch (error) {
      this.emit('session_error', { clientId, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Clear messages from session
   */
  async clearMessages(clientId: string): Promise<void> {
    try {
      const session = this.sessions.get(clientId);
      if (!session) {
        throw new Error('Session not found');
      }

      session.messages = [];
      session.lastActivity = new Date();
      this.sessions.set(clientId, session);

      this.emit('messages_cleared', { clientId });
    } catch (error) {
      this.emit('session_error', { clientId, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Update session activity timestamp
   */
  async updateActivity(clientId: string): Promise<void> {
    const session = this.sessions.get(clientId);
    if (session && session.status === 'active') {
      session.lastActivity = new Date();
      this.sessions.set(clientId, session);
      this.resetSessionTimeout(clientId);
    }
  }

  /**
   * Update session context
   */
  async updateContext(clientId: string, context: string): Promise<void> {
    try {
      const session = this.sessions.get(clientId);
      if (!session) {
        throw new Error('Session not found');
      }

      session.context = context;
      session.lastActivity = new Date();
      this.sessions.set(clientId, session);

      this.emit('context_updated', { clientId });
    } catch (error) {
      this.emit('session_error', { clientId, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Update session file path and document type
   */
  async updateDocument(clientId: string, filePath: string, documentType: string): Promise<void> {
    try {
      const session = this.sessions.get(clientId);
      if (!session) {
        throw new Error('Session not found');
      }

      session.filePath = filePath;
      session.documentType = documentType;
      session.lastActivity = new Date();
      this.sessions.set(clientId, session);

      this.emit('document_updated', { clientId, filePath, documentType });
    } catch (error) {
      this.emit('session_error', { clientId, error: (error as Error).message });
      throw error;
    }
  }

  // Advanced Session Operations (ISessionManager)

  /**
   * Migrate session from one client to another
   */
  async migrateSession(fromClientId: string, toClientId: string): Promise<void> {
    try {
      const sourceSession = this.sessions.get(fromClientId);
      if (!sourceSession) {
        throw new Error('Source session not found');
      }

      // End target session if exists
      if (this.sessions.has(toClientId)) {
        await this.endSession(toClientId);
      }

      // Create new session with same data
      const migratedSession: SessionInfo = {
        ...sourceSession,
        sessionId: `session_${toClientId}_${Date.now()}`,
        clientId: toClientId,
        lastActivity: new Date(),
        metadata: {
          ...sourceSession.metadata,
          migratedFrom: fromClientId,
          migratedAt: new Date().toISOString()
        }
      };

      // Set new session
      this.sessions.set(toClientId, migratedSession);
      this.setupSessionTimeout(toClientId);

      // End source session
      await this.endSession(fromClientId);

      this.emit('session_migrated', { fromClientId, toClientId });
    } catch (error) {
      this.emit('session_error', { 
        clientId: fromClientId, 
        operation: 'migrate',
        error: (error as Error).message 
      });
      throw error;
    }
  }

  /**
   * Clone session to another client
   */
  async cloneSession(sourceClientId: string, targetClientId: string): Promise<SessionInfo> {
    try {
      const sourceSession = this.sessions.get(sourceClientId);
      if (!sourceSession) {
        throw new Error('Source session not found');
      }

      // End target session if exists
      if (this.sessions.has(targetClientId)) {
        await this.endSession(targetClientId);
      }

      // Create cloned session
      const clonedSession: SessionInfo = {
        ...sourceSession,
        sessionId: `session_${targetClientId}_${Date.now()}`,
        clientId: targetClientId,
        createdAt: new Date(),
        lastActivity: new Date(),
        metadata: {
          ...sourceSession.metadata,
          clonedFrom: sourceClientId,
          clonedAt: new Date().toISOString()
        }
      };

      this.sessions.set(targetClientId, clonedSession);
      this.setupSessionTimeout(targetClientId);

      this.emit('session_cloned', { sourceClientId, targetClientId });

      return { ...clonedSession };
    } catch (error) {
      this.emit('session_error', { 
        clientId: sourceClientId, 
        operation: 'clone',
        error: (error as Error).message 
      });
      throw error;
    }
  }

  /**
   * Archive session (store for later restoration)
   */
  async archiveSession(clientId: string): Promise<void> {
    try {
      const session = this.sessions.get(clientId);
      if (!session) {
        throw new Error('Session not found');
      }

      // In a real implementation, this would save to persistent storage
      session.metadata.archived = true;
      session.metadata.archivedAt = new Date().toISOString();
      session.status = 'terminated';

      await this.endSession(clientId);

      this.emit('session_archived', { clientId });
    } catch (error) {
      this.emit('session_error', { 
        clientId, 
        operation: 'archive',
        error: (error as Error).message 
      });
      throw error;
    }
  }

  /**
   * Restore session from archive
   */
  async restoreSession(clientId: string, archiveId: string): Promise<SessionInfo> {
    try {
      // In a real implementation, this would load from persistent storage
      // For now, we'll throw an error indicating the feature needs implementation
      throw new Error('Session restoration from persistent storage not yet implemented');
    } catch (error) {
      this.emit('session_error', { 
        clientId, 
        operation: 'restore',
        error: (error as Error).message 
      });
      throw error;
    }
  }

  // Configuration Management

  /**
   * Update default configuration
   */
  async updateDefaultConfig(config: Partial<SessionConfig>): Promise<void> {
    // This would typically persist the new defaults
    this.emit('config_updated', { config });
  }

  // Monitoring and Metrics

  /**
   * Get session metrics
   */
  async getMetrics(): Promise<SessionMetrics> {
    const activeSessions = Array.from(this.sessions.values())
      .filter(s => s.status === 'active').length;

    return {
      activeSessions,
      totalSessions: this.metrics.totalSessions,
      expiredSessions: this.metrics.expiredSessions,
      averageSessionDuration: this.metrics.totalSessions > 0 
        ? this.metrics.totalSessionTime / this.metrics.totalSessions 
        : 0
    };
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  }> {
    const metrics = await this.getMetrics();
    const memoryUsage = process.memoryUsage();
    
    const isHealthy = metrics.activeSessions < this.config.maxSessions! * 0.8 &&
                     memoryUsage.heapUsed < 500 * 1024 * 1024; // 500MB

    const isDegraded = !isHealthy && 
                      metrics.activeSessions < this.config.maxSessions! &&
                      memoryUsage.heapUsed < 1024 * 1024 * 1024; // 1GB

    return {
      status: isHealthy ? 'healthy' : (isDegraded ? 'degraded' : 'unhealthy'),
      details: {
        metrics,
        memoryUsage,
        sessionCount: this.sessions.size,
        timeoutCount: this.sessionTimeouts.size,
        timestamp: new Date().toISOString()
      }
    };
  }

  // Private Methods

  private setupSessionTimeout(clientId: string, customTimeout?: number): void {
    const timeout = customTimeout || this.config.sessionTimeout;
    
    const timeoutId = setTimeout(() => {
      this.expireSession(clientId);
    }, timeout);

    this.sessionTimeouts.set(clientId, timeoutId);
  }

  private resetSessionTimeout(clientId: string): void {
    const existingTimeout = this.sessionTimeouts.get(clientId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    this.setupSessionTimeout(clientId);
  }

  private async expireSession(clientId: string): Promise<void> {
    const session = this.sessions.get(clientId);
    if (!session) return;

    session.status = 'expired';
    session.lastActivity = new Date();
    this.metrics.expiredSessions++;

    await this.endSession(clientId);
    this.emit('session_expired', clientId);
  }

  private isSessionExpired(session: SessionInfo): boolean {
    const now = Date.now();
    const lastActivity = session.lastActivity.getTime();
    return (now - lastActivity) > this.config.sessionTimeout;
  }

  private startCleanupProcess(): void {
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval!);
  }

  private async performCleanup(): Promise<void> {
    const expiredSessions: string[] = [];

    for (const [clientId, session] of this.sessions) {
      if (this.isSessionExpired(session)) {
        expiredSessions.push(clientId);
      }
    }

    for (const clientId of expiredSessions) {
      try {
        await this.expireSession(clientId);
      } catch (error) {
        console.warn(`Failed to expire session ${clientId}:`, error);
      }
    }

    if (expiredSessions.length > 0) {
      this.emit('cleanup_completed', { expiredSessions: expiredSessions.length });
    }
  }

  /**
   * Shutdown the session manager
   */
  async shutdown(): Promise<void> {
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Clear all timeouts
    for (const timeout of this.sessionTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.sessionTimeouts.clear();

    // End all active sessions
    const activeSessions = Array.from(this.sessions.keys());
    for (const clientId of activeSessions) {
      try {
        await this.endSession(clientId);
      } catch (error) {
        console.warn(`Failed to end session ${clientId} during shutdown:`, error);
      }
    }

    // Clear all sessions
    this.sessions.clear();

    // Remove all listeners
    this.removeAllListeners();
  }
}