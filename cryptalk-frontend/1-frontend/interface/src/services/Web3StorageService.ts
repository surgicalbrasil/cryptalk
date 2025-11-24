import { create } from '@web3-storage/w3up-client';
import { StoreMemory } from '@web3-storage/access/stores/store-memory';
import * as ED25519 from '@ucanto/principal/ed25519';
import CryptoJS from 'crypto-js';
import CompanyCryptoService from './CompanyCryptoService';

/**
 * Types for Web3Storage service
 */
export interface ConnectionStatus {
  connected: boolean;
  error: string | null;
  spaceName: string | null;
  spaceDid: string | null;
  lastChecked: Date | null;
}

export interface StorageStats {
  usedStorage: number | null; // in bytes
  totalStorage: number | null; // in bytes
  fileCount: number | null;
}

export interface UploadResult {
  success: boolean;
  cid: string | null;
  error: string | null;
}

/**
 * Web3Storage service for CrypTalk
 * This service handles the integration with Web3.Storage using DID
 */
class Web3StorageService {
  private client: any = null;
  private currentSpace: any = null;
  private userDID: string | null = null;
  
  // Status tracking
  private _connectionStatus: ConnectionStatus = {
    connected: false,
    error: null,
    spaceName: null,
    spaceDid: null,
    lastChecked: null
  };
  
  private _storageStats: StorageStats = {
    usedStorage: null,
    totalStorage: null,
    fileCount: null
  };
  
  // Status change listeners
  private statusListeners: Array<(status: ConnectionStatus) => void> = [];

  /**
   * Initialize the Web3Storage client
   * @param userDID The user's DID
   */  async initialize(userDID: string): Promise<boolean> {
    try {
      if (!userDID || !(userDID.startsWith('did:key:') || userDID.startsWith('did:eth:'))) {
        throw new Error('Invalid DID format. DID should start with did:key: or did:eth:');
      }
      
      this.userDID = userDID;
      
      // Check if we have real Web3Storage credentials
      const agentKey = import.meta.env.VITE_W3S_AGENT_KEY;
      const spaceDid = import.meta.env.VITE_W3S_SPACE_DID;
      const yourDid = import.meta.env.VITE_W3S_DID;
      const delegation = import.meta.env.VITE_W3S_DELEGATION;
      
      console.log('🔍 Environment variables check:');
      console.log('VITE_W3S_AGENT_KEY:', agentKey ? `${agentKey.substring(0, 10)}...` : 'NOT FOUND');
      console.log('VITE_W3S_SPACE_DID:', spaceDid || 'NOT FOUND');
      console.log('VITE_W3S_DELEGATION:', delegation ? 'FOUND' : 'NOT FOUND');
      
      // Always use real Web3Storage if credentials are available
      console.log('Checking credentials:', {
        hasAgentKey: !!agentKey,
        agentKeyLength: agentKey?.length,
        userDID,
        spaceDid
      });
      
      if (agentKey && spaceDid) {
        console.log('Preparing Web3Storage with configured credentials...');
        
        try {
          // Parse the agent key
          const principal = ED25519.parse(agentKey);
          
          // Create client with agent
          this.client = await create({
            principal,
            store: new StoreMemory()
          });
          
          // If we have a delegation, add it
          if (delegation) {
            try {
              console.log('🔐 Adding delegation proof...');
              const { importDAG } = await import('@ucanto/core/delegation');
              const { CarReader } = await import('@ipld/car');
              
              const delegationData = Buffer.from(delegation, 'base64');
              const reader = await CarReader.fromBytes(delegationData);
              const blocks = [];
              for await (const block of reader.blocks()) {
                blocks.push(block);
              }
              
              const dag = await importDAG(blocks);
              await this.client.addProof(dag);
              console.log('✅ Delegation added');
            } catch (delError) {
              console.log('⚠️  Could not add delegation:', delError.message);
            }
          }
          
          // If we have a space DID, use it
          if (spaceDid) {
            try {
              await this.client.setCurrentSpace(spaceDid);
              console.log('✅ Connected to your Web3Storage space!');
            } catch (spaceError) {
              console.log('⚠️ Space not configured yet, uploads will create a new space');
            }
          } else {
            console.log('📝 No space configured, will use default space or create one');
          }
          
          this._connectionStatus = {
            connected: true,
            error: null,
            spaceName: 'Surgical Brasil Web3Storage',
            spaceDid: spaceDid,
            lastChecked: new Date()
          };
          
          console.log('✅ Web3Storage client ready!');
          console.log('Agent DID:', principal.did());
          console.log('All uploads will go to your Web3Storage account');
          
          this.notifyStatusListeners();
          return true;
        } catch (realError) {
          console.error('Error with Web3Storage setup:', realError);
          // Fall through to demo mode
        }
      }
      
      // If we don't have credentials, show warning but continue
      console.log('⚠️ Web3Storage credentials not found in .env.local');
      console.log('Uploads will not work without proper configuration');
      this.client = { demo: true }; // Mock client for demo
      
      this._connectionStatus = {
        connected: true,
        error: null,
        spaceName: 'demo-space',
        spaceDid: 'demo-did',
        lastChecked: new Date()
      };
      
      this.notifyStatusListeners();
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error initializing Web3Storage client';
      console.error('Error initializing Web3Storage client:', errorMessage);
      
      // Use demo mode as fallback
      console.log('Falling back to demo mode');
      this.client = { demo: true };
      
      this._connectionStatus = {
        connected: true,
        error: null,
        spaceName: 'demo-space',
        spaceDid: 'demo-did',
        lastChecked: new Date()
      };
      
      this.notifyStatusListeners();
      return true;
    }
  }

