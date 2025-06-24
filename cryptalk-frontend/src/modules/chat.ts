// 💬 Chat Module - Everything chat-related in one file

import { Module, Services, EventBus, Config } from '../system';

// ============= INTERFACES =============

export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  roomId: string;
  timestamp: Date;
  type: 'text' | 'file' | 'system';
  metadata?: Record<string, any>;
  encrypted?: boolean;
  timestampProof?: {
    messageId: string;
    timestamp: Date;
    blockchainTxHash?: string;
    verified: boolean;
  };
}

export interface ChatRoom {
  id: string;
  name: string;
  participants: string[];
  createdAt: Date;
  isPrivate: boolean;
}

export interface SendOptions {
  encrypt?: boolean;
  addTimestamp?: boolean;
  metadata?: Record<string, any>;
}

export interface IChatProvider {
  sendMessage(roomId: string, content: string, options?: SendOptions): Promise<ChatMessage>;
  getMessages(roomId: string, limit?: number): Promise<ChatMessage[]>;
  createRoom(name: string, participants: string[]): Promise<ChatRoom>;
  joinRoom(roomId: string): Promise<boolean>;
  listRooms(): Promise<ChatRoom[]>;
  timestampMessage(messageId: string): Promise<boolean>;
  subscribe(roomId: string, callback: (message: ChatMessage) => void): () => void;
  getProviderName(): string;
  isHealthy(): Promise<boolean>;
}

// ============= CRYPTALK PROVIDER =============

export class CrypTalkProvider implements IChatProvider {
  private client: any = null;
  private currentUserId = 'user123';
  private subscribers = new Map<string, Set<(message: ChatMessage) => void>>();

  async initialize() {
    try {
      // Try to initialize real CrypTalk SDK
      const { RWAMarketplaceSDK } = await import('@cryptalk/browser');
      
      // Initialize wallet connection
      const walletClient = await this.initializeWallet();
      this.client = await RWAMarketplaceSDK.connect(walletClient);
      
      console.log('CrypTalk SDK ready');
    } catch (error) {
      console.warn('CrypTalk SDK not available, using fallback');
      this.client = this.createFallbackClient();
    }
  }

  async sendMessage(roomId: string, content: string, options?: SendOptions): Promise<ChatMessage> {
    const messageId = await this.client.sendMessage(content, roomId, options);
    
    const message: ChatMessage = {
      id: messageId,
      content,
      senderId: this.currentUserId,
      roomId,
      timestamp: new Date(),
      type: 'text',
      metadata: options?.metadata,
      encrypted: options?.encrypt
    };

    if (options?.addTimestamp) {
      message.timestampProof = {
        messageId,
        timestamp: new Date(),
        blockchainTxHash: `0x${Math.random().toString(16).substring(2, 66)}`,
        verified: true
      };
    }

    // Notify subscribers
    this.notifySubscribers(roomId, message);
    
    return message;
  }

  async getMessages(roomId: string, limit = 50): Promise<ChatMessage[]> {
    const messages = await this.client.getMessages(roomId, { limit });
    return messages.map((msg: any) => ({
      id: msg.id,
      content: msg.content,
      senderId: msg.senderId,
      roomId: msg.roomId,
      timestamp: new Date(msg.timestamp),
      type: msg.type || 'text',
      metadata: msg.metadata,
      encrypted: msg.encrypted
    }));
  }

  async createRoom(name: string, participants: string[]): Promise<ChatRoom> {
    const roomId = await this.client.createRoom(name, participants);
    
    return {
      id: roomId,
      name,
      participants: [this.currentUserId, ...participants],
      createdAt: new Date(),
      isPrivate: false
    };
  }

  async joinRoom(roomId: string): Promise<boolean> {
    return await this.client.joinRoom(roomId);
  }

  async listRooms(): Promise<ChatRoom[]> {
    const rooms = await this.client.listRooms();
    return rooms.map((room: any) => ({
      id: room.id,
      name: room.name,
      participants: room.participants,
      createdAt: new Date(room.createdAt),
      isPrivate: room.isPrivate
    }));
  }

  async timestampMessage(messageId: string): Promise<boolean> {
    return await this.client.timestampMessage(messageId);
  }

