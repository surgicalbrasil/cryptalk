# CrypTalk Platform

A modern, streamlined data room solution that combines off-chain document management with on-chain security features. Features dual authentication (email/wallet), AI-powered document review, and secure blockchain integration for confidential file sharing.

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/cryptalk.git
cd cryptalk/cryptalk-frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at http://localhost:5173/

### Windows Quick Start Scripts

For Windows users:
- **Batch file**: Double-click `start-cryptalk-dev.bat`
- **PowerShell**: Right-click `Start-CrypTalk.ps1` → "Run with PowerShell"

## 🎯 Platform Overview

CrypTalk Platform is designed as a comprehensive data room solution with two main spaces:

### 📁 Off Chain Space
**Fast, free document management**
- AI-powered NDA creation
- Secure document upload (Pitch Decks, Financial Projections, Patents, Cap Tables)
- AI expert review (Financial Analyst, Legal Expert, Business Strategist)
- Email authentication for easy access

### ⛓️ On Chain Space  
**Blockchain-secured features**
- MetaMask wallet connection
- Cryptocurrency payments
- Timestamped secure chat with immutable records
- Blockchain verification for legal compliance

## 🔐 Authentication System

### Dual Authentication Options

#### 📧 Email Authentication (Recommended)
- **Magic Link login** - passwordless, secure
- **Instant access** to Off Chain features
- **No wallet required** to get started
- **Connect wallet later** for On Chain features

#### 🦊 Wallet Authentication  
- **MetaMask integration** for direct blockchain access
- **Full platform access** including payments and timestamped chat
- **Blockchain identity** for maximum security

### Simplified Login Experience
- **Side-by-side authentication** cards
- **Clear feature explanations** for each method
- **Clean, minimal interface** without information overload
- **Progressive enhancement** - start simple, add features as needed

## 🏗️ Platform Architecture

### Main Navigation Structure
```
CrypTalk Platform
├── 📁 Off Chain Space
│   ├── 📝 NDA Creation
│   ├── 📁 Document Upload  
│   └── 🤖 AI Review
└── ⛓️ On Chain Space
    ├── 🦊 Connect Wallet
    ├── 💰 Payments
    └── ⏰ Timestamped Chat
```

### Header & Navigation
- **Centralized branding** - CrypTalk Platform prominently displayed
- **Smart settings menu** - only appears when authenticated
- **Plataforma option** - quick navigation back to main dashboard
- **Clean interface** - no redundant login buttons

## 📋 Feature Details

### Off Chain Features

#### 📝 NDA Creation
- **AI-powered generation** of customized NDAs
- **Legal compliance** templates
- **Quick customization** and editing
- **Reusable templates** for future use

#### 📁 Document Upload
- **Categorized upload** by document type:
  - 💼 Pitch Deck
  - 📊 Financial Projections  
  - 🛡️ Patents
  - 👥 Cap Table
  - 📄 Other Documents
- **Secure storage** with encryption
- **Organized library** for easy management

#### 🤖 AI Review
- **Specialized AI agents** for expert analysis:
  - 💼 **Financial Analyst** - Reviews projections and cap tables
  - ⚖️ **Legal Expert** - Analyzes patents and contracts
  - 🚀 **Business Strategist** - Evaluates pitch decks and business models
- **Detailed reports** with insights and recommendations
- **Domain expertise** for accurate analysis

### On Chain Features

#### 🦊 Wallet Connection
- **MetaMask integration** with user-friendly setup
- **Network detection** and configuration
- **Status indicators** for connection state
- **User profile** with wallet information

#### 💰 Cryptocurrency Payments
- **Secure transactions** via connected wallet
- **Polygon network** for low-cost operations
- **Transaction history** and verification
- **Payment confirmation** system

#### ⏰ Timestamped Secure Chat
- **Blockchain-recorded messages** for immutable history
- **End-to-end encryption** for privacy
- **Legal compliance** with permanent timestamps
- **File sharing** with blockchain proof

## 🛠️ Technical Stack

### Frontend Framework
- **React 18** with TypeScript for type safety
- **Vite** for fast development and building
- **Chakra UI** for consistent, responsive design
- **React Router** for navigation

