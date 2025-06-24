// 🎯 Ultra-Simple CrypTalk System

// Legacy Shared Components (keeping for compatibility)
export * from './legacy/shared/types';
export * from './legacy/shared/components';
export * from './legacy/shared/hooks/useAuth';
export * from './legacy/shared/utils';
export * from './legacy/features';

// New Modular System
export { CrypTalk, EventBus, Services, Config } from './system';
export { StorageModule } from './modules/storage';
export { ChatModule } from './modules/chat';
export { PaymentModule } from './modules/payments';

// Type exports for convenience
export type { 
  StorageFile, 
  UploadOptions, 
  IStorageProvider 
} from './modules/storage';

export type { 
  ChatMessage, 
  ChatRoom, 
  SendOptions, 
  IChatProvider 
} from './modules/chat';

export type { 
  Payment, 
  PaymentAmount, 
  PaymentIntent, 
  IPaymentProvider 
} from './modules/payments';

// Main CrypTalk class - Ultra-Simple Usage
export default class {
  private static system = CrypTalk.getInstance();

  // 🚀 Initialize the entire system
  static async initialize() {
    const system = this.system;
    
    // Register modules
    system
      .register(new (await import('./modules/storage')).StorageModule())
      .register(new (await import('./modules/chat')).ChatModule())
      .register(new (await import('./modules/payments')).PaymentModule());
    
    // Initialize all
    const result = await system.initialize();
    
    if (result.success) {
      console.log('🎉 CrypTalk ready!', result.modules);
    } else {
      console.error('❌ CrypTalk failed:', result.errors);
    }
    
    return result;
  }

  // 💾 Storage API
  static get storage() { return this.system.storage; }
  
  // 💬 Chat API  
  static get chat() { return this.system.chat; }
  
  // 💰 Payments API
  static get payments() { return this.system.payments; }
  
  // 📡 Events API
  static get events() { return this.system.eventBus; }
  
  // 🏥 Health Check
  static async getHealth() { return await this.system.getHealth(); }
  
  // 🔄 Destroy
  static async destroy() { await this.system.destroy(); }
}