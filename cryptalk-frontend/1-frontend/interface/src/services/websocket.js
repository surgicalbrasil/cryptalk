// Serviço WebSocket para arquitetura híbrida
// =========================================

import { WEBSOCKET_CONFIG, LOG_CONFIG } from '../config/api.js';

class WebSocketService {
  constructor() {
    this.ws = null;
    this.clientId = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = WEBSOCKET_CONFIG.RECONNECT_ATTEMPTS;
    this.reconnectDelay = WEBSOCKET_CONFIG.RECONNECT_DELAY;
    this.heartbeatInterval = null;
    this.messageQueue = [];
    this.eventListeners = new Map();
    
    // Bind methods
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.send = this.send.bind(this);
    this.onMessage = this.onMessage.bind(this);
    this.onError = this.onError.bind(this);
    this.onClose = this.onClose.bind(this);
    this.onOpen = this.onOpen.bind(this);
  }

  // Conectar ao WebSocket
  connect(clientId) {
    this.clientId = clientId;
    
    try {
      this.ws = new WebSocket(WEBSOCKET_CONFIG.URL);
      
      this.ws.onopen = this.onOpen;
      this.ws.onmessage = this.onMessage;
      this.ws.onerror = this.onError;
      this.ws.onclose = this.onClose;
      
      this.log('🔌 Conectando ao WebSocket...', WEBSOCKET_CONFIG.URL);
    } catch (error) {
      this.log('❌ Erro ao conectar WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  // Evento de conexão aberta
  onOpen() {
    this.log('✅ WebSocket conectado');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    
    // Registrar cliente
    this.send({
      type: 'register',
      clientId: this.clientId
    });
    
    // Iniciar heartbeat
    this.startHeartbeat();
    
    // Processar fila de mensagens
    this.processMessageQueue();
    
    // Emitir evento de conexão
    this.emit('connected');
  }

  // Evento de mensagem recebida
  onMessage(event) {
    try {
      const data = JSON.parse(event.data);
      this.log('📨 Mensagem recebida:', data);
      
      // Emitir evento específico baseado no tipo
      this.emit(data.type, data);
      
      // Emitir evento genérico de mensagem
      this.emit('message', data);
    } catch (error) {
      this.log('❌ Erro ao processar mensagem:', error);
    }
  }

  // Evento de erro
  onError(error) {
    this.log('❌ Erro WebSocket:', error);
    this.emit('error', error);
  }

  // Evento de conexão fechada
  onClose(event) {
    this.log('🔌 WebSocket desconectado:', event.code, event.reason);
    this.isConnected = false;
    this.stopHeartbeat();
    
    // Emitir evento de desconexão
    this.emit('disconnected', {
      code: event.code,
      reason: event.reason
    });
    
    // Tentar reconectar se configurado
    if (WEBSOCKET_CONFIG.AUTO_RECONNECT && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  // Enviar mensagem
  send(data) {
    if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      try {
        const message = JSON.stringify(data);
        this.ws.send(message);
        this.log('📤 Mensagem enviada:', data);
      } catch (error) {
        this.log('❌ Erro ao enviar mensagem:', error);
        this.queueMessage(data);
      }
    } else {
      this.queueMessage(data);
    }
  }

  // Adicionar mensagem à fila
  queueMessage(data) {
    if (this.messageQueue.length >= WEBSOCKET_CONFIG.MESSAGE_QUEUE_SIZE) {
      this.messageQueue.shift(); // Remove mensagem mais antiga
    }
    
    this.messageQueue.push(data);
    this.log('📥 Mensagem adicionada à fila:', data);
  }

  // Processar fila de mensagens
  processMessageQueue() {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  // Iniciar heartbeat
  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({
          type: 'ping',
          timestamp: Date.now()
        });
      }
    }, WEBSOCKET_CONFIG.HEARTBEAT_INTERVAL);
  }

  // Parar heartbeat
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Agendar reconexão
  scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      this.log(`🔄 Reconectando em ${delay}ms (tentativa ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect(this.clientId);
      }, delay);
    } else {
      this.log('❌ Máximo de tentativas de reconexão atingido');
      this.emit('max_reconnect_attempts_reached');
    }
  }

  // Desconectar
  disconnect() {
    this.log('🔌 Desconectando WebSocket...');
    
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Desconexão solicitada pelo cliente');
      this.ws = null;
    }
    
    this.isConnected = false;
    this.clientId = null;
    this.reconnectAttempts = 0;
    this.messageQueue = [];
  }

  // Adicionar listener de evento
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    
    this.eventListeners.get(event).push(callback);
  }

  // Remover listener de evento
  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Emitir evento
  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          this.log('❌ Erro no listener de evento:', error);
        }
      });
    }
  }

  // Logging
  log(...args) {
    if (LOG_CONFIG.CONSOLE) {
      console.log('[WebSocket]', ...args);
    }
  }

  // Verificar se está conectado
  isConnected() {
    return this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  // Obter status da conexão
  getStatus() {
    return {
      connected: this.isConnected,
      clientId: this.clientId,
      reconnectAttempts: this.reconnectAttempts,
      queueSize: this.messageQueue.length,
      readyState: this.ws ? this.ws.readyState : -1
    };
  }
}

// Criar instância única do serviço
export const websocketService = new WebSocketService();
export default websocketService;