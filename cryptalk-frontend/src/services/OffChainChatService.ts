import CryptoJS from 'crypto-js';

/**
 * Serviço de chat off-chain seguindo protocolo CrypTalk
 * Foco em segurança e timestamps verificáveis
 */

export interface OffChainMessage {
  id: string;
  content: string;
  sender: string;
  recipient: string;
  timestamp: string; // ISO-8601 format
  signature: string; // Assinatura da mensagem
  messageHash: string; // Hash SHA-256 da mensagem
  type: 'text' | 'system' | 'status';
  metadata?: {
    clientInfo?: string;
    messageIndex?: number;
    previousHash?: string; // Para cadeia de integridade
  };
}

export interface ChatSession {
  sessionId: string;
  participants: string[];
  startTime: string;
  lastActivity: string;
  messages: OffChainMessage[];
  integrity: {
    chainHash: string; // Hash da cadeia de mensagens
    messageCount: number;
  };
}

class OffChainChatService {
  private ws: WebSocket | null = null;
  private messageListeners: Array<(message: OffChainMessage) => void> = [];
  private connectionListeners: Array<(connected: boolean) => void> = [];
  private currentSession: ChatSession | null = null;
  private userDID: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  /**
   * Inicializa o serviço de chat off-chain
   */
  async initialize(userDID: string): Promise<boolean> {
    try {
      this.userDID = userDID;
      
      // Simular conexão WebSocket (em produção seria wss://api.cryptalk.surgical.com/ws)
      console.log('🔄 Iniciando chat off-chain...');
      console.log(`👤 Usuário: ${this.truncateDID(userDID)}`);
      
      // Criar sessão local para demonstração
      this.currentSession = this.createSession(userDID);
      
      // Simular conexão WebSocket
      await this.simulateWebSocketConnection();
      
      console.log('✅ Chat off-chain inicializado com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao inicializar chat off-chain:', error);
      return false;
    }
  }

  /**
   * Cria uma nova sessão de chat
   */
  private createSession(userDID: string): ChatSession {
    const sessionId = this.generateSessionId();
    const now = new Date().toISOString();
    
    const session: ChatSession = {
      sessionId,
      participants: [userDID, 'did:key:z6MkpTMTCcMMKgRFPAvoAtgf9Sip8uk2KoF7LU2JTvqLDmjQ'], // Surgical Brasil
      startTime: now,
      lastActivity: now,
      messages: [],
      integrity: {
        chainHash: this.generateInitialHash(sessionId),
        messageCount: 0
      }
    };

    // Adicionar mensagem de boas-vindas do sistema
    const welcomeMessage = this.createSystemMessage(
      'Bem-vindo ao Chat Geral da Surgical Brasil! Como posso ajudá-lo hoje?',
      'did:key:z6MkpTMTCcMMKgRFPAvoAtgf9Sip8uk2KoF7LU2JTvqLDmjQ'
    );
    
    session.messages.push(welcomeMessage);
    session.integrity.messageCount = 1;
    session.integrity.chainHash = this.updateChainHash(session.integrity.chainHash, welcomeMessage);

    return session;
  }

  /**
   * Envia uma mensagem off-chain
   */
  async sendMessage(content: string, recipient: string): Promise<OffChainMessage> {
    if (!this.userDID || !this.currentSession) {
      throw new Error('Serviço não inicializado');
    }

    try {
      // Criar mensagem com timestamp seguro
      const message = this.createUserMessage(content, this.userDID, recipient);
      
      // Validar integridade da mensagem
      this.validateMessage(message);
      
      // Adicionar à sessão
      this.currentSession.messages.push(message);
      this.currentSession.lastActivity = message.timestamp;
      this.currentSession.integrity.messageCount++;
      this.currentSession.integrity.chainHash = this.updateChainHash(
        this.currentSession.integrity.chainHash,
        message
      );

      // Notificar listeners
      this.notifyMessageListeners(message);
      
      // Simular resposta automática (em produção viria via WebSocket)
      this.simulateResponse(message);

      console.log('📤 Mensagem off-chain enviada:', {
        id: message.id,
        timestamp: message.timestamp,
        hash: message.messageHash.substring(0, 8) + '...'
      });

      return message;
    } catch (error) {
      throw new Error(`Erro ao enviar mensagem: ${error.message}`);
    }
  }

  /**
   * Cria uma mensagem do usuário
   */
  private createUserMessage(content: string, sender: string, recipient: string): OffChainMessage {
    const timestamp = new Date().toISOString();
    const id = this.generateMessageId();
    
    // Criar hash da mensagem para integridade
    const messageData = `${id}${content}${sender}${recipient}${timestamp}`;
    const messageHash = CryptoJS.SHA256(messageData).toString();
    
    // Gerar assinatura (em produção seria com chave privada do DID)
    const signature = this.signMessage(messageData, sender);
    
    const message: OffChainMessage = {
      id,
      content,
      sender,
      recipient,
      timestamp,
      signature,
      messageHash,
      type: 'text',
      metadata: {
        messageIndex: this.currentSession?.integrity.messageCount || 0,
        previousHash: this.currentSession?.integrity.chainHash
      }
    };

    return message;
  }

  /**
   * Cria uma mensagem do sistema
   */
  private createSystemMessage(content: string, sender: string): OffChainMessage {
    const timestamp = new Date().toISOString();
    const id = this.generateMessageId();
    
    const messageData = `${id}${content}${sender}system${timestamp}`;
    const messageHash = CryptoJS.SHA256(messageData).toString();
    const signature = this.signMessage(messageData, sender);
    
    return {
      id,
      content,
      sender,
      recipient: 'system',
      timestamp,
      signature,
      messageHash,
      type: 'system',
      metadata: {
        messageIndex: 0,
        previousHash: null
      }
    };
  }

