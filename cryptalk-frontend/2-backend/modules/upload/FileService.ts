/**
 * FileService - Implementação principal do serviço de arquivos
 * Verdadeiramente modular e desacoplado de frameworks HTTP
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs/promises';
import { 
  IFileService, 
  FileMetadata, 
  UploadConfig, 
  DocumentTypeConfig,
  ValidationResult, 
  FileStats, 
  DocumentType 
} from '../../core/interfaces/IFileService';
import { FileValidator } from './FileValidator';

export interface FileServiceConfig {
  uploadPath: string;
  tempPath: string;
  maxFileSize: number;
  maxConcurrentUploads: number;
  cleanupInterval: number;
  maxFileAge: number;
  enableFileCompression: boolean;
  enableFileEncryption: boolean;
  storage: {
    type: 'memory' | 'disk' | 'hybrid';
    memoryLimit: number;
    diskPath: string;
  };
}

interface StoredFile {
  metadata: FileMetadata;
  buffer?: Buffer; // For memory storage
  diskPath?: string; // For disk storage
  lastAccessed: Date;
}

export class FileService extends EventEmitter implements IFileService {
  private config: FileServiceConfig;
  private validator: FileValidator;
  private fileStore: Map<string, StoredFile>;
  private stats: FileStats;
  private uploadConfig: UploadConfig;
  private documentTypeConfigs: Map<DocumentType, DocumentTypeConfig>;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<FileServiceConfig> = {}) {
    super();
    
    this.config = {
      uploadPath: '/tmp/cryptalk-uploads',
      tempPath: '/tmp/cryptalk-temp',
      maxFileSize: 50 * 1024 * 1024, // 50MB
      maxConcurrentUploads: 10,
      cleanupInterval: 60 * 60 * 1000, // 1 hour
      maxFileAge: 2 * 60 * 60 * 1000, // 2 hours
      enableFileCompression: false,
      enableFileEncryption: false,
      storage: {
        type: 'hybrid',
        memoryLimit: 100 * 1024 * 1024, // 100MB
        diskPath: '/tmp/cryptalk-disk-storage'
      },
      ...config
    };

    this.validator = new FileValidator();
    this.fileStore = new Map();
    this.initializeStats();
    this.initializeUploadConfig();
    this.initializeDocumentTypeConfigs();
    this.setupCleanup();
    this.setupValidatorEvents();
  }

  private initializeStats(): void {
    this.stats = {
      totalUploads: 0,
      totalSize: 0,
      uploadsByType: {} as Record<DocumentType, number>,
      failures: 0,
      averageSize: 0,
      totalSizeMB: 0,
      lastCleanup: new Date()
    };
  }

  private initializeUploadConfig(): void {
    this.uploadConfig = {
      maxFileSize: this.config.maxFileSize,
      allowedExtensions: ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.csv', '.md'],
      allowedMimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
        'text/markdown'
      ],
      uploadPath: this.config.uploadPath,
      tempPath: this.config.tempPath,
      securityValidation: true
    };
  }

  private initializeDocumentTypeConfigs(): void {
    this.documentTypeConfigs = new Map();
    
    // Copy configurations from validator
    const documentTypes: DocumentType[] = ['pitch-deck', 'financial', 'legal', 'technical', 'patent'];
    
    documentTypes.forEach(type => {
      const validatorConfig = this.validator.getDocumentTypeConfig(type);
      if (validatorConfig) {
        this.documentTypeConfigs.set(type, validatorConfig);
      }
    });
  }

  private setupCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredFiles().catch(error => {
        this.emit('cleanup_error', { error: error.message, timestamp: new Date() });
      });
    }, this.config.cleanupInterval);
  }

  private setupValidatorEvents(): void {
    this.validator.on('file_validated', (data) => {
      this.emit('file_validated', data);
    });

    this.validator.on('validation_error', (data) => {
      this.stats.failures++;
      this.emit('validation_error', data);
    });

    this.validator.on('security_warning', (data) => {
      this.emit('security_warning', data);
    });
  }

  /**
   * Process file upload
   */
  async processUpload(
    fileBuffer: Buffer, 
    originalName: string, 
    documentType: DocumentType, 
    clientId: string
  ): Promise<FileMetadata> {
    const startTime = Date.now();
    
    try {
      // Validate input parameters
      if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
        throw new Error('Invalid file buffer');
      }

      if (!originalName || !documentType || !clientId) {
        throw new Error('Missing required parameters');
      }

      this.emit('upload_started', {
        originalName,
        documentType,
        clientId,
        size: fileBuffer.length,
        timestamp: new Date()
      });

      // Validate file
      const validationResult = await this.validateFile(fileBuffer, originalName, documentType);
      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Generate file metadata
      const metadata = await this.generateFileMetadata(fileBuffer, originalName, documentType, clientId);

      // Save file
      const filePath = await this.saveFile(metadata, fileBuffer);
      metadata.path = filePath;
      metadata.status = 'ready';

      // Update statistics
      this.updateStats(documentType, fileBuffer.length);

      const processingTime = Date.now() - startTime;
      
      this.emit('file_uploaded', {
        fileId: metadata.id,
        originalName: metadata.originalName,
        documentType: metadata.documentType,
        clientId: metadata.clientId,
        size: metadata.size,
        processingTime,
        timestamp: new Date()
      });

      return metadata;

    } catch (error) {
      this.stats.failures++;
      
      const processingTime = Date.now() - startTime;
      
      this.emit('upload_error', {
        originalName,
        documentType,
        clientId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
        timestamp: new Date()
      });

      throw error;
    }
  }

  /**
   * Validate file
   */
  async validateFile(
    fileBuffer: Buffer, 
    originalName: string, 
    documentType: DocumentType
  ): Promise<ValidationResult> {
    try {
      // Basic validation
      const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };

      // Check file size
      if (fileBuffer.length > this.config.maxFileSize) {
        result.isValid = false;
        result.errors.push(`File too large. Maximum size: ${Math.round(this.config.maxFileSize / (1024 * 1024))}MB`);
      }

      // Check file extension
      const extension = path.extname(originalName).toLowerCase();
      if (!this.uploadConfig.allowedExtensions.includes(extension)) {
        result.isValid = false;
        result.errors.push(`File extension not allowed: ${extension}`);
      }

      // Check document type configuration
      const typeConfig = this.documentTypeConfigs.get(documentType);
      if (typeConfig) {
        if (!typeConfig.extensions.includes(extension)) {
          result.isValid = false;
          result.errors.push(`Extension ${extension} not allowed for document type ${documentType}`);
        }

        if (fileBuffer.length > typeConfig.maxSize) {
          result.isValid = false;
          result.errors.push(`File too large for document type ${documentType}. Maximum: ${Math.round(typeConfig.maxSize / (1024 * 1024))}MB`);
        }
      }

      // Structural validation
      if (result.isValid) {
        const structuralValidation = await this.validator.validateFileStructure(fileBuffer, documentType);
        if (!structuralValidation.isValid) {
          result.isValid = false;
          result.errors.push(...structuralValidation.errors);
        }
        result.warnings.push(...(structuralValidation.warnings || []));
        result.securityFlags = structuralValidation.securityFlags;
      }

      return result;

    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      };
    }
  }

  /**
   * Generate file metadata
   */
  async generateFileMetadata(
    fileBuffer: Buffer, 
    originalName: string, 
    documentType: DocumentType, 
    clientId: string
  ): Promise<FileMetadata> {
    try {
      // Generate file hash
      const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex').substring(0, 16);
      
      // Generate safe filename
      const safeFileName = this.generateSafeFileName(originalName, hash);
      
      // Detect MIME type
      const mimeType = await this.detectMimeType(originalName, fileBuffer);
      
      // Extract additional metadata
      const additionalMetadata = await this.validator.extractMetadata(fileBuffer, originalName);

      const metadata: FileMetadata = {
        id: `${clientId}-${hash}`,
        originalName,
        safeFileName,
        documentType,
        clientId,
        size: fileBuffer.length,
        hash,
        uploadedAt: new Date(),
        mimeType,
        status: 'uploading',
        metadata: additionalMetadata
      };

      return metadata;

    } catch (error) {
      throw new Error(`Failed to generate metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save file to storage
   */
  async saveFile(fileMetadata: FileMetadata, fileBuffer: Buffer): Promise<string> {
    try {
      let filePath: string;
      const storedFile: StoredFile = {
        metadata: fileMetadata,
        lastAccessed: new Date()
      };

      switch (this.config.storage.type) {
        case 'memory':
          storedFile.buffer = fileBuffer;
          filePath = `memory://${fileMetadata.id}`;
          break;
          
        case 'disk':
          filePath = await this.saveToDisk(fileMetadata, fileBuffer);
          storedFile.diskPath = filePath;
          break;
          
        case 'hybrid':
          if (fileBuffer.length <= this.config.storage.memoryLimit) {
            storedFile.buffer = fileBuffer;
            filePath = `memory://${fileMetadata.id}`;
          } else {
            filePath = await this.saveToDisk(fileMetadata, fileBuffer);
            storedFile.diskPath = filePath;
          }
          break;
          
        default:
          throw new Error(`Unknown storage type: ${this.config.storage.type}`);
      }

      this.fileStore.set(fileMetadata.id, storedFile);

      this.emit('file_saved', {
        fileId: fileMetadata.id,
        path: filePath,
        storageType: this.config.storage.type,
        timestamp: new Date()
      });

      return filePath;

    } catch (error) {
      throw new Error(`Failed to save file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Read file from storage
   */
  async readFile(fileId: string): Promise<Buffer> {
    try {
      const storedFile = this.fileStore.get(fileId);
      if (!storedFile) {
        throw new Error(`File not found: ${fileId}`);
      }

      storedFile.lastAccessed = new Date();

      if (storedFile.buffer) {
        return storedFile.buffer;
      }

      if (storedFile.diskPath) {
        return await fs.readFile(storedFile.diskPath);
      }

      throw new Error(`No storage location found for file: ${fileId}`);

    } catch (error) {
      this.emit('file_read_error', {
        fileId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      const storedFile = this.fileStore.get(fileId);
      if (!storedFile) {
        throw new Error(`File not found: ${fileId}`);
      }

      // Delete from disk if stored there
      if (storedFile.diskPath) {
        try {
          await fs.unlink(storedFile.diskPath);
        } catch (error) {
          // File might not exist on disk, log but don't fail
          this.emit('disk_delete_warning', {
            fileId,
            diskPath: storedFile.diskPath,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date()
          });
        }
      }

      // Remove from memory store
      this.fileStore.delete(fileId);

      this.emit('file_deleted', {
        fileId,
        timestamp: new Date()
      });

    } catch (error) {
      this.emit('file_delete_error', {
        fileId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Move file to new location
   */
  async moveFile(fileId: string, newPath: string): Promise<void> {
    try {
      const storedFile = this.fileStore.get(fileId);
      if (!storedFile) {
        throw new Error(`File not found: ${fileId}`);
      }

      if (storedFile.diskPath) {
        await fs.rename(storedFile.diskPath, newPath);
        storedFile.diskPath = newPath;
      }

      this.emit('file_moved', {
        fileId,
        newPath,
        timestamp: new Date()
      });

    } catch (error) {
      throw new Error(`Failed to move file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileId: string): Promise<FileMetadata | null> {
    const storedFile = this.fileStore.get(fileId);
    return storedFile ? storedFile.metadata : null;
  }

  /**
   * Update file metadata
   */
  async updateFileMetadata(fileId: string, updates: Partial<FileMetadata>): Promise<FileMetadata> {
    const storedFile = this.fileStore.get(fileId);
    if (!storedFile) {
      throw new Error(`File not found: ${fileId}`);
    }

    Object.assign(storedFile.metadata, updates);
    
    this.emit('metadata_updated', {
      fileId,
      updates,
      timestamp: new Date()
    });

    return storedFile.metadata;
  }

  /**
   * List files
   */
  async listFiles(clientId?: string, documentType?: DocumentType): Promise<FileMetadata[]> {
    const files: FileMetadata[] = [];

    for (const storedFile of this.fileStore.values()) {
      const metadata = storedFile.metadata;
      
      if (clientId && metadata.clientId !== clientId) {
        continue;
      }
      
      if (documentType && metadata.documentType !== documentType) {
        continue;
      }
      
      files.push(metadata);
    }

    return files.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }

  /**
   * Validate file by type
   */
  async validateFileByType(fileBuffer: Buffer, documentType: DocumentType): Promise<ValidationResult> {
    return await this.validator.validateFileStructure(fileBuffer, documentType);
  }

  /**
   * Detect MIME type
   */
  async detectMimeType(fileName: string, fileBuffer?: Buffer): Promise<string> {
    const extension = path.extname(fileName).toLowerCase();
    
    const mimeTypeMap: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.csv': 'text/csv',
      '.md': 'text/markdown'
    };

    return mimeTypeMap[extension] || 'application/octet-stream';
  }

  /**
   * Validate security
   */
  async validateSecure(fileBuffer: Buffer): Promise<ValidationResult> {
    return await this.validator.scanForMalware(fileBuffer).then(isClean => ({
      isValid: isClean,
      errors: isClean ? [] : ['File failed security scan'],
      warnings: []
    }));
  }

  /**
   * Get upload configuration
   */
  getUploadConfig(documentType?: DocumentType): UploadConfig | DocumentTypeConfig {
    if (documentType) {
      const config = this.documentTypeConfigs.get(documentType);
      return config || this.uploadConfig;
    }
    return this.uploadConfig;
  }

  /**
   * Update configuration
   */
  async updateConfig(config: Partial<UploadConfig>): Promise<void> {
    Object.assign(this.uploadConfig, config);
    this.emit('config_updated', { config, timestamp: new Date() });
  }

  /**
   * Get allowed document types
   */
  getAllowedTypes(): DocumentType[] {
    return Array.from(this.documentTypeConfigs.keys());
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<FileStats> {
    this.stats.averageSize = this.stats.totalUploads > 0 ? this.stats.totalSize / this.stats.totalUploads : 0;
    this.stats.totalSizeMB = Math.round(this.stats.totalSize / (1024 * 1024));
    return { ...this.stats };
  }

  /**
   * Get statistics for specific client
   */
  async getStatsForClient(clientId: string): Promise<Partial<FileStats>> {
    const clientFiles = await this.listFiles(clientId);
    
    const stats: Partial<FileStats> = {
      totalUploads: clientFiles.length,
      totalSize: clientFiles.reduce((sum, file) => sum + file.size, 0),
      uploadsByType: {} as Record<DocumentType, number>
    };

    clientFiles.forEach(file => {
      if (!stats.uploadsByType![file.documentType]) {
        stats.uploadsByType![file.documentType] = 0;
      }
      stats.uploadsByType![file.documentType]++;
    });

    stats.averageSize = stats.totalUploads! > 0 ? stats.totalSize! / stats.totalUploads! : 0;
    stats.totalSizeMB = Math.round(stats.totalSize! / (1024 * 1024));

    return stats;
  }

  /**
   * Cleanup expired files
   */
  async cleanupExpiredFiles(): Promise<number> {
    const now = Date.now();
    const expiredFiles: string[] = [];

    for (const [fileId, storedFile] of this.fileStore.entries()) {
      const fileAge = now - storedFile.metadata.uploadedAt.getTime();
      if (fileAge > this.config.maxFileAge) {
        expiredFiles.push(fileId);
      }
    }

    let deletedCount = 0;
    for (const fileId of expiredFiles) {
      try {
        await this.deleteFile(fileId);
        deletedCount++;
      } catch (error) {
        this.emit('cleanup_error', {
          fileId,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        });
      }
    }

    this.stats.lastCleanup = new Date();

    this.emit('cleanup_completed', {
      deletedCount,
      totalFiles: this.fileStore.size,
      timestamp: new Date()
    });

    return deletedCount;
  }

  /**
   * Archive old files
   */
  async archiveOldFiles(olderThan: Date): Promise<number> {
    let archivedCount = 0;

    for (const [fileId, storedFile] of this.fileStore.entries()) {
      if (storedFile.metadata.uploadedAt < olderThan) {
        try {
          await this.updateFileMetadata(fileId, { status: 'archived' });
          archivedCount++;
        } catch (error) {
          this.emit('archive_error', {
            fileId,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date()
          });
        }
      }
    }

    this.emit('archive_completed', {
      archivedCount,
      olderThan,
      timestamp: new Date()
    });

    return archivedCount;
  }

  /**
   * Validate storage
   */
  async validateStorage(): Promise<{
    available: boolean;
    freeSpace: number;
    totalSpace: number;
    issues: string[];
  }> {
    const result = {
      available: true,
      freeSpace: 0,
      totalSpace: 0,
      issues: [] as string[]
    };

    try {
      // Check if paths exist and are writable
      await fs.access(this.config.uploadPath, fs.constants.W_OK);
      await fs.access(this.config.tempPath, fs.constants.W_OK);

      // Get disk space info (simplified)
      const stats = await fs.stat(this.config.uploadPath);
      result.available = true;

    } catch (error) {
      result.available = false;
      result.issues.push(`Storage not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  // Private helper methods

  private async saveToDisk(metadata: FileMetadata, fileBuffer: Buffer): Promise<string> {
    try {
      // Ensure directory exists
      await fs.mkdir(this.config.storage.diskPath, { recursive: true });
      
      const filePath = path.join(this.config.storage.diskPath, metadata.safeFileName);
      await fs.writeFile(filePath, fileBuffer);
      
      return filePath;
    } catch (error) {
      throw new Error(`Failed to save to disk: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private generateSafeFileName(originalName: string, hash: string): string {
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext)
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .substring(0, 50);
    
    return `${baseName}_${hash}${ext}`;
  }

  private updateStats(documentType: DocumentType, fileSize: number): void {
    this.stats.totalUploads++;
    this.stats.totalSize += fileSize;
    
    if (!this.stats.uploadsByType[documentType]) {
      this.stats.uploadsByType[documentType] = 0;
    }
    this.stats.uploadsByType[documentType]++;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.fileStore.clear();
    this.removeAllListeners();
    
    this.emit('service_destroyed', { timestamp: new Date() });
  }
}