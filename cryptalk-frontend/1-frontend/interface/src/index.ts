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

// 🚀 Main CrypTalk API - Ultra-Simple Object
const system = CrypTalk.getInstance();

const CrypTalkMain = {
  // Initialize the entire system
  async initialize() {
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
  },

  // Module APIs
  get storage() { return system.storage; },
  get chat() { return system.chat; },
  get payments() { return system.payments; },
  get events() { return system.eventBus; },
  
  // Health Check
  async getHealth() { return await system.getHealth(); },
  
  // Destroy
  async destroy() { await system.destroy(); }
};

export default CrypTalkMain;