  /**
   * Assina uma mensagem (simulação - em produção usaria chave privada do DID)
   */
  private signMessage(messageData: string, senderDID: string): string {
    const privateKey = CryptoJS.SHA256(senderDID + 'CRYPTALK_SIGNING_KEY').toString();
    return CryptoJS.HmacSHA256(messageData, privateKey).toString();
  }

  /**
   * Valida a integridade de uma mensagem
   */
  private validateMessage(message: OffChainMessage): boolean {
    // Verificar formato do timestamp
    const timestampDate = new Date(message.timestamp);
    if (isNaN(timestampDate.getTime())) {
      throw new Error('Timestamp inválido');
    }

    // Verificar se não é muito antigo ou do futuro
    const now = Date.now();
    const messageTime = timestampDate.getTime();
    const maxAge = 5 * 60 * 1000; // 5 minutos
    const maxFuture = 30 * 1000; // 30 segundos

    if (messageTime < now - maxAge) {
      throw new Error('Mensagem muito antiga');
    }

    if (messageTime > now + maxFuture) {
      throw new Error('Mensagem do futuro não permitida');
    }

    // Verificar hash da mensagem
    const expectedData = `${message.id}${message.content}${message.sender}${message.recipient}${message.timestamp}`;
    const expectedHash = CryptoJS.SHA256(expectedData).toString();
    
    if (message.messageHash !== expectedHash) {
      throw new Error('Hash da mensagem não confere');
    }

    // Verificar assinatura
    const expectedSignature = this.signMessage(expectedData, message.sender);
    if (message.signature !== expectedSignature) {
      throw new Error('Assinatura da mensagem inválida');
    }

    return true;
  }

  /**
   * Atualiza o hash da cadeia de mensagens
   */
  private updateChainHash(previousChainHash: string, message: OffChainMessage): string {
    const chainData = `${previousChainHash}${message.messageHash}${message.timestamp}`;
    return CryptoJS.SHA256(chainData).toString();
  }

  /**
   * Simula conexão WebSocket
   */
  private async simulateWebSocketConnection(): Promise<void> {
    return new Promise((resolve) => {
      // Simular delay de conexão
      setTimeout(() => {
        this.notifyConnectionListeners(true);
        resolve();
      }, 1000);
    });
  }

  /**
   * Simula resposta automática da Surgical Brasil
   */
  private simulateResponse(userMessage: OffChainMessage): void {
    // Respostas automáticas baseadas no conteúdo
    const responses = [
      'Obrigado pela sua mensagem! Vou analisar e responder em breve.',
      'Recebido! Nossa equipe está analisando sua solicitação.',
      'Entendi sua dúvida. Que tal agendarmos uma consulta para conversar melhor?',
      'Perfeito! Vou verificar essas informações e te retorno.'
    ];

    setTimeout(() => {
      const responseContent = responses[Math.floor(Math.random() * responses.length)];
      const response = this.createSystemMessage(
        responseContent,
        'did:key:z6MkpTMTCcMMKgRFPAvoAtgf9Sip8uk2KoF7LU2JTvqLDmjQ'
      );

      if (this.currentSession) {
        this.currentSession.messages.push(response);
        this.currentSession.lastActivity = response.timestamp;
        this.currentSession.integrity.messageCount++;
        this.currentSession.integrity.chainHash = this.updateChainHash(
          this.currentSession.integrity.chainHash,
          response
        );
      }

      this.notifyMessageListeners(response);
    }, 2000 + Math.random() * 3000); // Resposta entre 2-5 segundos
  }

  /**
   * Adiciona listener para novas mensagens
   */
  onMessage(listener: (message: OffChainMessage) => void): void {
    this.messageListeners.push(listener);
  }

  /**
   * Remove listener de mensagens
   */
  removeMessageListener(listener: (message: OffChainMessage) => void): void {
    this.messageListeners = this.messageListeners.filter(l => l !== listener);
  }

  /**
   * Adiciona listener para status de conexão
   */
  onConnectionChange(listener: (connected: boolean) => void): void {
    this.connectionListeners.push(listener);
  }

  /**
   * Remove listener de conexão
   */
  removeConnectionListener(listener: (connected: boolean) => void): void {
    this.connectionListeners = this.connectionListeners.filter(l => l !== listener);
  }

  /**
   * Notifica listeners sobre novas mensagens
   */
  private notifyMessageListeners(message: OffChainMessage): void {
    this.messageListeners.forEach(listener => listener(message));
  }

  /**
   * Notifica listeners sobre mudanças de conexão
   */
  private notifyConnectionListeners(connected: boolean): void {
    this.connectionListeners.forEach(listener => listener(connected));
  }

  /**
   * Obtém histórico de mensagens
   */
  getMessages(): OffChainMessage[] {
    return this.currentSession?.messages || [];
  }

  /**
   * Obtém informações da sessão atual
   */
  getCurrentSession(): ChatSession | null {
    return this.currentSession;
  }

  /**
   * Gera ID único para mensagem
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Gera ID único para sessão
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Gera hash inicial da cadeia
   */
  private generateInitialHash(sessionId: string): string {
    return CryptoJS.SHA256(`CRYPTALK_GENESIS_${sessionId}_${Date.now()}`).toString();
  }

  /**
   * Trunca DID para exibição
   */
  private truncateDID(did: string): string {
    return `${did.substring(0, 12)}...${did.substring(did.length - 8)}`;
  }

  /**
   * Desconecta o serviço
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageListeners = [];
    this.connectionListeners = [];
    this.currentSession = null;
    this.userDID = null;
    console.log('🔌 Chat off-chain desconectado');
  }
}

// Singleton instance
export const offChainChatService = new OffChainChatService();
export default offChainChatService;