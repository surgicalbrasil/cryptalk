import * as Client from '@web3-storage/w3up-client';

/**
 * Simplified Web3Storage service for CrypTalk
 * Uses the standard w3up-client approach
 */
class SimpleWeb3Storage {
  private client: any = null;
  private isInitialized = false;

  /**
   * Initialize the client
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🚀 Initializing Simple Web3Storage...');
      
      // Create client (it will use stored session if available)
      this.client = await Client.create();
      
      // Check if we have a current space
      const currentSpace = this.client.currentSpace();
      
      if (!currentSpace) {
        console.log('📦 No current space, need to set one...');
        
        // List available spaces
        const spaces = await this.client.spaces();
        console.log('Available spaces:', spaces.length);
        
        if (spaces.length > 0) {
          // Use the first available space
          const space = spaces[0];
          await this.client.setCurrentSpace(space.did());
          console.log('✅ Using space:', space.name || space.did());
        } else {
          console.log('❌ No spaces available. Please run: w3 space create');
          return false;
        }
      } else {
        console.log('✅ Current space:', currentSpace.name || currentSpace.did());
      }
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('❌ Init error:', error);
      return false;
    }
  }

  /**
   * Upload a file
   */
  async uploadFile(file: File): Promise<{ success: boolean; cid?: string; error?: string }> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      console.log('📤 Uploading file:', file.name);
      console.log('File size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
      
      // Direct upload using the client
      const cid = await this.client.uploadFile(file);
      
      console.log('✅ Upload successful! CID:', cid.toString());
      
      return {
        success: true,
        cid: cid.toString()
      };
    } catch (error: any) {
      console.error('❌ Upload error:', error);
      return {
        success: false,
        error: error.message || 'Upload failed'
      };
    }
  }

  /**
   * Get account info
   */
  async getAccountInfo() {
    try {
      const account = await this.client.account();
      const currentSpace = this.client.currentSpace();
      
      return {
        account: account ? {
          did: account.did(),
          plan: account.plan
        } : null,
        space: currentSpace ? {
          did: currentSpace.did(),
          name: currentSpace.name
        } : null
      };
    } catch (error) {
      console.error('Error getting account info:', error);
      return null;
    }
  }
}

// Singleton instance
export const simpleWeb3Storage = new SimpleWeb3Storage();
export default simpleWeb3Storage;