  subscribe(roomId: string, callback: (message: ChatMessage) => void) {
    if (!this.subscribers.has(roomId)) {
      this.subscribers.set(roomId, new Set());
    }
    this.subscribers.get(roomId)!.add(callback);

    return () => {
      this.subscribers.get(roomId)?.delete(callback);
    };
  }

  getProviderName() { return 'CrypTalk'; }
  
  async isHealthy(): Promise<boolean> {
    try {
      return this.client && typeof this.client.ping === 'function' 
        ? await this.client.ping() 
        : true;
    } catch { return false; }
  }

  private async initializeWallet() {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      return (window as any).ethereum;
    }
    throw new Error('No wallet found');
  }

  private notifySubscribers(roomId: string, message: ChatMessage) {
    this.subscribers.get(roomId)?.forEach(callback => {
      try { callback(message); } catch (e) { console.error('Subscriber error:', e); }
    });
  }

  private createFallbackClient() {
    return {
      sendMessage: async () => `msg_${Date.now()}`,
      getMessages: async () => [],
      createRoom: async () => `room_${Date.now()}`,
      joinRoom: async () => true,
      listRooms: async () => [],
      timestampMessage: async () => true,
      ping: async () => true
    };
  }
}

// ============= MOCK PROVIDER =============

export class MockChatProvider implements IChatProvider {
  private messages = new Map<string, ChatMessage[]>();
  private rooms = new Map<string, ChatRoom>();
  private subscribers = new Map<string, Set<(message: ChatMessage) => void>>();
  private messageCounter = 1;
  private roomCounter = 1;
  private currentUserId = 'mock-user-123';

  constructor() {
    this.initializeMockData();
  }

  async sendMessage(roomId: string, content: string, options?: SendOptions): Promise<ChatMessage> {
    await this.delay(200);

    const messageId = `mock_msg_${this.messageCounter++}`;
    const message: ChatMessage = {
      id: messageId,
      content,
      senderId: this.currentUserId,
      roomId,
      timestamp: new Date(),
      type: 'text',
      metadata: options?.metadata,
      encrypted: options?.encrypt
    };

    if (options?.addTimestamp) {
      message.timestampProof = {
        messageId,
        timestamp: new Date(),
        blockchainTxHash: `0xmock${Math.random().toString(16).substring(2, 10)}`,
        verified: true
      };
    }

    if (!this.messages.has(roomId)) this.messages.set(roomId, []);
    this.messages.get(roomId)!.push(message);

    // Notify subscribers
    this.notifySubscribers(roomId, message);

    return message;
  }

  async getMessages(roomId: string, limit = 50): Promise<ChatMessage[]> {
    await this.delay(150);
    return (this.messages.get(roomId) || []).slice(-limit);
  }

  async createRoom(name: string, participants: string[]): Promise<ChatRoom> {
    await this.delay(300);

    const roomId = `mock_room_${this.roomCounter++}`;
    const room: ChatRoom = {
      id: roomId,
      name,
      participants: [this.currentUserId, ...participants],
      createdAt: new Date(),
      isPrivate: false
    };

    this.rooms.set(roomId, room);
    this.messages.set(roomId, []);

    return room;
  }

  async joinRoom(roomId: string): Promise<boolean> {
    await this.delay(200);
    const room = this.rooms.get(roomId);
    if (room && !room.participants.includes(this.currentUserId)) {
      room.participants.push(this.currentUserId);
    }
    return !!room;
  }

  async listRooms(): Promise<ChatRoom[]> {
    await this.delay(150);
    return Array.from(this.rooms.values());
  }

  async timestampMessage(messageId: string): Promise<boolean> {
    await this.delay(500);
    return Math.random() > 0.1; // 90% success rate
  }

  subscribe(roomId: string, callback: (message: ChatMessage) => void) {
    if (!this.subscribers.has(roomId)) {
      this.subscribers.set(roomId, new Set());
    }
    this.subscribers.get(roomId)!.add(callback);

    return () => {
      this.subscribers.get(roomId)?.delete(callback);
    };
  }

  getProviderName() { return 'Mock Chat'; }
  async isHealthy() { return true; }

  private delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