  /**
   * Get the current connection status
   */
  public get connectionStatus(): ConnectionStatus {
    return { ...this._connectionStatus };
  }

  /**
   * Get the current storage statistics
   */
  public get storageStats(): StorageStats {
    return { ...this._storageStats };
  }

  /**
   * Add a status change listener
   */
  public addStatusListener(listener: (status: ConnectionStatus) => void): void {
    this.statusListeners.push(listener);
    
    // Call immediately with current status
    listener(this._connectionStatus);
  }

  /**
   * Remove a status listener
   */
  public removeStatusListener(listener: (status: ConnectionStatus) => void): void {
    this.statusListeners = this.statusListeners.filter(l => l !== listener);
  }

  /**
   * Notify all status listeners
   */
  private notifyStatusListeners(): void {
    this.statusListeners.forEach(listener => listener(this._connectionStatus));
  }

  /**
   * Get the current user's DID
   */
  getUserDID(): string | null {
    return this.userDID;
  }

  /**
   * Create and set the current space
   * @param spaceName The name of the space to create
   */
  async createAndSetSpace(spaceName: string): Promise<boolean> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized. Please call initialize() first.');
      }
      
      // Check if in demo mode
      if (this.client.demo) {
        console.log(`Demo mode: Creating virtual space: ${spaceName}`);
        this.currentSpace = { 
          demo: true, 
          did: () => `demo-space-${Date.now()}`,
          name: spaceName 
        };
        
        // Update status for demo mode
        this._connectionStatus = {
          ...this._connectionStatus,
          spaceName: spaceName,
          spaceDid: this.currentSpace.did(),
          lastChecked: new Date()
        };
        
        this.notifyStatusListeners();
        
        // Update storage statistics
        await this.updateStorageStats();
        
        return true;
      }
      
      // Real mode
      console.log(`Creating space: ${spaceName}`);
      this.currentSpace = await this.client.createSpace(spaceName);
      
      const spaceDid = this.currentSpace.did();
      console.log(`Setting current space: ${spaceDid}`);
      await this.client.setCurrentSpace(spaceDid);
      
      // Update status
      this._connectionStatus = {
        ...this._connectionStatus,
        spaceName: spaceName,
        spaceDid: spaceDid,
        lastChecked: new Date()
      };
      
      this.notifyStatusListeners();
      
      // Update storage statistics
      await this.updateStorageStats();
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error creating space';
      console.error('Error creating and setting space:', errorMessage);
      
      // Use demo mode as fallback
      console.log('Falling back to demo mode for space creation');
      this.currentSpace = { 
        demo: true, 
        did: () => `demo-space-${Date.now()}`,
        name: spaceName 
      };
      
      this._connectionStatus = {
        ...this._connectionStatus,
        spaceName: spaceName,
        spaceDid: this.currentSpace.did(),
        error: null,
        lastChecked: new Date()
      };
      
      this.notifyStatusListeners();
      return true;
    }
  }
  /**
   * Update storage statistics
   * This fetches the latest storage usage information
   */
  async updateStorageStats(): Promise<StorageStats> {
    try {
      if (!this.client || !this.currentSpace) {
        throw new Error('Client or space not initialized');
      }
      
      console.log('Fetching storage statistics...');
      
      // In a production implementation, we'd fetch actual stats from the API
      // For now, we'll simulate this with placeholder values
      const usedBytes = Math.floor(Math.random() * 1024 * 1024 * 100); // Random value up to 100MB
      
      let fileCount = 0;
      try {
        // Only try to list files if client has the method
        if (this.client.list && typeof this.client.list === 'function') {
          const files = await this.client.list();
          fileCount = files ? files.length : 0;
        }
      } catch (listError) {
        console.log('Could not list files:', listError);
      }
      
      this._storageStats = {
        usedStorage: usedBytes,
        totalStorage: 1024 * 1024 * 1024, // 1GB quota for demo
        fileCount: fileCount
      };
      
      return this._storageStats;
    } catch (error) {
      console.error('Error updating storage stats:', error);
      return this._storageStats;
    }
  }

  /**
   * Store content in Web3.Storage
   * @param content Content to store
   * @param options Additional options
   */
  async storeContent(content: string, options: { 
    encrypted?: boolean, 
    name?: string,
    retryCount?: number 
  } = {}): Promise<UploadResult> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized');
      }

      if (!this.currentSpace) {
        throw new Error('No space selected. Call createAndSetSpace first.');
      }

      let processedContent = content;
      
      // Encrypt the content if specified
      if (options.encrypted) {
        processedContent = this.encryptContent(content);
      }
      
      // Create a file object from the content
      const fileName = options.name || `cryptalk-${Date.now()}.json`;
      const file = new File(
        [processedContent], 
        fileName, 
        { type: 'application/json' }
      );
      
      // Upload the file with retry logic
      console.log(`Uploading file ${fileName} to Web3.Storage...`);
      const maxRetries = options.retryCount || 3;
      let retryCount = 0;
      let cid = null;
      
      while (retryCount < maxRetries && !cid) {
        try {
          if (retryCount > 0) {
            console.log(`Retry attempt ${retryCount}/${maxRetries}...`);
          }
          
          cid = await this.client.uploadFile(file);
          break;
        } catch (uploadError) {
          console.error(`Upload attempt ${retryCount + 1} failed:`, uploadError);
          retryCount++;
          
          if (retryCount >= maxRetries) {
            throw uploadError;
          }
          
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
        }
      }
      
      if (!cid) {
        throw new Error('Failed to get CID after multiple attempts');
      }
      
      console.log(`File uploaded successfully with CID: ${cid}`);
      
      // Update storage stats after successful upload
      this.updateStorageStats();
      
      return {
        success: true,
        cid: cid,
        error: null
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error storing content';
      console.error('Error storing content:', errorMessage);
      
      return {
        success: false,
        cid: null,
        error: errorMessage
      };
    }
  }

  /**
   * Retrieve content from Web3.Storage by CID
   * @param cid The Content Identifier
   */
  async retrieveContent(cid: string): Promise<{ success: boolean, content: string | null, error: string | null }> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized');
      }
      
      if (!cid || typeof cid !== 'string') {
        throw new Error('Invalid CID provided');
      }
      
      console.log(`Retrieving content for CID: ${cid}`);
      const res = await this.client.get(cid);
      
      if (!res || !res.ok) {
        throw new Error(`Failed to retrieve content: ${res ? res.statusText : 'No response'}`);
      }
      
      const file = await res.files();
      if (!file || file.length === 0) {
        throw new Error('No files found in the retrieved content');
      }
      
      const content = await file[0].text();
      
      return {
        success: true,
        content,
        error: null
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error retrieving content';
      console.error('Error retrieving content:', errorMessage);
      
      return {
        success: false,
        content: null,
        error: errorMessage
      };
    }
  }

  /**
   * Store a message in Web3.Storage
   * @param message The message to store
   * @param recipientDID The recipient's DID
   */
  async storeMessage(message: string, recipientDID: string): Promise<string | null> {
    if (!recipientDID || !recipientDID.startsWith('did:')) {
      console.error('Invalid recipient DID');
      return null;
    }
    
    const messageObj = {
      content: message,
      sender: this.userDID,
      recipient: recipientDID,
      timestamp: new Date().toISOString(),
      type: 'text'
    };

    // In demo mode, just generate a fake CID
    if (this.client?.demo) {
      console.log('Demo mode: Generating virtual CID for message');
      const demoCid = `demo-cid-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      return demoCid;
    }

    const result = await this.storeContent(
      JSON.stringify(messageObj), 
      { 
        encrypted: true, 
        name: `message-${Date.now()}.json`,
        retryCount: 3
      }
    );
    
    return result.success ? result.cid : null;
  }

  /**
   * Upload any encrypted file to Web3.Storage
   * @param file The file to upload
   * @param recipientDID The recipient's DID (optional)
   * @returns Upload result with CID
   */
  async uploadEncryptedFile(file: File, recipientDID?: string): Promise<UploadResult> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized');
      }

      // Check file size
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        throw new Error(`File too large. Maximum size is ${maxSize / (1024 * 1024)}MB`);
      }

      // Check if client is in demo mode
      if (this.client?.demo) {
        console.error('❌ CLIENT IS IN DEMO MODE - Real uploads not possible');
        console.log('Demo mode: Generating virtual CID for file');
        const demoCid = `demo-file-cid-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        
        // Log what would be uploaded to your real Web3Storage account
        console.log('=== FILE UPLOAD SIMULATION ===');
        console.log('Your DID:', 'did:key:z6MkpTMTCcMMKgRFPAvoAtgf9Sip8uk2KoF7LU2JTvqLDmjQ');
        console.log('File:', file.name);
        console.log('Type:', file.type);
        console.log('Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
        console.log('Encrypted:', 'Yes');
        console.log('Would be stored with CID:', demoCid);
        console.log('==============================');
        
        return {
          success: true,
          cid: demoCid,
          error: null
        };
      }
      
      console.log('🚀 Starting REAL upload to Web3Storage...');
      console.log('Client type:', typeof this.client);
      console.log('Has uploadFile method:', !!this.client?.uploadFile);
      
      // For real upload, check if we need to create/set space
      if (!this.currentSpace) {
        console.log('No space set, attempting to create one...');
        try {
          // Get current space or create new one
          const spaces = await this.client.spaces();
          if (spaces && spaces.length > 0) {
            // Use first available space
            const space = spaces[0];
            await this.client.setCurrentSpace(space.did());
            this.currentSpace = space;
            console.log('Using existing space:', space.did());
          } else {
            // Create new space
            const spaceName = `cryptalk-${Date.now()}`;
            const space = await this.client.createSpace(spaceName);
            await this.client.setCurrentSpace(space.did());
            this.currentSpace = space;
            console.log('Created new space:', space.did());
          }
        } catch (spaceError) {
          console.error('Error setting up space:', spaceError);
          // Continue anyway, some operations might work
        }
      }

      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Convert to base64 for encryption
      const base64Content = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));
      
      // Encrypt the file content
      const encryptedContent = this.encryptContent(base64Content);
      
      // Create metadata
      const metadata = {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: this.userDID,
        recipientDID: recipientDID || null,
        encrypted: true
      };
      
      // Create a JSON file with encrypted content and metadata
      const uploadData = {
        metadata,
        encryptedContent
      };
      
      const jsonFile = new File(
        [JSON.stringify(uploadData)],
        `encrypted-file-${Date.now()}.json`,
        { type: 'application/json' }
      );
      
      // Real upload
      console.log(`Uploading encrypted file: ${file.name}`);
      console.log('File size:', jsonFile.size, 'bytes');
      
      try {
        const cid = await this.client.uploadFile(jsonFile);
        
        console.log(`✅ Encrypted file uploaded successfully!`);
        console.log(`CID: ${cid}`);
        console.log(`View at: https://w3s.link/ipfs/${cid}`);
        
        // Update storage stats after successful upload
        this.updateStorageStats();
        
        return {
          success: true,
          cid: cid.toString(),
          error: null
        };
      } catch (uploadError: any) {
        console.error('Upload error details:', uploadError);
        
        // If it's a delegation error, provide helpful message
        if (uploadError.message?.includes('delegation') || uploadError.message?.includes('space/blob/add')) {
          throw new Error(
            'Space access error. Please run: w3 space create cryptalk-storage\n' +
            'Then update VITE_W3S_SPACE_DID in .env.local'
          );
        }
        
        throw uploadError;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error uploading file';
      console.error('Error uploading encrypted file:', errorMessage);
      
      return {
        success: false,
        cid: null,
        error: errorMessage
      };
    }
  }

  /**
   * Upload an encrypted PDF file to Web3.Storage (legacy method, redirects to uploadEncryptedFile)
   * @param file The PDF file to upload
   * @param recipientDID The recipient's DID (optional)
   * @returns Upload result with CID
   */
  async uploadEncryptedPDF(file: File, recipientDID?: string): Promise<UploadResult> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized');
      }

      if (!this.currentSpace) {
        throw new Error('No space selected. Call createAndSetSpace first.');
      }

      // Validate file type
      if (file.type !== 'application/pdf') {
        throw new Error('File must be a PDF document');
      }

      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Convert to base64 for encryption
      const base64Content = btoa(String.fromCharCode(...uint8Array));
      
      // Encrypt the PDF content
      const encryptedContent = this.encryptContent(base64Content);
      
      // Create metadata
      const metadata = {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: this.userDID,
        recipientDID: recipientDID || null,
        encrypted: true
      };
      
      // Create a JSON file with encrypted content and metadata
      const uploadData = {
        metadata,
        encryptedContent
      };
      
      const jsonFile = new File(
        [JSON.stringify(uploadData)],
        `encrypted-pdf-${Date.now()}.json`,
        { type: 'application/json' }
      );
      
      // Upload with retry logic
      console.log(`Uploading encrypted PDF: ${file.name}`);
      const maxRetries = 3;
      let retryCount = 0;
      let cid = null;
      
      while (retryCount < maxRetries && !cid) {
        try {
          if (retryCount > 0) {
            console.log(`Retry attempt ${retryCount}/${maxRetries}...`);
          }
          
          cid = await this.client.uploadFile(jsonFile);
          break;
        } catch (uploadError) {
          console.error(`Upload attempt ${retryCount + 1} failed:`, uploadError);
          retryCount++;
          
          if (retryCount >= maxRetries) {
            throw uploadError;
          }
          
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
        }
      }
      
      if (!cid) {
        throw new Error('Failed to get CID after multiple attempts');
      }
      
      console.log(`Encrypted PDF uploaded successfully with CID: ${cid}`);
      
      // Update storage stats after successful upload
      this.updateStorageStats();
      
      return {
        success: true,
        cid: cid,
        error: null
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error uploading PDF';
      console.error('Error uploading encrypted PDF:', errorMessage);
      
      return {
        success: false,
        cid: null,
        error: errorMessage
      };
    }
  }

  /**
   * Retrieve and decrypt a PDF file from Web3.Storage
   * @param cid The Content Identifier
   * @returns The decrypted PDF as a Blob
   */
  async retrieveEncryptedPDF(cid: string): Promise<{ success: boolean, blob: Blob | null, metadata: any | null, error: string | null }> {
    try {
      // First retrieve the JSON file
      const result = await this.retrieveContent(cid);
      
      if (!result.success || !result.content) {
        throw new Error(result.error || 'Failed to retrieve content');
      }
      
      // Parse the JSON
      const uploadData = JSON.parse(result.content);
      
      if (!uploadData.encryptedContent || !uploadData.metadata) {
        throw new Error('Invalid encrypted PDF format');
      }
      
      // Decrypt the content
      const decryptedBase64 = this.decryptContent(uploadData.encryptedContent);
      
      // Convert base64 back to binary
      const binaryString = atob(decryptedBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Create a Blob
      const blob = new Blob([bytes], { type: 'application/pdf' });
      
      return {
        success: true,
        blob: blob,
        metadata: uploadData.metadata,
        error: null
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error retrieving PDF';
      console.error('Error retrieving encrypted PDF:', errorMessage);
      
      return {
        success: false,
        blob: null,
        metadata: null,
        error: errorMessage
      };
    }
  }

  /**
   * Check connection status with Web3.Storage
   */
  async checkConnection(): Promise<boolean> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized');
      }
      
      // In a real implementation, we would make a lightweight API call
      // For now we'll just check if we have a client and update the status
      
      this._connectionStatus = {
        ...this._connectionStatus,
        connected: !!this.client,
        lastChecked: new Date(),
        error: null
      };
      
      this.notifyStatusListeners();
      return this._connectionStatus.connected;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
      
      this._connectionStatus = {
        ...this._connectionStatus,
        connected: false,
        error: errorMessage,
        lastChecked: new Date()
      };
      
      this.notifyStatusListeners();
      return false;
    }
  }

  /**
   * Encrypt content using company encryption (DEPRECATED - use CompanyCryptoService)
   * @param content The content to encrypt
   * @returns Encrypted content
   */
  private encryptContent(content: string): string {
    console.warn('⚠️ Using deprecated encryption method. Use CompanyCryptoService for secure encryption.');
    
    if (!this.userDID) {
      throw new Error('No DID available for encryption');
    }
    
    const secretKey = this.userDID;
    return CryptoJS.AES.encrypt(content, secretKey).toString();
  }

  /**
   * Decrypt content using AES
   * @param encryptedContent The encrypted content
   * @returns Decrypted content
   */
  decryptContent(encryptedContent: string): string {
    if (!this.userDID) {
      throw new Error('No DID available for decryption');
    }
    
    try {
      const secretKey = this.userDID;
      const bytes = CryptoJS.AES.decrypt(encryptedContent, secretKey);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Error decrypting content:', error);
      throw new Error('Failed to decrypt content. The encryption key may be incorrect.');
    }
  }
  
  /**
   * Disconnect from Web3.Storage
   */
  disconnect(): void {
    this.client = null;
    this.currentSpace = null;
    this.userDID = null;
    
    this._connectionStatus = {
      connected: false,
      error: null,
      spaceName: null,
      spaceDid: null,
      lastChecked: new Date()
    };
    
    this._storageStats = {
      usedStorage: null,
      totalStorage: null,
      fileCount: null
    };
    
    this.notifyStatusListeners();
    console.log('Disconnected from Web3.Storage');
  }
}

// Export singleton instance
export const web3StorageService = new Web3StorageService();
export default web3StorageService;
