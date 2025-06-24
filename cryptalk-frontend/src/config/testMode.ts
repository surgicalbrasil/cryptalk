// Test Mode Configuration
// Set this to true to disable authentication for testing
export const TEST_MODE = true;

// Mock user data for testing
export const MOCK_USER = {
  id: 'test-user-123',
  email: 'test@surgical.com',
  walletAddress: '0x650687aD5F50E2DF6763f300BCAC9E03B4B4fCb6',
  did: 'did:key:z6MkpTMTCcMMKgRFPAvoAtgf9Sip8uk2KoF7LU2JTvqLDmjQ',
  isEmailVerified: true,
  isWalletConnected: true,
  createdAt: new Date('2024-01-01'),
  lastLogin: new Date()
};

// Test configuration
export const TEST_CONFIG = {
  skipAuthChecks: TEST_MODE,
  autoLogin: TEST_MODE,
  mockServices: TEST_MODE,
  showTestBanner: TEST_MODE
};