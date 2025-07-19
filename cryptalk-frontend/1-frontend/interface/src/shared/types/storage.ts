// Storage Types
export interface StorageFile {
  id: string;
  name: string;
  size: number;
  type: string;
  cid: string;
  uploadedAt: Date;
  uploadedBy: string;
  encrypted: boolean;
  category: DocumentCategory;
  metadata?: FileMetadata;
}

export interface FileMetadata {
  originalName: string;
  mimeType: string;
  checksum: string;
  encryptionMethod?: string;
  compressionRatio?: number;
  tags?: string[];
}

export interface StorageProvider {
  name: string;
  type: 'ipfs' | 'web3storage' | 'arweave';
  endpoint: string;
  apiKey?: string;
  spaceId?: string;
}

export interface UploadProgress {
  fileId: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  error?: string;
}

export interface StorageStats {
  totalFiles: number;
  totalSize: number;
  usedSpace: number;
  availableSpace: number;
  storageQuota: number;
}

export type DocumentCategory = 
  | 'medical-records'
  | 'contracts'
  | 'financial'
  | 'patents'
  | 'presentations'
  | 'other';

export interface EncryptionConfig {
  algorithm: 'AES-256-GCM' | 'AES-256-CBC';
  keyDerivation: 'PBKDF2' | 'scrypt';
  iterations: number;
}