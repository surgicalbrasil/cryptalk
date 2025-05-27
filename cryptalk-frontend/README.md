# CrypTalk Frontend

A decentralized messaging application that uses Web3.Storage for DID authentication and storage with Model Context Protocol (MCP) integration for off-chain messaging and payment methods.

## Getting Started

### Prerequisites

- Node.js v16 or higher
- npm (comes with Node.js)
- Web3.Storage DID (setup instructions below)

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

### Web3.Storage DID Setup

Before using CrypTalk, you'll need to set up a Web3.Storage DID:

1. Run the setup script in the `mcp-extension-sample/setup/windows` directory:
   ```powershell
   .\setup-w3up.ps1
   ```

2. Follow the prompts to create a Web3.Storage account and get your DID
3. Use this DID to log in to CrypTalk

For detailed instructions, see [Web3StorageDIDGuide.md](../mcp-extension-sample/docs/Web3StorageDIDGuide.md)

## Features

- **Web3.Storage Integration**: Uses decentralized storage with DID authentication
- **Secure Messaging**: Send and receive encrypted messages stored on Web3.Storage
- **Cryptocurrency Payments**: Send payments and store transaction records securely
- **MCP Integration**: Optional integration with the Model Context Protocol for enhanced functionality

## Project Structure

- `src/components/`: UI components
- `src/contexts/`: React contexts for state management
- `src/pages/`: Application pages/routes
- `src/services/`: Core application services
- `src/utils/`: Utility functions and helpers

## Key Services

### Web3StorageService

Handles integration with Web3.Storage using DID authentication.

- Initializes Web3.Storage client
- Creates and manages storage spaces
- Stores and retrieves encrypted content

### MessagingService

Manages messaging functionality between users.

- Sends and receives messages
- Stores messages in Web3.Storage
- Provides optional MCP integration for off-chain messaging

### PaymentService

Handles cryptocurrency transactions.

- Initializes wallet functionality
- Sends cryptocurrency payments
- Stores transaction records in Web3.Storage
- Provides optional MCP integration for payment methods

### MCPService

Handles integration with the Model Context Protocol.

- Connects to MCP messaging server
- Connects to MCP payment server
- Sends messages and payment data through MCP

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

## MCP Integration Demo

The application includes a built-in MCP integration demo that simulates connecting to MCP servers. To use it:

1. Login with any valid DID (must start with "did:")
2. Enable the MCP integration option during login
3. Navigate to the Settings page to connect to MCP servers
4. Use the MCP Integration Test panel to test functionality

## Technologies Used

- React with TypeScript
- Vite for build tooling
- Chakra UI for components
- Web3.Storage for decentralized storage
- Ethers.js for cryptocurrency transactions
- React Router for navigation

## Notes

This is a demo application created to showcase Web3.Storage DID authentication and MCP integration. For production use, additional security measures and error handling would be required.
