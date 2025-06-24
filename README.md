# 🎯 CrypTalk - Ultra-Modular Web3 Communication Platform

> **Clean, Simple, Powerful** - Enterprise-grade modularity in 5 files.

## **🚀 Live Demo**

**✨ [View Live Demo](https://cryptalk-ihfrxy4hj-surgical-brasils-projects.vercel.app/)**

**Status**: ✅ **Deployed and Working!** 
- **Build**: Successful on Vercel
- **Runtime**: All modules initializing correctly
- **Architecture**: 5-file modular system operational

## **📦 Quick Start**

```bash
# Navigate to project
cd cryptalk-frontend

# Install dependencies
npm install

# Start development (uses mocks automatically)
npm run dev

# Build for production  
npm run build

# Deploy to Vercel
npm run vercel-build
```

## **🏗️ Ultra-Clean 5-File Architecture**

```
cryptalk-frontend/src/
├── system.ts              # 🔧 Core system (EventBus, Services, Config)
├── modules/
│   ├── storage.ts         # 📁 Storage module (Storacha + Mock)
│   ├── chat.ts            # 💬 Chat module (CrypTalk SDK + Mock)  
│   └── payments.ts        # 💰 Payment module (MoonPay + Mock)
├── index.ts               # 📦 Main API exports
└── app/                   # 🎨 React application
    ├── App.tsx            #   Main component with demo UI
    ├── main.tsx           #   React entry point
    └── components/        #   UI components
```

**Total Core Files**: 5 (system.ts + 3 modules + index.ts)  
**Bundle Size**: 424KB minified  
**Dependencies**: Minimal (React + Chakra UI)

## **🎯 Usage**

```typescript
import CrypTalk from './src';

// Initialize everything
await CrypTalk.initialize();
// Output: 🎉 CrypTalk ready! ['storage', 'chat', 'payments']

// Use any module
await CrypTalk.storage.upload(file);
await CrypTalk.chat.sendMessage('room', 'Hello!');
await CrypTalk.payments.createIntent({value: 50, currency: 'usd'});

// Health monitoring
const health = await CrypTalk.getHealth();
// Output: { storage: true, chat: true, payments: true }
```

## **🐳 Deployment Configuration**

### **Vercel Setup** (Working ✅)
```json
// vercel.json (at repo root)
{
  "buildCommand": "cd cryptalk-frontend && npm run vercel-build",
  "outputDirectory": "cryptalk-frontend/dist",
  "installCommand": "cd cryptalk-frontend && npm install"
}

// package.json scripts
{
  "build": "npx vite build",
  "vercel-build": "npm install && npm run build"
}
```

### **Container Compatibility**
- ✅ Uses `npx` for all commands (no PATH dependencies)
- ✅ Works in Docker, CI/CD, local environments
- ✅ Handles subdirectory project structure
- ✅ TypeScript compilation via Vite (no separate tsc step)

## **⚙️ Environment Configuration**

```bash
# Development (automatic mocks)
VITE_STORAGE_PROVIDER=mock
VITE_CHAT_PROVIDER=mock
VITE_PAYMENT_PROVIDER=mock

# Production (real services)
VITE_STORAGE_PROVIDER=storacha
VITE_STORACHA_DID=your-did
VITE_STORACHA_PRIVATE_KEY=your-key
VITE_CHAT_PROVIDER=cryptalk  
VITE_CRYPTALK_SDK_KEY=your-key
VITE_PAYMENT_PROVIDER=moonpay
VITE_MOONPAY_API_KEY=your-key
```

## **✨ Key Features**

- **🔌 Plugin Architecture**: Swap providers easily (Real ↔ Mock)
- **📡 Event-Driven**: Clean module communication via EventBus
- **🧪 Auto-Mocking**: Perfect for development & testing  
- **⚙️ Zero Config**: Works out of the box
- **🏥 Health Monitoring**: Built-in status checks for all modules
- **🛡️ Type Safety**: Full TypeScript support
- **🚀 Production Ready**: Deployed and working on Vercel
- **📱 Responsive UI**: Modern Chakra UI interface

## **🏗️ Module Details**

### **💾 Storage Module**
- **Production**: Storacha (w3up) for decentralized file storage
- **Development**: Mock provider with file simulation
- **Features**: Upload, list, delete, health checks

### **💬 Chat Module** 
- **Production**: CrypTalk SDK for timestamped messaging
- **Development**: Mock provider with room simulation
- **Features**: Rooms, messages, timestamps, blockchain proofs

### **💰 Payments Module**
- **Production**: MoonPay for fiat-to-crypto payments
- **Development**: Mock provider with transaction simulation  
- **Features**: Payment intents, currency conversion, status tracking

## **🚀 Deployment Status**

- **✅ Build**: Successful on Vercel
- **✅ Runtime**: No constructor errors
- **✅ Modules**: All 3 modules loading correctly
- **✅ UI**: Professional demo interface working
- **✅ Health**: System monitoring operational

**Live URL**: https://cryptalk-ihfrxy4hj-surgical-brasils-projects.vercel.app/

---

**Built with ❤️ using ultra-modular architecture**  
**🎯 5 files. 3 modules. Infinite possibilities.**