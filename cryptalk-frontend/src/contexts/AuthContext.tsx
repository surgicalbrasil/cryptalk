// AuthContext.tsx
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import web3StorageService from '../services/Web3StorageService';
import type { ConnectionStatus } from '../services/Web3StorageService';
// Removed messaging and payment services for simplified data room
import MagicLinkAuthService, { type AuthUser } from '../services/MagicLinkAuthService';
import { sendMagicLink, isLoggedIn, getUserInfo } from '../services/SimpleMagicAuth';
import { TEST_MODE, MOCK_USER, TEST_CONFIG } from '../config/testMode';

interface AuthResult {
  success: boolean;
  error?: string;
}

interface AuthContextType {
  did: string | null;
  walletAddress: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  loginError: string | null;
  login: (did: string, useMCP?: boolean) => Promise<AuthResult>;
  logout: () => Promise<void>;
  connectionStatus: ConnectionStatus;
  isMetaMaskAuthenticated: () => boolean;
  // Magic Link authentication
  user: AuthUser | null;
  isEmailAuthenticated: boolean;
  isWalletConnected: boolean;
  loginWithEmail: (email: string) => Promise<AuthResult>;
  connectWallet: () => Promise<AuthResult>;
  disconnectWallet: () => void;
}

const AuthContext = createContext<AuthContextType>({
  did: null,
  walletAddress: null,
  isAuthenticated: false,
  isInitialized: false,
  isLoading: false,
  loginError: null,
  login: async () => ({ success: false }),
  logout: async () => {},
  connectionStatus: {
    connected: false,
    error: null,
    spaceName: null,
    spaceDid: null,
    lastChecked: null
  },
  isMetaMaskAuthenticated: () => false,
  // Magic Link defaults
  user: null,
  isEmailAuthenticated: false,
  isWalletConnected: false,
  loginWithEmail: async () => ({ success: false }),
  connectWallet: async () => ({ success: false }),
  disconnectWallet: () => {}
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [did, setDid] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    error: null,
    spaceName: null,
    spaceDid: null,
    lastChecked: null
  });

  // Magic Link state
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isEmailAuthenticated, setIsEmailAuthenticated] = useState<boolean>(false);
  const [isWalletConnected, setIsWalletConnected] = useState<boolean>(false);
  const magicAuthService = MagicLinkAuthService.getInstance();

  // Update connection status when it changes
  useEffect(() => {
    const handleStatusChange = (status: ConnectionStatus) => {
      setConnectionStatus(status);
    };
    
    web3StorageService.addStatusListener(handleStatusChange);
    
    return () => {
      web3StorageService.removeStatusListener(handleStatusChange);
    };
  }, []);

  // Check for existing Magic Link session or enable test mode
  useEffect(() => {
    const checkMagicSession = async () => {
      // Enable test mode if configured
      if (TEST_MODE) {
        console.log('🧪 TEST MODE ENABLED - Using mock authentication');
        setUser(MOCK_USER as AuthUser);
        setIsEmailAuthenticated(true);
        setIsWalletConnected(true);
        setIsAuthenticated(true);
        setIsInitialized(true);
        setDid(MOCK_USER.did);
        setWalletAddress(MOCK_USER.walletAddress);
        return;
      }

      try {
        const isLoggedIn = await magicAuthService.isLoggedIn();
        if (isLoggedIn) {
          const currentUser = magicAuthService.getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
            setIsEmailAuthenticated(true);
            setIsWalletConnected(currentUser.walletConnected);
            setIsAuthenticated(true);
          }
        }
      } catch (error) {
        console.error('Error checking Magic Link session:', error);
      }
    };

    checkMagicSession();
  }, []);

  // Attempt to restore session from localStorage if available
  useEffect(() => {
    // Skip localStorage check in test mode
    if (TEST_MODE) {
      return;
    }

    const storedDID = localStorage.getItem('cryptalk_did');
    const storedMCP = localStorage.getItem('cryptalk_use_mcp') === 'true';
    
    if (storedDID) {
      // Auto-login with stored DID
      login(storedDID, storedMCP).catch(err => {
        console.error('Failed to auto-login:', err);
        // Clear stored credentials on failed auto-login
        localStorage.removeItem('cryptalk_did');
        localStorage.removeItem('cryptalk_use_mcp');
      });
    } else {
      // No stored credentials, just mark as initialized
      setIsInitialized(true);
    }
  }, []);
  
  // Login function
  const login = async (userDID: string, useMCP: boolean = false): Promise<AuthResult> => {
    setIsLoading(true);
    setLoginError(null);
    
    try {
      // Validate DID format - accept both did:key: (Web3.Storage) and did:eth: (MetaMask)
      if (!userDID || !(userDID.startsWith('did:key:') || userDID.startsWith('did:eth:'))) {
        throw new Error('Invalid DID format. DID should start with did:key: or did:eth:');
      }
      
      // Initialize Web3Storage service
      console.log('Initializing Web3.Storage with DID...');
      const success = await web3StorageService.initialize(userDID);
      
      if (!success) {
        const status = web3StorageService.connectionStatus;
        throw new Error(status.error || 'Failed to initialize Web3Storage');
      }

      // Only create space if not already configured
      const spaceDID = import.meta.env.VITE_W3S_SPACE_DID;
      if (!spaceDID || web3StorageService.connectionStatus.spaceDid === 'pending') {
        // Generate a unique space name for new users
        console.log('Creating storage space...');
        const spaceName = `cryptalk-space-${Date.now().toString().slice(-6)}`;
        const spaceSuccess = await web3StorageService.createAndSetSpace(spaceName);
        
        if (!spaceSuccess) {
          const status = web3StorageService.connectionStatus;
          throw new Error(status.error || 'Failed to create and set space');
        }
      } else {
        console.log('Using configured space:', spaceDID);
      }

      // Services removed for simplified data room interface

      // Store credentials for auto-login
      localStorage.setItem('cryptalk_did', userDID);
      localStorage.setItem('cryptalk_use_mcp', useMCP.toString());

      // Update authentication state
      setDid(userDID);
      
      // Extract wallet address from MetaMask DID if applicable
      if (userDID.startsWith('did:eth:')) {
        // Format: did:eth:0x1234...
        const address = userDID.split(':')[2];
        setWalletAddress(address);
      } else if (window.ethereum?.selectedAddress) {
        // If using Web3Storage DID but MetaMask is connected
        setWalletAddress(window.ethereum.selectedAddress);
      }
      
      setIsAuthenticated(true);
      setIsInitialized(true);
      
      console.log('Login successful');
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown login error';
      console.error('Login error:', errorMessage);
      setLoginError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      // Clean up services
      web3StorageService.disconnect();
      
      // Logout from Magic Link if authenticated
      if (isEmailAuthenticated) {
        await magicAuthService.logout();
        setUser(null);
        setIsEmailAuthenticated(false);
        setIsWalletConnected(false);
      }
      
      // Remove stored credentials
      localStorage.removeItem('cryptalk_did');
      localStorage.removeItem('cryptalk_use_mcp');
      
      // Update state
      setDid(null);
      setWalletAddress(null);
      setIsAuthenticated(false);
      setLoginError(null);
      
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Magic Link email login
  const loginWithEmail = async (email: string): Promise<AuthResult> => {
    setIsLoading(true);
    setLoginError(null);
    
    try {
      // Use real Magic Link
      const result = await sendMagicLink(email);
      
      if (result.success) {
        // User completed Magic Link flow, get user info
        const userInfo = await getUserInfo();
        
        const authUser = {
          email: userInfo?.email || email,
          publicAddress: userInfo?.publicAddress || '',
          isLoggedIn: true,
          walletConnected: false
        };
        
        setUser(authUser);
        setIsEmailAuthenticated(true);
        setIsWalletConnected(false);
        setIsAuthenticated(true);
        setIsInitialized(true);
        
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Email login failed';
      console.error('Magic Link login error:', errorMessage);
      setLoginError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Connect wallet for on-chain features
  const connectWallet = async (): Promise<AuthResult> => {
    if (!isEmailAuthenticated) {
      return { success: false, error: 'Must be logged in with email first' };
    }

    try {
      // Check if MetaMask is available
      if (!window.ethereum) {
        return { success: false, error: 'MetaMask not installed' };
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        return { success: false, error: 'No accounts found' };
      }

      const walletAddress = accounts[0];
      
      // Connect wallet in Magic Link service
      await magicAuthService.connectWallet(walletAddress);
      
      // Update state
      setWalletAddress(walletAddress);
      setIsWalletConnected(true);
      
      // Update user object
      if (user) {
        const updatedUser = { ...user, walletConnected: true, walletAddress };
        setUser(updatedUser);
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Wallet connection failed';
      console.error('Wallet connection error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Disconnect wallet
  const disconnectWallet = (): void => {
    magicAuthService.disconnectWallet();
    setWalletAddress(null);
    setIsWalletConnected(false);
    
    if (user) {
      const updatedUser = { ...user, walletConnected: false, walletAddress: undefined };
      setUser(updatedUser);
    }
  };
  
  // Check if user is authenticated with MetaMask
  const isMetaMaskAuthenticated = (): boolean => {
    return !!did && did.startsWith('did:eth:');
  };

  return (
    <AuthContext.Provider
      value={{
        did,
        walletAddress,
        isAuthenticated,
        isInitialized,
        isLoading,
        loginError,
        connectionStatus: web3StorageService.connectionStatus,
        login,
        logout,
        isMetaMaskAuthenticated,
        // Magic Link values
        user,
        isEmailAuthenticated,
        isWalletConnected,
        loginWithEmail,
        connectWallet,
        disconnectWallet
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
