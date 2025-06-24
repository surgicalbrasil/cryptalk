// 🎯 CrypTalk - Ultra-Modular Web3 Communication Platform
// Clean 5-file architecture demo

// Core System
import { CrypTalk } from './system';
export { CrypTalk, EventBus, Services, Config } from './system';

// Modules
export { StorageModule } from './modules/storage';
export { ChatModule } from './modules/chat';
export { PaymentModule } from './modules/payments';

// Type exports
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

// 🚀 Main CrypTalk Class - Ultra-Simple API
class CrypTalkMain {
  private static system = CrypTalk.getInstance();

  // Initialize the entire system
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
      console.error('❌ CrypTalk failed:', 'errors' in result ? result.errors : 'Unknown error');
    }
    
    return result;
  }

  // Module APIs
  static get storage() { return this.system.storage; }
  static get chat() { return this.system.chat; }
  static get payments() { return this.system.payments; }
  static get events() { return this.system.eventBus; }
  
  // Health Check
  static async getHealth() { return await this.system.getHealth(); }
  
  // Destroy
  static async destroy() { await this.system.destroy(); }
}

export default CrypTalkMain;