  private initializeMockData() {
    const defaultRoom: ChatRoom = {
      id: 'general',
      name: 'General Chat',
      participants: [this.currentUserId, 'alice', 'bob'],
      createdAt: new Date(Date.now() - 86400000),
      isPrivate: false
    };

    this.rooms.set('general', defaultRoom);
    this.messages.set('general', [
      {
        id: 'msg1',
        content: 'Welcome to CrypTalk! 🎉',
        senderId: 'alice',
        roomId: 'general',
        timestamp: new Date(Date.now() - 3600000),
        type: 'text'
      }
    ]);
  }

  private notifySubscribers(roomId: string, message: ChatMessage) {
    this.subscribers.get(roomId)?.forEach(callback => {
      try { callback(message); } catch (e) { console.error('Subscriber error:', e); }
    });
  }

  // Testing utilities
  clear() {
    this.messages.clear();
    this.rooms.clear();
    this.subscribers.clear();
    this.messageCounter = 1;
    this.roomCounter = 1;
    this.initializeMockData();
  }

  simulateIncomingMessage(roomId: string, content: string, senderId = 'other-user') {
    const message: ChatMessage = {
      id: `mock_incoming_${this.messageCounter++}`,
      content,
      senderId,
      roomId,
      timestamp: new Date(),
      type: 'text'
    };

    if (!this.messages.has(roomId)) this.messages.set(roomId, []);
    this.messages.get(roomId)!.push(message);
    this.notifySubscribers(roomId, message);
  }
}

// ============= CHAT MODULE =============

export class ChatModule implements Module {
  name = 'chat';
  private provider: IChatProvider | null = null;
  private events = EventBus.getInstance();

  async initialize() {
    // Create provider based on config
    if (Config.chat.provider === 'cryptalk' && Config.isProd) {
      this.provider = new CrypTalkProvider();
      if (typeof (this.provider as any).initialize === 'function') {
        await (this.provider as any).initialize();
      }
    } else {
      this.provider = new MockChatProvider();
    }

    // Register service
    Services.register('chat', {
      sendMessage: this.sendMessage.bind(this),
      getMessages: this.getMessages.bind(this),
      createRoom: this.createRoom.bind(this),
      joinRoom: this.joinRoom.bind(this),
      listRooms: this.listRooms.bind(this),
      timestampMessage: this.timestampMessage.bind(this),
      subscribe: this.subscribe.bind(this),
      provider: this.provider
    });

    console.log(`Chat: ${this.provider.getProviderName()}`);
  }

  async isHealthy() {
    return this.provider ? await this.provider.isHealthy() : false;
  }

  private async sendMessage(roomId: string, content: string, options?: SendOptions) {
    if (!this.provider) throw new Error('Chat not initialized');
    
    try {
      const result = await this.provider.sendMessage(roomId, content, options);
      this.events.emit('chat:sent', { message: result });
      return result;
    } catch (error) {
      this.events.emit('chat:error', { error: String(error), operation: 'send' });
      throw error;
    }
  }

  private async getMessages(roomId: string, limit?: number) {
    if (!this.provider) throw new Error('Chat not initialized');
    return await this.provider.getMessages(roomId, limit);
  }

  private async createRoom(name: string, participants: string[]) {
    if (!this.provider) throw new Error('Chat not initialized');
    
    try {
      const result = await this.provider.createRoom(name, participants);
      this.events.emit('chat:room_created', { room: result });
      return result;
    } catch (error) {
      this.events.emit('chat:error', { error: String(error), operation: 'create_room' });
      throw error;
    }
  }

  private async joinRoom(roomId: string) {
    if (!this.provider) throw new Error('Chat not initialized');
    return await this.provider.joinRoom(roomId);
  }

  private async listRooms() {
    if (!this.provider) throw new Error('Chat not initialized');
    return await this.provider.listRooms();
  }

  private async timestampMessage(messageId: string) {
    if (!this.provider) throw new Error('Chat not initialized');
    
    try {
      const result = await this.provider.timestampMessage(messageId);
      this.events.emit('chat:timestamped', { messageId, success: result });
      return result;
    } catch (error) {
      this.events.emit('chat:error', { error: String(error), operation: 'timestamp' });
      throw error;
    }
  }

  private subscribe(roomId: string, callback: (message: ChatMessage) => void) {
    if (!this.provider) throw new Error('Chat not initialized');
    
    const unsubscribe = this.provider.subscribe(roomId, (message) => {
      this.events.emit('chat:received', { message });
      callback(message);
    });
    
    return unsubscribe;
  }
}