### Authentication & Security
- **Magic SDK** for email authentication
- **MetaMask** for Web3 wallet integration
- **AES-256-CBC encryption** for file security
- **PBKDF2** for secure key derivation

### Blockchain & Storage
- **Polygon Mumbai** testnet for transactions
- **Web3.Storage/IPFS** for decentralized storage
- **Ethers.js** for blockchain interactions
- **DID (Decentralized Identifiers)** for identity

### Development Tools
- **TypeScript** for enhanced code quality
- **ESLint** for code standards
- **Git** for version control
- **npm** for package management

## ⚙️ Configuration

### Environment Variables
```env
VITE_MAGIC_PUBLISHABLE_KEY=pk_live_20134EF9B8F26232  # Magic Link API
VITE_W3S_AGENT_KEY=your_web3storage_key              # Web3.Storage
VITE_W3S_SPACE_DID=your_space_did                    # Web3.Storage Space
```

### Build Commands
```bash
# Development
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check

# Linting
npm run lint
```

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Header.tsx      # Centralized navigation header
│   ├── Layout.tsx      # Main application layout
│   └── ...            # Other components
├── pages/              # Main application pages
│   ├── Dashboard.tsx   # Main platform with both spaces
│   ├── Login.tsx       # Dual authentication page
│   ├── Settings.tsx    # User settings and preferences
│   └── ...            # Other pages
├── services/           # Core business logic
│   ├── Web3StorageService.ts     # File storage management
│   ├── MagicLinkAuthService.ts   # Email authentication
│   ├── PaymentService.ts         # Crypto payments
│   └── ...                      # Other services
├── contexts/           # React state management
│   └── AuthContext.tsx # Authentication state
└── utils/             # Helper functions and utilities
```

## 🔧 Development Workflow

### Authentication Flow
1. **User visits platform** → Sees dual authentication options
2. **Chooses email login** → Enters email, receives magic link
3. **Accesses Off Chain** → Can create NDAs, upload docs, use AI review
4. **Connects wallet** → Unlocks On Chain features (payments, timestamped chat)

### Feature Development
1. **Off Chain features** → Focus on document management and AI integration
2. **On Chain features** → Integrate with existing blockchain infrastructure
3. **Authentication** → Maintain compatibility with both email and wallet users

## 🔒 Security Features

### File Security
- **Client-side encryption** before upload
- **Company-only decryption** capability
- **Dynamic key generation** per file
- **No persistent key storage**

### Access Control
- **Progressive feature access** based on authentication level
- **Wallet verification** for on-chain features
- **Session management** for persistent login

### Data Privacy
- **End-to-end encryption** for sensitive communications
- **Decentralized storage** for censorship resistance
- **Blockchain verification** for data integrity

## 📈 Recent Updates (v1.1.0)

### Design Improvements
- ✅ **Unified interface style** - consistent card-based design
- ✅ **Simplified navigation** - two main spaces (Off Chain/On Chain)
- ✅ **Centralized header** - focused branding presentation
- ✅ **Clean login page** - minimal information, clear choices

### Authentication Enhancements
- ✅ **Dual authentication** options on single page
- ✅ **MetaMask detection** and helpful error messages
- ✅ **Progressive access** - email first, wallet when needed
- ✅ **Smart navigation** - settings menu only when authenticated

### User Experience
- ✅ **Free navigation** between On Chain buttons
- ✅ **AI agent personas** for document review
- ✅ **Document categorization** for better organization
- ✅ **Streamlined workflow** from NDA creation to secure sharing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📚 Documentation

Additional documentation available:
- [CHANGELOG.md](./CHANGELOG.md) - Recent changes and updates
- [SECURITY_ARCHITECTURE.md](./SECURITY_ARCHITECTURE.md) - Security implementation details
- [TEST-GUIDE.md](./TEST-GUIDE.md) - Testing procedures and guidelines

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Check the documentation in the `docs/` folder
- Review the test guides for troubleshooting
- Contact the development team for technical assistance

---

**CrypTalk Platform** - Secure document sharing with blockchain integration