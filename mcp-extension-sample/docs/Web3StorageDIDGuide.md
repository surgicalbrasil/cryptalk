# Web3.Storage DID Guide for CrypTalk

This guide explains how to set up Web3.Storage DID (Decentralized Identifier) authentication for the CrypTalk application.

## What is a DID?

A Decentralized Identifier (DID) is a new type of identifier that enables verifiable, self-sovereign digital identity. In CrypTalk, we use DIDs for secure authentication with Web3.Storage, allowing you to store and retrieve your encrypted conversations in a decentralized manner.

## Prerequisites

Before you begin, make sure you have the following installed:
- **Node.js (v16 or higher)** - [Download from nodejs.org](https://nodejs.org/)
- **npm** (comes with Node.js)
- **PowerShell** (for Windows users) or Terminal (for macOS/Linux users)

## Using the setup-w3up.ps1 Script (Windows)

CrypTalk provides a PowerShell script (`setup-w3up.ps1`) that automates the process of installing the Web3.Storage CLI and generating your DID.

### Step 1: Run the Setup Script

1. Open PowerShell as Administrator
2. Navigate to the CrypTalk project folder
3. Run the setup script:

```powershell
cd path\to\CrypTalk\mcp-extension-sample\setup\windows
.\setup-w3up.ps1
```

### Step 2: Follow the Script Prompts

1. The script will check if you have the required Node.js version
2. It will install the Web3.Storage CLI tool (`@web3-storage/w3cli`) globally
3. You'll be prompted to create a Web3.Storage account:
   - Provide your email address
   - Follow the email verification process
   - Complete the account creation steps

### Step 3: Get Your DID

After account creation, the script will display your DID (starting with `did:key:`). **Copy this value** as you'll need it to configure CrypTalk.

## Manual Setup (Alternative Method)

If you prefer to set up manually or are using macOS/Linux, follow these steps:

1. Install the Web3.Storage CLI tool:
```bash
npm install -g @web3-storage/w3cli
```

2. Create a Web3.Storage account:
```bash
w3 account create
```
Follow the prompts and verify your email address.

3. Retrieve your DID:
```bash
w3 did
```
Copy the output DID value.

## Configuring CrypTalk with Your DID

After obtaining your DID:

1. Open VS Code with the CrypTalk extension installed
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) to open the command palette
3. Run `CrypTalk: Configure Web3.Storage with DID`
4. Paste your DID when prompted
5. Test the connection with `CrypTalk: Test Web3.Storage DID Connection`

## Troubleshooting

### Common Issues:

1. **Node.js version error**: Ensure you have Node.js v16 or higher installed
   ```bash
   node -v
   ```
   If you need to upgrade, download the latest version from [nodejs.org](https://nodejs.org/).

2. **w3cli installation fails**: Try installing with admin privileges or check for network issues.

3. **Email verification not received**: Check your spam folder or try again with a different email address.

4. **DID not working with CrypTalk**: Ensure you copied the entire DID string correctly. The DID should start with `did:key:` followed by a long string of characters.

### Getting Help

If you encounter issues:
- Check the CrypTalk documentation
- Submit an issue in the CrypTalk repository
- Contact the CrypTalk team via the support channels listed in the project README

## Technical Background

The Web3.Storage DID is based on the `did:key` method, which represents cryptographic public keys as DIDs. When you create a Web3.Storage account, a key pair is generated locally on your machine. The public key becomes part of your DID, while the private key remains secured on your system.

CrypTalk uses this DID for authentication with Web3.Storage's API, enabling secure storage and retrieval of your encrypted conversations without requiring traditional username/password credentials.

## Security Considerations

- **Never share your private keys** or configuration files with anyone
- Your DID is public information, but it only works when paired with the private key stored on your system
- If you suspect your keys are compromised, create a new account and update your CrypTalk configuration

## Further Reading

- [Web3.Storage Documentation](https://web3.storage/docs/)
- [DID Specification](https://www.w3.org/TR/did-core/)
- [IPFS (InterPlanetary File System)](https://ipfs.io/)