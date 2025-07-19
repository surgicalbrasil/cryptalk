// Authentication Types
export interface AuthUser {
  id: string;
  email?: string;
  walletAddress?: string;
  did?: string;
  isEmailVerified: boolean;
  isWalletConnected: boolean;
  createdAt: Date;
  lastLogin: Date;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
  token?: string;
}

export interface WalletConnection {
  address: string;
  chainId: number;
  network: string;
  balance?: string;
  isConnected: boolean;
}

export interface MagicLinkAuth {
  email: string;
  token: string;
  expiresAt: Date;
}

export type AuthMethod = 'email' | 'wallet' | 'both';
export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'error';