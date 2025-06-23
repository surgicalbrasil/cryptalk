# 🔐 CrypTalk Security Architecture

## Overview

CrypTalk implements a comprehensive security architecture combining user-friendly authentication with military-grade encryption for sensitive medical data.

## 🗝️ Authentication Security

### Email Authentication (Magic Link)
- **No Password Storage**: Passwordless authentication
- **Time-Limited Links**: Magic links expire after use
- **Email Verification**: Built-in email ownership verification
- **Session Management**: Secure session tokens

### Wallet Authentication (MetaMask)
- **Cryptographic Signatures**: Web3 signature verification
- **No Private Key Exposure**: Keys never leave MetaMask
- **Network Verification**: Ensures correct blockchain network
- **Address Validation**: Verifies wallet ownership

## 🔐 Encryption Architecture

### File Encryption Process
```
Original File
    ↓
AES-256-CBC Encryption
    ↓
Unique FileId Generation (SHA256)
    ↓
IPFS Upload (Encrypted File)
    ↓
Metadata Storage (Private)
```

### Key Management System

#### No Persistent Storage Policy
- **Memory-Only Keys**: Encryption keys exist only in RAM
- **On-Demand Derivation**: Keys generated when needed
- **No Local Storage**: Keys never written to disk
- **Session Cleanup**: Keys cleared on logout

#### Key Derivation Flow
```typescript
1. Master Key Derivation:
   - User requests decryption
   - MetaMask signature requested
   - PBKDF2(signature, companyDID, 100000 iterations)
   - Master key generated in memory

2. File-Specific Key:
   - PBKDF2(masterKey, fileId, 10000 iterations)
   - Unique key per file
   - Used for AES decryption
   - Immediately discarded after use
```

### Encryption Standards
- **Algorithm**: AES-256-CBC
- **Key Size**: 256 bits
- **IV**: Random 128-bit initialization vector
- **Padding**: PKCS7
- **Key Derivation**: PBKDF2 with high iteration count

## 🛡️ Access Control

### Role-Based Access
```
Email Users:
├── Off-chain chat
├── Basic file upload
├── Public information
└── No blockchain access

Wallet Users:
├── All email user features
├── On-chain chat
├── Encrypted file storage
├── Payment processing
└── Blockchain timestamps
```

### Company-Only Decryption
- **Single Decryption Key**: Only Surgical Brasil wallet
- **Wallet Address Verification**: Hard-coded company address
- **Signature Validation**: Each decryption requires signature
- **Audit Trail**: All decryption attempts logged

## 📁 Storage Security

### IPFS/Web3.Storage
- **Public Network**: Files visible by CID
- **Encrypted Content**: Files encrypted before upload
- **No Plain Text**: All sensitive data encrypted
- **Distributed Storage**: No single point of failure

### Metadata Protection
```json
{
  "public": {
    "cid": "QmXxx...",        // IPFS content ID
    "uploadDate": "2024-01-23",
    "fileType": "medical/scan"
  },
  "private": {
    "fileId": "sha256...",     // Decryption key
    "patientId": "encrypted",
    "metadata": "encrypted"
  }
}
```

## 🔒 Communication Security

### Off-Chain Messages
- **Transport**: HTTPS/WSS
- **Storage**: Temporary/volatile
- **Access**: Email authentication
- **Encryption**: Optional E2E

### On-Chain Messages
- **Protocol**: CrypTalk SDK
- **Encryption**: Mandatory E2E
- **Storage**: Blockchain permanent
- **Timestamps**: Immutable proof

## 🚨 Security Best Practices

### For Developers
1. **Never Log Keys**: No console.log for sensitive data
2. **Clear Memory**: Explicitly clear keys after use
3. **Validate Inputs**: Sanitize all user inputs
4. **Check Signatures**: Verify all blockchain signatures
5. **Audit Regularly**: Review access logs

### For Users
1. **Secure Email**: Use strong email security
2. **MetaMask Safety**: Never share seed phrases
3. **Verify Addresses**: Check wallet addresses
4. **Network Awareness**: Ensure correct network
5. **Private Keys**: Keep MetaMask secure

## 🔍 Audit & Compliance

### Logging Strategy
- **Authentication Events**: All logins tracked
- **File Access**: Upload/download logged
- **Blockchain Interactions**: All transactions recorded
- **Decryption Attempts**: Company access logged

### HIPAA Compliance
- **Encryption at Rest**: All medical data encrypted
- **Encryption in Transit**: HTTPS/WSS enforced
- **Access Controls**: Role-based permissions
- **Audit Trails**: Comprehensive logging
- **Data Integrity**: Blockchain timestamps

## 🚀 Security Roadmap

### Current Implementation
- ✅ Dual authentication system
- ✅ AES-256 file encryption
- ✅ Company-only decryption
- ✅ Memory-only key storage
- ✅ PBKDF2 key derivation

### Future Enhancements
- ⏳ Hardware security module (HSM) integration
- ⏳ Multi-signature decryption
- ⏳ Zero-knowledge proofs
- ⏳ Homomorphic encryption
- ⏳ Decentralized key management

## 🆘 Security Incident Response

### Breach Protocol
1. **Immediate Actions**:
   - Revoke affected sessions
   - Rotate encryption keys
   - Notify affected users
   - Lock affected accounts

2. **Investigation**:
   - Analyze access logs
   - Identify breach vector
   - Assess data exposure
   - Document findings

3. **Remediation**:
   - Patch vulnerabilities
   - Update security measures
   - User communication
   - Regulatory compliance

## 📞 Security Contacts

- **Security Team**: security@surgicalbrasil.com
- **Bug Bounty**: bounty@surgicalbrasil.com
- **Compliance**: compliance@surgicalbrasil.com