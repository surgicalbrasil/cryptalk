/**
 * Interface para serviços de Upload e Gerenciamento de Arquivos
 * Gerencia uploads, validação e transferência de forma modular
 */

export interface FileMetadata {
  id: string;
  originalName: string;
  safeFileName: string;
  documentType: DocumentType;
  clientId: string;
  size: number;
  hash: string;
  uploadedAt: Date;
  mimeType: string;
  status: 'uploading' | 'ready' | 'processing' | 'archived' | 'error';
  path?: string;
  metadata?: Record<string, any>;
}

export interface UploadConfig {
  maxFileSize: number;
  allowedExtensions: string[];
  allowedMimeTypes: string[];
  uploadPath: string;
  tempPath: string;
  securityValidation: boolean;
}

export interface DocumentTypeConfig {
  extensions: string[];
  maxSize: number;
  mimeTypes: string[];
  validationRules?: {
    requiresSignature?: boolean;
    allowsEncryption?: boolean;
    maxPages?: number;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  detectedType?: string;
  securityFlags?: {
    hasMacros: boolean;
    isEncrypted: boolean;
    isPasswordProtected: boolean;
    suspiciousContent: boolean;
  };
}

export interface FileStats {
  totalUploads: number;
  totalSize: number;
  uploadsByType: Record<DocumentType, number>;
  failures: number;
  averageSize: number;
  totalSizeMB: number;
  lastCleanup: Date;
}

export type DocumentType = 'pitch-deck' | 'financial' | 'legal' | 'technical' | 'patent';

export interface IFileService {
  // Upload Processing
  processUpload(fileBuffer: Buffer, originalName: string, documentType: DocumentType, clientId: string): Promise<FileMetadata>;
  validateFile(fileBuffer: Buffer, originalName: string, documentType: DocumentType): Promise<ValidationResult>;
  generateFileMetadata(fileBuffer: Buffer, originalName: string, documentType: DocumentType, clientId: string): Promise<FileMetadata>;
  
  // File Operations
  saveFile(fileMetadata: FileMetadata, fileBuffer: Buffer): Promise<string>;
  readFile(fileId: string): Promise<Buffer>;
  deleteFile(fileId: string): Promise<void>;
  moveFile(fileId: string, newPath: string): Promise<void>;
  
  // Metadata Management
  getFileMetadata(fileId: string): Promise<FileMetadata | null>;
  updateFileMetadata(fileId: string, updates: Partial<FileMetadata>): Promise<FileMetadata>;
  listFiles(clientId?: string, documentType?: DocumentType): Promise<FileMetadata[]>;
  
  // Validation
  validateFileByType(fileBuffer: Buffer, documentType: DocumentType): Promise<ValidationResult>;
  detectMimeType(fileName: string, fileBuffer?: Buffer): Promise<string>;
  validateSecure(fileBuffer: Buffer): Promise<ValidationResult>;
  
  // Configuration
  getUploadConfig(documentType?: DocumentType): UploadConfig | DocumentTypeConfig;
  updateConfig(config: Partial<UploadConfig>): Promise<void>;
  getAllowedTypes(): DocumentType[];
  
  // Statistics
  getStats(): Promise<FileStats>;
  getStatsForClient(clientId: string): Promise<Partial<FileStats>>;
  
  // Maintenance
  cleanupExpiredFiles(): Promise<number>;
  archiveOldFiles(olderThan: Date): Promise<number>;
  validateStorage(): Promise<{
    available: boolean;
    freeSpace: number;
    totalSpace: number;
    issues: string[];
  }>;
  
  // Events
  on(event: 'file_uploaded' | 'file_validated' | 'file_deleted' | 'storage_warning' | 'error', callback: Function): void;
  emit(event: string, data: any): void;
}

export interface IUploadManager extends IFileService {
  // Advanced Upload Features
  resumeUpload(uploadId: string, chunk: Buffer, offset: number): Promise<void>;
  pauseUpload(uploadId: string): Promise<void>;
  cancelUpload(uploadId: string): Promise<void>;
  
  // Batch Operations
  processBatch(files: Array<{buffer: Buffer, name: string, type: DocumentType}>, clientId: string): Promise<FileMetadata[]>;
  validateBatch(files: Array<{buffer: Buffer, name: string, type: DocumentType}>): Promise<ValidationResult[]>;
  
  // Container Integration
  transferToContainer(fileId: string, containerId: string, containerPath: string): Promise<void>;
  retrieveFromContainer(containerId: string, containerPath: string): Promise<Buffer>;
}

export interface IFileValidator {
  // Security Validation
  scanForMalware(fileBuffer: Buffer): Promise<boolean>;
  checkFileIntegrity(fileBuffer: Buffer, expectedHash?: string): Promise<boolean>;
  validateFileStructure(fileBuffer: Buffer, expectedType: DocumentType): Promise<ValidationResult>;
  
  // Content Analysis
  extractMetadata(fileBuffer: Buffer, fileName: string): Promise<Record<string, any>>;
  analyzeContent(fileBuffer: Buffer, documentType: DocumentType): Promise<{
    pageCount?: number;
    wordCount?: number;
    hasImages?: boolean;
    hasTable?: boolean;
    language?: string;
  }>;
}