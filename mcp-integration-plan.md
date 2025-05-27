# MCP Integration Plan for CrypTalk

## Table of Contents
1. [Project Overview & MCP Compatibility Assessment](#1-project-overview--mcp-compatibility-assessment)
2. [MCP Server Implementation Strategy](#2-mcp-server-implementation-strategy)
3. [Technical Implementation Plan](#3-technical-implementation-plan)
4. [Data Source Mapping](#4-data-source-mapping)
5. [Tool Integration Opportunities](#5-tool-integration-opportunities)
6. [Implementation Roadmap](#6-implementation-roadmap)
7. [Configuration Examples](#7-configuration-examples)
8. [Integration Points](#8-integration-points)

## 1. Project Overview & MCP Compatibility Assessment

### Current Tech Stack Summary
- **Frontend**: React 18.2 + TypeScript + Vite + Chakra UI
- **Backend**: Node.js + Express upload server
- **Storage**: Web3Storage (IPFS) with DID authentication
- **Blockchain**: Ethers.js for Web3 interactions
- **Encryption**: CryptoJS with AES-256-GCM
- **Authentication**: MetaMask wallet + DID-based auth

### MCP Integration Feasibility Analysis
The CrypTalk project is **highly compatible** with MCP integration due to:
- Modular service architecture with clear separation of concerns
- Existing MCP extension sample showing prior integration work
- Well-defined APIs and service boundaries
- Encryption/decryption operations suitable for MCP tools
- File storage operations that can be exposed as MCP resources

### Recommended MCP Server Types
1. **Encryption/Decryption Server** - Handle secure operations
2. **Storage Management Server** - Manage Web3Storage operations
3. **User Access Control Server** - Manage permissions and access
4. **Medical Records Server** - Handle document operations
5. **Admin Operations Server** - Administrative functions

## 2. MCP Server Implementation Strategy

### CrypTalk Encryption Server - Secure Document Operations
- **Type**: Custom service
- **Data Sources**: 
  - Company encryption keys
  - User encryption preferences
  - Document metadata
- **Tools to Expose**: 
  - `encryptDocument` - Encrypt files for storage
  - `decryptDocument` - Decrypt files for authorized users
  - `generateSecureKey` - Create encryption keys
  - `verifyAccess` - Check decryption permissions
- **Implementation Priority**: High

### Web3Storage MCP Server - Decentralized Storage Operations
- **Type**: API/Storage hybrid
- **Data Sources**: 
  - Web3Storage API
  - IPFS network
  - DID registry
  - Upload logs
- **Tools to Expose**: 
  - `uploadFile` - Upload encrypted files to IPFS
  - `retrieveFile` - Download files by CID
  - `listUserFiles` - Get user's file inventory
  - `checkStorageQuota` - Monitor storage usage
  - `generateDID` - Create storage DIDs
- **Implementation Priority**: High

### Access Control Server - Permission Management
- **Type**: Database/Custom
- **Data Sources**: 
  - User payment status
  - Access permissions database
  - Wallet addresses
  - Admin controls
- **Tools to Expose**: 
  - `grantAccess` - Grant user access to features
  - `revokeAccess` - Remove user permissions
  - `checkPaymentStatus` - Verify user payment
  - `listActiveUsers` - Get authorized users
  - `generateAccessToken` - Create time-limited tokens
- **Implementation Priority**: High

### Medical Chat Server - Secure Communication
- **Type**: Custom messaging service
- **Data Sources**: 
  - Encrypted message store
  - User conversation history
  - File attachments
- **Tools to Expose**: 
  - `sendSecureMessage` - Send encrypted message
  - `retrieveConversation` - Get chat history
  - `attachMedicalDocument` - Link documents to chats
  - `createConsultation` - Start medical consultation
- **Implementation Priority**: Medium

### Admin Dashboard Server - Administrative Operations
- **Type**: Custom administrative service
- **Data Sources**: 
  - User database
  - System metrics
  - Payment records
  - Access logs
- **Tools to Expose**: 
  - `getUserMetrics` - Get user statistics
  - `processRefund` - Handle refund requests
  - `systemHealthCheck` - Monitor system status
  - `generateReports` - Create usage reports
  - `auditUserActivity` - Review user actions
- **Implementation Priority**: Medium

## 3. Technical Implementation Plan

### MCP Server Setup Locations
```
CrypTalk/
├── mcp-servers/
│   ├── encryption-server/
│   │   ├── index.js
│   │   ├── package.json
│   │   └── config.json
│   ├── storage-server/
│   │   ├── index.js
│   │   ├── package.json
│   │   └── config.json
│   ├── access-control-server/
│   │   ├── index.js
│   │   ├── package.json
│   │   └── config.json
│   ├── medical-chat-server/
│   │   ├── index.js
│   │   ├── package.json
│   │   └── config.json
│   └── admin-server/
│       ├── index.js
│       ├── package.json
│       └── config.json
```

### Required Dependencies
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "ethers": "^6.7.1",
    "@web3-storage/w3up-client": "^17.3.0",
    "crypto-js": "^4.1.1",
    "express": "^5.1.0",
    "dotenv": "^16.5.0"
  }
}
```

### Configuration File Template
```json
{
  "name": "cryptalk-[server-name]",
  "version": "1.0.0",
  "description": "MCP server for [specific functionality]",
  "transport": {
    "type": "stdio"
  },
  "tools": [
    {
      "name": "[tool-name]",
      "description": "[tool description]",
      "parameters": {
        "type": "object",
        "properties": {
          "[param]": {
            "type": "string",
            "description": "[param description]"
          }
        },
        "required": ["[param]"]
      }
    }
  ],
  "resources": [
    {
      "type": "[resource-type]",
      "path": "[resource-path]",
      "description": "[resource description]"
    }
  ]
}
```

### Environment Variable Requirements
```env
# Encryption Server
COMPANY_MASTER_KEY=your-master-encryption-key
ENCRYPTION_SALT=your-encryption-salt

# Storage Server
WEB3_STORAGE_KEY=your-web3-storage-api-key
WEB3_STORAGE_DID=did:key:your-storage-did
WEB3_STORAGE_PROOF=your-delegation-proof

# Access Control
ADMIN_WALLET_ADDRESS=0x650687aD5F50E2DF6763f300BCAC9E03B4B4fCb6
DATABASE_URL=your-database-connection

# Medical Chat
CHAT_ENCRYPTION_KEY=your-chat-encryption-key
MESSAGE_RETENTION_DAYS=30

# Admin Server
ADMIN_API_KEY=your-admin-api-key
METRICS_ENDPOINT=your-metrics-endpoint
```

## 4. Data Source Mapping

### Existing Data Sources → MCP Resources

| Current Data Source | MCP Resource Type | Access Pattern |
|-------------------|------------------|----------------|
| Web3Storage Files | `file` | Read/Write via CID |
| User Permissions | `database` | Query by wallet |
| Encrypted Messages | `message` | Query by conversation |
| Payment Records | `transaction` | Query by user/date |
| System Metrics | `metric` | Real-time streaming |

### Security Considerations
- All MCP servers must implement wallet-based authentication
- Encryption keys never exposed through MCP tools
- Rate limiting on all file operations
- Audit logging for administrative actions
- Encrypted transport for sensitive data

## 5. Tool Integration Opportunities

### Custom Tools to Expose via MCP

#### Document Processing Tools
```javascript
{
  "name": "processMedialDocument",
  "description": "Process and encrypt medical document for storage",
  "parameters": {
    "file": "base64 encoded file",
    "patientId": "patient identifier",
    "documentType": "prescription|lab_result|imaging|other",
    "accessList": "array of authorized wallet addresses"
  }
}
```

#### Payment Verification Tools
```javascript
{
  "name": "verifyPaymentAndGrant",
  "description": "Verify blockchain payment and grant access",
  "parameters": {
    "transactionHash": "blockchain transaction hash",
    "walletAddress": "user wallet address",
    "serviceType": "medical_chat|file_storage|premium"
  }
}
```

#### Analytics Tools
```javascript
{
  "name": "generateUsageReport",
  "description": "Generate system usage analytics",
  "parameters": {
    "dateRange": "start and end dates",
    "reportType": "users|storage|payments|all",
    "format": "json|csv|pdf"
  }
}
```

### New Tools That Would Enhance the Project

1. **Automated Backup Tool** - Schedule encrypted backups
2. **Compliance Checker** - Verify HIPAA/LGPD compliance
3. **Bulk User Onboarding** - Import multiple users
4. **Emergency Access Override** - Medical emergency access
5. **Smart Contract Deployment** - Deploy payment contracts

## 6. Implementation Roadmap

### Phase 1: Basic MCP Setup (Week 1-2)
- [ ] Set up MCP server infrastructure
- [ ] Implement encryption server with basic tools
- [ ] Create storage server for Web3Storage operations
- [ ] Basic authentication middleware
- [ ] Unit tests for core functionality

### Phase 2: Core Integrations (Week 3-4)
- [ ] Integrate access control server with existing permissions
- [ ] Connect medical chat server to messaging service
- [ ] Implement file upload/download through MCP
- [ ] Add payment verification tools
- [ ] Integration testing

### Phase 3: Advanced Features (Week 5-6)
- [ ] Admin dashboard server implementation
- [ ] Analytics and reporting tools
- [ ] Bulk operations support
- [ ] Performance optimization
- [ ] Security audit

### Testing and Validation Steps
1. **Unit Testing**: Each MCP tool individually
2. **Integration Testing**: Server interactions
3. **Security Testing**: Penetration testing
4. **Performance Testing**: Load testing with concurrent users
5. **User Acceptance Testing**: With medical professionals

## 7. Configuration Examples

### MCP Server Configuration
```json
{
  "name": "cryptalk-encryption",
  "version": "1.0.0",
  "transport": {
    "type": "stdio"
  },
  "authentication": {
    "type": "wallet",
    "required": true
  },
  "tools": [
    {
      "name": "encryptMedicalDocument",
      "description": "Encrypt medical document with company key",
      "parameters": {
        "type": "object",
        "properties": {
          "document": {
            "type": "string",
            "description": "Base64 encoded document"
          },
          "metadata": {
            "type": "object",
            "description": "Document metadata"
          }
        },
        "required": ["document"]
      }
    }
  ]
}
```

### Client Connection Example
```javascript
import { MCPClient } from '@modelcontextprotocol/sdk';

const encryptionClient = new MCPClient({
  name: 'cryptalk-encryption',
  version: '1.0.0',
  transport: 'stdio',
  auth: {
    type: 'wallet',
    address: userWalletAddress,
    signature: walletSignature
  }
});

// Use the encryption tool
const result = await encryptionClient.callTool('encryptMedicalDocument', {
  document: documentBase64,
  metadata: {
    patientId: '12345',
    documentType: 'prescription',
    uploadDate: new Date().toISOString()
  }
});
```

### Authentication Setup
```javascript
// Wallet-based authentication middleware
async function authenticateWallet(req, res, next) {
  const { address, signature, message } = req.headers;
  
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    if (recoveredAddress.toLowerCase() === address.toLowerCase()) {
      req.user = { address };
      next();
    } else {
      res.status(401).json({ error: 'Invalid signature' });
    }
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
}
```

## 8. Integration Points

### MCP → Existing Systems

#### Storage Integration
```javascript
// MCP Tool → Web3StorageService
async function uploadViaMCP(params) {
  const { file, encrypt } = params;
  
  // Use existing service
  const web3Storage = new Web3StorageService();
  
  if (encrypt) {
    const encrypted = await CompanyCryptoService.encrypt(file);
    return await web3Storage.uploadFile(encrypted);
  }
  
  return await web3Storage.uploadFile(file);
}
```

#### Chat Integration
```javascript
// MCP Tool → OnChainChatService
async function sendSecureMessage(params) {
  const { recipientAddress, message, attachments } = params;
  
  const chatService = new OnChainChatService();
  return await chatService.sendMessage({
    to: recipientAddress,
    content: message,
    attachments,
    encrypted: true
  });
}
```

#### API Endpoints to MCP-Enable
- `POST /api/upload` → `uploadDocument` MCP tool
- `GET /api/files/:cid` → `retrieveDocument` MCP tool
- `POST /api/chat/send` → `sendMessage` MCP tool
- `GET /api/admin/users` → `listUsers` MCP tool
- `POST /api/payment/verify` → `verifyPayment` MCP tool

### Database Access Patterns via MCP
```javascript
// Resource provider for user data
class UserResourceProvider {
  async getResource(path) {
    // path format: user/{walletAddress}/profile
    const [, walletAddress, resourceType] = path.split('/');
    
    switch (resourceType) {
      case 'profile':
        return await getUserProfile(walletAddress);
      case 'files':
        return await getUserFiles(walletAddress);
      case 'access':
        return await getUserAccess(walletAddress);
      default:
        throw new Error('Unknown resource type');
    }
  }
}
```

### Development Workflow Integration
1. **VS Code Extension**: Enhanced with MCP tools
2. **CLI Tools**: MCP-powered command line interface
3. **Admin Dashboard**: MCP client for management
4. **Mobile App**: Future MCP client integration
5. **Third-party Integration**: MCP API gateway

## Potential Challenges and Solutions

### Challenge 1: Key Management
**Solution**: Use hardware security modules (HSM) or secure enclaves for master keys

### Challenge 2: Performance with Large Files
**Solution**: Implement chunked upload/download with progress tracking

### Challenge 3: Multi-tenant Isolation
**Solution**: Namespace MCP servers per organization with strict access controls

### Challenge 4: Compliance Requirements
**Solution**: Built-in audit logging and compliance reporting tools

## Conclusion

The MCP integration will transform CrypTalk into a more modular, extensible, and developer-friendly platform. By exposing core functionality through MCP servers, we enable:

- Third-party integrations
- Enhanced security through isolation
- Better testing and monitoring
- Simplified development workflow
- Future-proof architecture

The phased approach ensures minimal disruption while maximizing the benefits of MCP integration.