/**
 * CrypTalk Application Configuration
 */

export const AppConfig = {
  // Application information
  appName: 'CrypTalk',
  appDescription: 'Secure messaging with Web3.Storage DID authentication and MCP integration',
  
  // Service provider information
  serviceProvider: {
    name: 'Surgical Brasil',
    walletAddress: '0x650687aD5F50E2DF6763f300BCAC9E03B4B4fCb6',
    did: 'did:key:z6MkpTMTCcMMKgRFPAvoAtgf9Sip8uk2KoF7LU2JTvqLDmjQ' // Official Surgical Brasil DID
  },
  
  // Payment configuration
  payment: {
    defaultNetwork: 'polygon',
    networkRPC: 'https://rpc-mumbai.maticvigil.com',
    // For production, use mainnet: 'https://polygon-rpc.com'
  },
  
  // Storage configuration
  storage: {
    useMCP: true,
    encryptData: true,
    allowedFileTypes: ['image/*', 'application/pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip'],
    maxFileSize: 100 * 1024 * 1024, // 100MB
  }
};

/**
 * Helper functions
 */
export const getRecipientWalletAddress = (): string => {
  return AppConfig.serviceProvider.walletAddress;
};

export const getRecipientDID = (): string => {
  return AppConfig.serviceProvider.did;
};

export default AppConfig;
