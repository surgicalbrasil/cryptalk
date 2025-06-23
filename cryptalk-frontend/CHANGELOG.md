# CrypTalk Changelog

## [1.1.0] - 2024-01-23

### 🎯 Major Features Added

#### Dual Authentication System
- **Magic Link Email Authentication**: Users can now login with just their email address
- **Progressive Enhancement**: Email login for basic features, wallet connection for advanced features
- **User-Friendly Onboarding**: No wallet required to start using the platform
- **Seamless Wallet Integration**: Connect MetaMask when needed for on-chain features

#### On Chain Dashboard
- **New Navigation Tab**: Added dedicated "On Chain" section in main navigation
- **Wallet Connection Management**: Visual status and connection interface
- **Secure Payments Interface**: Cryptocurrency payment processing
- **Timestamped Chat**: Blockchain-recorded messages with immutable timestamps

### 🔧 Technical Improvements

#### Authentication Architecture
- **MagicLinkAuthService**: New service for email authentication flow
- **Updated AuthContext**: Supports dual authentication states (email + wallet)
- **WalletConnectionModal**: Smart modal for requesting wallet connection
- **useWalletConnection Hook**: Manages wallet requirement logic

#### Security Enhancements
- **File Encryption**: AES-256-CBC encryption for all uploaded files
- **Key Management**: Dynamic key derivation from wallet signatures
- **Private Key Storage**: No persistent storage of encryption keys
- **Company-Only Decryption**: Only Surgical Brasil wallet can decrypt files

#### Service Updates
- **OnChainChatService**: Added wallet connection verification
- **PaymentService**: Wallet requirement checks for transactions
- **CompanyCryptoService**: Enhanced encryption with unique fileIds

### 📋 Components Added
- `UserProfile.tsx`: Displays authentication status and feature access
- `WalletConnectionModal.tsx`: Handles wallet connection requests
- `OnChain.tsx`: Comprehensive on-chain features dashboard
- `useWalletConnection.ts`: Custom hook for wallet management

### 🔄 Workflow Changes
- **Login Flow**: Email authentication as default, MetaMask as option
- **ClientWorkflow**: Simplified 3-step process (Chat → Payment → Upload)
- **Navigation**: Added "On Chain" to main navigation bar
- **Progressive Features**: Wallet connection only when needed

### 🔐 Security & Compliance
- **Dual Authentication**: Email for access, wallet for blockchain features
- **Encrypted Storage**: All files encrypted before IPFS upload
- **Blockchain Timestamps**: Immutable records for legal compliance
- **Access Control**: Service-level checks for wallet connection

### 🐛 Bug Fixes
- Fixed Magic SDK method calls (getMetadata vs getInfo)
- Corrected routing to show email login as default
- Updated tab navigation for proper wallet requirement checks
- Fixed authentication state persistence

### 📚 Documentation
- Updated README with dual authentication information
- Added comprehensive changelog
- Enhanced architecture documentation
- Improved security documentation

### 🔗 Dependencies
- Added `magic-sdk` and `@magic-sdk/provider` for email authentication
- Updated all authentication flows to support dual methods
- Enhanced Web3Storage integration with encryption layer

### ⚙️ Configuration
- Magic Link API key integration (pk_live_20134EF9B8F26232)
- Polygon Mumbai testnet configuration
- Environment variable structure for API keys

### 🎨 UI/UX Improvements
- Clear authentication status badges
- Progressive disclosure of features
- Intuitive wallet connection prompts
- Responsive navigation for mobile and desktop

---

## Previous Versions

### [1.0.0] - Initial Release
- Basic Web3Storage integration
- MetaMask-only authentication
- Off-chain and on-chain chat
- File upload functionality
- Payment processing