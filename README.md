# 🎯 CrypTalk - Ultra-Modular Web3 Communication Platform

> **Clean, Simple, Powerful** - Enterprise-grade modularity in 5 files.

## **🚀 Quick Start**

```bash
# Install dependencies
npm install

# Start development (uses mocks automatically)
npm run dev

# Build for production  
npm run build
```

## **📁 Ultra-Clean Structure**

```
cryptalk-frontend/
├── src/
│   ├── modules/           # 🎯 New Modular System
│   │   ├── storage.ts     #   📁 Storacha + Mock providers
│   │   ├── chat.ts        #   💬 CrypTalk + Mock providers  
│   │   └── payments.ts    #   💰 MoonPay + Mock providers
│   ├── system.ts          #   🔧 Core system
│   ├── index.ts           #   📦 Main exports
│   ├── shared/            # 🔗 Legacy shared components
│   ├── features/          # 🔗 Legacy feature modules
│   └── App.tsx            # 🔗 Main React app
└── package.json
```

## **🎯 Usage**

```typescript
import CrypTalk from './src';

// Initialize everything
await CrypTalk.initialize();

// Use any module
await CrypTalk.storage.upload(file);
await CrypTalk.chat.sendMessage('room', 'Hello!');
await CrypTalk.payments.createIntent({value: 50, currency: 'usd'});
```

## **⚙️ Environment Configuration**

```bash
# .env.development (automatic mocks)
VITE_STORAGE_PROVIDER=mock
VITE_CHAT_PROVIDER=mock
VITE_PAYMENT_PROVIDER=mock

# .env.production (real services)
VITE_STORAGE_PROVIDER=storacha
VITE_STORACHA_DID=your-did
VITE_STORACHA_PRIVATE_KEY=your-key
VITE_CHAT_PROVIDER=cryptalk  
VITE_CRYPTALK_SDK_KEY=your-key
VITE_PAYMENT_PROVIDER=moonpay
VITE_MOONPAY_API_KEY=your-key
```

## **✨ Features**

- **🔌 Plugin Architecture**: Swap providers easily
- **📡 Event-Driven**: Clean module communication  
- **🧪 Auto-Mocking**: Perfect for development
- **⚙️ Zero Config**: Works out of the box
- **🏥 Health Monitoring**: Built-in status checks
- **🛡️ Type Safety**: Full TypeScript support

## **🏗️ Modules**

- **💾 Storage**: Storacha (w3up) for decentralized file storage
- **💬 Chat**: CrypTalk SDK for timestamped messaging
- **💰 Payments**: MoonPay for fiat-to-crypto payments

---

**Built with ❤️ using ultra-modular architecture**