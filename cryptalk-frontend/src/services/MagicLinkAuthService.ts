import { Magic } from 'magic-sdk';
import { MagicRPCProviderModule } from '@magic-sdk/provider';

interface AuthUser {
  email: string;
  publicAddress: string;
  isLoggedIn: boolean;
  walletConnected: boolean;
  walletAddress?: string;
}

class MagicLinkAuthService {
  private magic: Magic | null = null;
  private currentUser: AuthUser | null = null;
  private static instance: MagicLinkAuthService;

  private constructor() {
    // Initialize Magic instance with your publishable API key
    if (typeof window !== 'undefined') {
      try {
        // Using the provided Magic Link public key
        this.magic = new Magic('pk_live_20134EF9B8F26232', {
          network: 'polygon-mumbai' // Using Mumbai testnet to match the blockchain config
        });
        
        // Debug: Check what methods are available
        console.log('Magic SDK initialized. Available user methods:', Object.getOwnPropertyNames(this.magic.user));
      } catch (error) {
        console.error('Failed to initialize Magic SDK:', error);
      }
    }
  }

  static getInstance(): MagicLinkAuthService {
    if (!MagicLinkAuthService.instance) {
      MagicLinkAuthService.instance = new MagicLinkAuthService();
    }
    return MagicLinkAuthService.instance;
  }

  async loginWithEmail(email: string): Promise<AuthUser> {
    if (!this.magic) {
      throw new Error('Magic SDK not initialized');
    }

    try {
      // Send Magic Link email - this will trigger email sending but not wait for completion
      await this.magic.auth.loginWithMagicLink({ email });
      
      // For Magic Link, the actual authentication happens when user clicks the link
      // We should return success for email sending, but the user object will be set
      // when they actually click the link and return to the app
      
      // Create a preliminary user object indicating email was sent
      this.currentUser = {
        email: email,
        publicAddress: '', // Will be filled when user completes Magic Link flow
        isLoggedIn: false, // Not yet logged in until they click the link
        walletConnected: false
      };

      // Store pending auth state
      localStorage.setItem('magicAuthPending', JSON.stringify({
        email: email,
        timestamp: Date.now()
      }));

      return this.currentUser;
    } catch (error) {
      console.error('Magic Link login error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    if (!this.magic) return;

    try {
      await this.magic.user.logout();
      this.currentUser = null;
      localStorage.removeItem('magicAuth');
      localStorage.removeItem('walletConnection');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  async isLoggedIn(): Promise<boolean> {
    if (!this.magic) return false;

    try {
      const isLoggedIn = await this.magic.user.isLoggedIn();
      
      if (isLoggedIn) {
        // User has completed Magic Link authentication
        if (!this.currentUser || !this.currentUser.isLoggedIn) {
          try {
            // Get user info after successful Magic Link authentication
            const metadata = await this.magic.user.getMetadata();
            this.currentUser = {
              email: metadata.email || '',
              publicAddress: metadata.publicAddress || '',
              isLoggedIn: true,
              walletConnected: this.checkWalletConnection()
            };

            // Update localStorage with complete auth state
            localStorage.setItem('magicAuth', JSON.stringify({
              email: this.currentUser.email,
              publicAddress: this.currentUser.publicAddress,
              timestamp: Date.now()
            }));

            // Clear pending state
            localStorage.removeItem('magicAuthPending');
          } catch (infoError) {
            console.warn('Could not get user info, but user is logged in:', infoError);
            // Use pending email if available
            const pending = localStorage.getItem('magicAuthPending');
            if (pending) {
              const { email } = JSON.parse(pending);
              this.currentUser = {
                email: email,
                publicAddress: '',
                isLoggedIn: true,
                walletConnected: false
              };
            }
          }
        }
      }

      return isLoggedIn;
    } catch (error) {
      console.error('Check login status error:', error);
      return false;
    }
  }

  async connectWallet(walletAddress: string): Promise<void> {
    if (!this.currentUser) {
      throw new Error('User must be logged in to connect wallet');
    }

    // Link wallet to email account
    this.currentUser.walletConnected = true;
    this.currentUser.walletAddress = walletAddress;

    // Store wallet connection
    localStorage.setItem('walletConnection', JSON.stringify({
      email: this.currentUser.email,
      walletAddress: walletAddress,
      connectedAt: Date.now()
    }));
  }

  disconnectWallet(): void {
    if (this.currentUser) {
      this.currentUser.walletConnected = false;
      this.currentUser.walletAddress = undefined;
    }
    localStorage.removeItem('walletConnection');
  }

  private checkWalletConnection(): boolean {
    const walletData = localStorage.getItem('walletConnection');
    if (!walletData) return false;

    try {
      const { email, walletAddress } = JSON.parse(walletData);
      if (this.currentUser && this.currentUser.email === email) {
        this.currentUser.walletAddress = walletAddress;
        return true;
      }
    } catch (error) {
      console.error('Error checking wallet connection:', error);
    }

    return false;
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  isWalletConnected(): boolean {
    return this.currentUser?.walletConnected || false;
  }

  getWalletAddress(): string | undefined {
    return this.currentUser?.walletAddress;
  }

  getMagicProvider(): MagicRPCProviderModule | null {
    return this.magic ? this.magic.rpcProvider : null;
  }
}

export default MagicLinkAuthService;
export type { AuthUser };