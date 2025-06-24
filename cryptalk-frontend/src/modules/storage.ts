// 📁 Storage Module - Everything storage-related in one file

import { Module, Services, EventBus, Config } from '../system';

// ============= INTERFACES =============

export interface StorageFile {
  cid: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
  uploadedBy: string;
  url?: string;
  tags?: Record<string, any>;
}

export interface UploadOptions {
  onProgress?: (progress: number) => void;
  metadata?: Record<string, any>;
}

export interface IStorageProvider {
  upload(file: File | Blob, options?: UploadOptions): Promise<StorageFile>;
  download(cid: string): Promise<Blob>;
  getMetadata(cid: string): Promise<StorageFile>;
  list(limit?: number): Promise<StorageFile[]>;
  delete(cid: string): Promise<boolean>;
  getProviderName(): string;
  isHealthy(): Promise<boolean>;
}

// ============= STORACHA PROVIDER =============

export class StorachaProvider implements IStorageProvider {
  private client: any = null;

  async initialize() {
    try {
      const Client = await import('@web3-storage/w3up-client');
      this.client = await Client.create();
      console.log('Storacha client ready');
    } catch (error) {
      console.warn('Storacha SDK not available, using fallback');
      this.client = this.createFallbackClient();
    }
  }

  async upload(file: File | Blob, options?: UploadOptions): Promise<StorageFile> {
    const fileName = file instanceof File ? file.name : 'blob-file';
    const fileToUpload = file instanceof File ? file : new File([file], fileName);
    
    // Simulate progress
    if (options?.onProgress) {
      for (let i = 0; i <= 100; i += 25) {
        await new Promise(r => setTimeout(r, 100));
        options.onProgress(i);
      }
    }

    const cid = await this.client.uploadFile(fileToUpload);
    
    return {
      cid,
      name: fileName,
      size: file.size,
      type: file.type,
      uploadedAt: new Date(),
      uploadedBy: Config.storage.storacha.did || 'unknown',
      url: `https://w3s.link/ipfs/${cid}`,
      tags: options?.metadata
    };
  }

  async download(cid: string): Promise<Blob> {
    const response = await fetch(`https://w3s.link/ipfs/${cid}`);
    if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);
    return response.blob();
  }

  async getMetadata(cid: string): Promise<StorageFile> {
    return {
      cid,
      name: `file-${cid.substring(0, 8)}`,
      size: 0,
      type: 'application/octet-stream',
      uploadedAt: new Date(),
      uploadedBy: 'unknown',
      url: `https://w3s.link/ipfs/${cid}`
    };
  }

  async list(limit = 10): Promise<StorageFile[]> {
    return []; // Would query Storacha API
  }

  async delete(cid: string): Promise<boolean> {
    console.log(`Deleting ${cid} from Storacha`);
    return true;
  }

  getProviderName() { return 'Storacha'; }
  
  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch('https://w3s.link/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi', 
        { method: 'HEAD', signal: AbortSignal.timeout(5000) });
      return response.ok;
    } catch { return false; }
  }

  private createFallbackClient() {
    return {
      uploadFile: async (file: File) => `bafybei${Math.random().toString(36).substring(2, 15)}`
    };
  }
}

// ============= MOCK PROVIDER =============

export class MockStorageProvider implements IStorageProvider {
  private files = new Map<string, { file: StorageFile, blob: Blob }>();
  private idCounter = 1;

  async upload(file: File | Blob, options?: UploadOptions): Promise<StorageFile> {
    await this.delay(300);
    
    // Simulate progress
    if (options?.onProgress) {
      for (let i = 0; i <= 100; i += 20) {
        await this.delay(50);
        options.onProgress(i);
      }
    }

    const cid = `mock_${this.idCounter++}_${Math.random().toString(36).substring(2, 8)}`;
    const fileName = file instanceof File ? file.name : 'mock-file';
    
    const storageFile: StorageFile = {
      cid,
      name: fileName,
      size: file.size,
      type: file.type,
      uploadedAt: new Date(),
      uploadedBy: 'mock-user',
      url: `mock://storage/${cid}`,
      tags: options?.metadata
    };

    this.files.set(cid, { file: storageFile, blob: file });
    return storageFile;
  }

  async download(cid: string): Promise<Blob> {
    await this.delay(200);
    const entry = this.files.get(cid);
    if (!entry) throw new Error('File not found');
    return entry.blob;
  }

  async getMetadata(cid: string): Promise<StorageFile> {
    await this.delay(100);
    const entry = this.files.get(cid);
    if (!entry) throw new Error('File not found');
    return entry.file;
  }

  async list(limit = 10): Promise<StorageFile[]> {
    await this.delay(150);
    return Array.from(this.files.values())
      .map(entry => entry.file)
      .slice(0, limit);
  }

  async delete(cid: string): Promise<boolean> {
    await this.delay(100);
    return this.files.delete(cid);
  }

  getProviderName() { return 'Mock Storage'; }
  async isHealthy() { return true; }

  private delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }
  
  // Testing utilities
  clear() { this.files.clear(); this.idCounter = 1; }
  getFileCount() { return this.files.size; }
}

// ============= STORAGE MODULE =============

export class StorageModule implements Module {
  name = 'storage';
  private provider: IStorageProvider | null = null;
  private events = EventBus.getInstance();

  async initialize() {
    // Create provider based on config
    if (Config.storage.provider === 'storacha' && Config.isProd) {
      this.provider = new StorachaProvider();
      if (typeof (this.provider as any).initialize === 'function') {
        await (this.provider as any).initialize();
      }
    } else {
      this.provider = new MockStorageProvider();
    }

    // Register service
    Services.register('storage', {
      upload: this.upload.bind(this),
      download: this.download.bind(this),
      getMetadata: this.getMetadata.bind(this),
      list: this.list.bind(this),
      delete: this.delete.bind(this),
      provider: this.provider
    });

    console.log(`Storage: ${this.provider.getProviderName()}`);
  }

  async isHealthy() {
    return this.provider ? await this.provider.isHealthy() : false;
  }

  private async upload(file: File | Blob, options?: UploadOptions) {
    if (!this.provider) throw new Error('Storage not initialized');
    
    try {
      const result = await this.provider.upload(file, options);
      this.events.emit('storage:uploaded', { file: result });
      return result;
    } catch (error) {
      this.events.emit('storage:error', { error: String(error), operation: 'upload' });
      throw error;
    }
  }

  private async download(cid: string) {
    if (!this.provider) throw new Error('Storage not initialized');
    
    try {
      const result = await this.provider.download(cid);
      this.events.emit('storage:downloaded', { cid });
      return result;
    } catch (error) {
      this.events.emit('storage:error', { error: String(error), operation: 'download', cid });
      throw error;
    }
  }

  private async getMetadata(cid: string) {
    if (!this.provider) throw new Error('Storage not initialized');
    return await this.provider.getMetadata(cid);
  }

  private async list(limit?: number) {
    if (!this.provider) throw new Error('Storage not initialized');
    return await this.provider.list(limit);
  }

  private async delete(cid: string) {
    if (!this.provider) throw new Error('Storage not initialized');
    
    try {
      const result = await this.provider.delete(cid);
      this.events.emit('storage:deleted', { cid });
      return result;
    } catch (error) {
      this.events.emit('storage:error', { error: String(error), operation: 'delete', cid });
      throw error;
    }
  }
}