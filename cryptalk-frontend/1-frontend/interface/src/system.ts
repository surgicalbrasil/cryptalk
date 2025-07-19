// 🎯 Ultra-Simplified CrypTalk System - All core functionality in one file

export type EventCallback<T = any> = (data: T) => void;

// Simple Event Bus
export class EventBus {
  private static instance: EventBus;
  private listeners = new Map<string, Set<EventCallback>>();

  static getInstance() {
    if (!EventBus.instance) EventBus.instance = new EventBus();
    return EventBus.instance;
  }

  on<T>(event: string, callback: EventCallback<T>) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  emit<T>(event: string, data: T) {
    this.listeners.get(event)?.forEach(cb => {
      try { cb(data); } catch (e) { console.error('Event error:', e); }
    });
  }
}

// Simple Service Registry
export class Services {
  private static services = new Map<string, any>();
  
  static register<T>(key: string, service: T) {
    this.services.set(key, service);
  }

  static get<T>(key: string): T {
    const service = this.services.get(key);
    if (!service) throw new Error(`Service ${key} not found`);
    return service;
  }

  static has(key: string) { return this.services.has(key); }
  static clear() { this.services.clear(); }
}

// Configuration from Environment
export const Config = {
  get isDev() { return (globalThis as any).import?.meta?.env?.NODE_ENV !== 'production'; },
  get isProd() { return (globalThis as any).import?.meta?.env?.NODE_ENV === 'production'; },
  
  storage: {
    provider: (globalThis as any).import?.meta?.env?.VITE_STORAGE_PROVIDER || 'mock',
    storacha: {
      did: (globalThis as any).import?.meta?.env?.VITE_STORACHA_DID,
      privateKey: (globalThis as any).import?.meta?.env?.VITE_STORACHA_PRIVATE_KEY,
    }
  },
  
  chat: {
    provider: (globalThis as any).import?.meta?.env?.VITE_CHAT_PROVIDER || 'mock',
    cryptalk: {
      sdkKey: (globalThis as any).import?.meta?.env?.VITE_CRYPTALK_SDK_KEY,
      walletProvider: (globalThis as any).import?.meta?.env?.VITE_WALLET_PROVIDER || 'metamask',
    }
  },
  
  payments: {
    provider: (globalThis as any).import?.meta?.env?.VITE_PAYMENT_PROVIDER || 'mock',
    moonpay: {
      apiKey: (globalThis as any).import?.meta?.env?.VITE_MOONPAY_API_KEY,
      secretKey: (globalThis as any).import?.meta?.env?.VITE_MOONPAY_SECRET_KEY,
      sandboxMode: !(globalThis as any).import?.meta?.env?.VITE_MOONPAY_PRODUCTION,
    }
  }
};

// Module Interface
export interface Module {
  name: string;
  initialize(): Promise<void>;
  destroy?(): Promise<void>;
  isHealthy?(): Promise<boolean>;
}

// Main System Manager
export class CrypTalk {
  private static instance: CrypTalk;
  private modules = new Map<string, Module>();
  private events = EventBus.getInstance();
  private initialized = false;

  static getInstance() {
    if (!CrypTalk.instance) CrypTalk.instance = new CrypTalk();
    return CrypTalk.instance;
  }

  // Register a module
  register(module: Module) {
    this.modules.set(module.name, module);
    return this;
  }

  // Initialize all modules
  async initialize() {
    if (this.initialized) return { success: true, modules: Array.from(this.modules.keys()) };
    
    console.log('🚀 Initializing CrypTalk...');
    const results = { success: true, modules: [] as string[], errors: [] as string[] };
    
    for (const [name, module] of this.modules) {
      try {
        console.log(`  📦 ${name}...`);
        await module.initialize();
        results.modules.push(name);
        console.log(`  ✅ ${name}`);
      } catch (error) {
        console.error(`  ❌ ${name}:`, error);
        results.errors.push(`${name}: ${error}`);
        results.success = false;
      }
    }
    
    this.initialized = results.success;
    if (results.success) {
      console.log('✅ CrypTalk ready!');
      this.events.emit('system:ready', { modules: results.modules });
    }
    
    return results;
  }

  // Destroy all modules
  async destroy() {
    for (const [name, module] of this.modules) {
      try {
        if (module.destroy) await module.destroy();
      } catch (error) {
        console.error(`Error destroying ${name}:`, error);
      }
    }
    Services.clear();
    this.initialized = false;
  }

  // Health check
  async getHealth() {
    const health: Record<string, boolean> = {};
    for (const [name, module] of this.modules) {
      try {
        health[name] = module.isHealthy ? await module.isHealthy() : true;
      } catch {
        health[name] = false;
      }
    }
    return health;
  }

  // Convenience getters
  get storage() { return Services.get('storage'); }
  get chat() { return Services.get('chat'); }
  get payments() { return Services.get('payments'); }
  get eventBus() { return this.events; }
}