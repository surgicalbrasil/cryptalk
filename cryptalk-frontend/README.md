# CrypTalk Frontend

A dual-authentication decentralized messaging platform that combines user-friendly email login with blockchain security. Features Magic Link authentication for easy access and MetaMask integration for advanced Web3 features, including encrypted file storage, timestamped messaging, and cryptocurrency payments.

## Getting Started

### Prerequisites

- Node.js v16 or higher
- npm (comes with Node.js)
- Email address for Magic Link authentication
- MetaMask wallet (optional, for blockchain features)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/cryptalk.git
cd cryptalk/cryptalk-frontend

# Install dependencies
npm install
```

### Running the Application

#### Using the Provided Scripts

For Windows users, we provide two options:

1. **Using the Batch file**:
   - Double-click the `start-cryptalk-dev.bat` file in the root directory

2. **Using PowerShell**:
   - Right-click the `Start-CrypTalk.ps1` file 
   - Select "Run with PowerShell"

#### Manual Start

```bash
# Navigate to the frontend directory
cd cryptalk-frontend

# Start the development server
npm run dev
```

The application will be available at http://localhost:5173/ (or another port if 5173 is in use).

### Authentication Options

CrypTalk now offers dual authentication methods:

#### 1. Email Authentication (Recommended for new users)
- Simply enter your email address
- Receive a Magic Link in your email
- Click the link to access the platform immediately
- No wallet or crypto knowledge required

#### 2. MetaMask Authentication (For blockchain features)
- Connect your MetaMask wallet
- Required for on-chain features:
  - Encrypted file storage
  - Timestamped messages
  - Cryptocurrency payments
  - Blockchain records

## Features

### 🔐 Authentication & Access
- **Dual Authentication System**: Email login for easy access, wallet for blockchain features
- **Magic Link Integration**: User-friendly email authentication
- **Progressive Enhancement**: Basic features with email, advanced features with wallet
- **Seamless Wallet Connection**: Connect MetaMask when needed for on-chain features

### 💬 Messaging
- **Off-Chain Chat**: Free messaging with email authentication
- **On-Chain Chat**: Blockchain-timestamped messages for legal compliance
- **End-to-End Encryption**: All messages encrypted for privacy
- **CrypTalk Protocol**: Compatible with CrypTalk SDK for on-chain features

### 📁 File Storage
- **Encrypted File Upload**: AES-256-CBC encryption before storage
- **IPFS/Web3.Storage**: Decentralized file storage
- **Company-Only Decryption**: Only Surgical Brasil can decrypt files
- **Dynamic Key Generation**: Unique encryption keys for each file

### 💰 Payments & Blockchain
- **Cryptocurrency Payments**: Send payments via connected wallet
- **Transaction Records**: Blockchain-verified payment history
- **Polygon Network**: Using Mumbai testnet for low-cost transactions
- **Smart Contract Integration**: For secure payment processing

### 🎯 User Experience
- **On Chain Dashboard**: Dedicated section for blockchain features
- **User Profile**: View authentication status and feature access
- **Responsive Design**: Works on desktop and mobile
- **Progressive Disclosure**: Features appear as capabilities unlock

## Project Structure

- `src/components/`: UI components
- `src/contexts/`: React contexts for state management
- `src/pages/`: Application pages/routes
- `src/services/`: Core application services
- `src/utils/`: Utility functions and helpers

## Key Services

### Authentication Services

#### MagicLinkAuthService
Manages email-based authentication flow.
- Sends Magic Link emails for passwordless login
- Manages user sessions with email authentication
- Links email accounts to wallet addresses
- Handles wallet connection state

#### AuthContext
Unified authentication state management.
- Supports dual authentication (email + wallet)
- Manages user session persistence
- Handles authentication transitions
- Provides authentication status to components

### Storage & Encryption Services

#### CompanyCryptoService
Handles file encryption for secure storage.
- AES-256-CBC encryption for files
- Dynamic key generation using PBKDF2
- Company-only decryption capability
- Unique fileId generation for each upload

#### Web3StorageService
Manages decentralized file storage.
- Web3.Storage/IPFS integration
- Space management and delegation
- CID generation and retrieval
- Support for both email and wallet users

### Messaging Services

#### OffChainChatService
Free messaging for all users.
- No blockchain fees required
- Email authentication sufficient
- Real-time message delivery
- Basic file sharing capabilities

#### OnChainChatService
Blockchain-secured messaging.
- CrypTalk protocol integration
- Immutable message timestamps
- Encrypted message storage
- Requires wallet connection

### Payment & Blockchain Services

#### PaymentService
Cryptocurrency transaction management.
- MetaMask integration
- Polygon network support
- Transaction history tracking
- Wallet connection verification

#### AccessControlService
Manages feature access based on authentication.
- Wallet requirement checks
- Feature gating logic
- Progressive enhancement support

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Run the development server:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
```

## Security Architecture

### Encryption & Key Management
- **No Persistent Key Storage**: Encryption keys are derived on-demand, never stored
- **Company-Only Decryption**: Only Surgical Brasil's wallet can decrypt files
- **Dynamic Key Generation**: Each file gets a unique encryption key
- **PBKDF2 Key Derivation**: 100,000 iterations for master key security

### File Storage Security
- **Client-Side Encryption**: Files encrypted before upload
- **IPFS Public Storage**: Encrypted files stored on public IPFS
- **Private Key Management**: fileId stored privately, not on blockchain
- **Access Control**: Wallet verification for on-chain features

## Usage Workflow

### For Email Users (Basic Features)
1. Enter email address on login page
2. Click Magic Link in email
3. Access off-chain chat immediately
4. Upload files to Web3.Storage
5. Connect wallet when ready for advanced features

### For Wallet Users (Full Features)
1. Login with email first
2. Navigate to "On Chain" section
3. Connect MetaMask wallet
4. Access timestamped chat
5. Make cryptocurrency payments
6. Store files with blockchain proof

## Technologies Used

### Frontend Framework
- **React 18** with TypeScript
- **Vite** for fast build tooling
- **Chakra UI** for responsive components
- **React Router** for navigation

### Authentication
- **Magic SDK** for email authentication
- **MetaMask** for Web3 wallet integration
- **DID (Decentralized Identifiers)** for identity

### Blockchain & Storage
- **Polygon Mumbai** testnet for transactions
- **Web3.Storage/IPFS** for decentralized storage
- **Ethers.js** for blockchain interactions
- **CrypTalk Protocol** for on-chain messaging

### Security
- **CryptoJS** for AES encryption
- **PBKDF2** for key derivation
- **Web3 signatures** for authentication

## API Keys & Configuration

Required environment variables:
```env
VITE_MAGIC_PUBLISHABLE_KEY=pk_live_20134EF9B8F26232  # Magic Link API
VITE_W3S_AGENT_KEY=your_web3storage_key              # Web3.Storage
VITE_W3S_SPACE_DID=your_space_did                    # Web3.Storage Space
```

## Contributing

See [CHANGELOG.md](./CHANGELOG.md) for recent updates and changes.

## License

This project is licensed under the MIT License.
