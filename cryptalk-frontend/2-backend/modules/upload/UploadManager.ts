/**
 * UploadManager - Gerenciamento avançado de uploads
 * Implementa funcionalidades como upload resumível, batch operations e integração com containers
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import { 
  IUploadManager, 
  FileMetadata, 
  ValidationResult, 
  DocumentType,
  FileStats,
  UploadConfig,
  DocumentTypeConfig
} from '../../core/interfaces/IFileService';
import { FileService, FileServiceConfig } from './FileService';

export interface UploadManagerConfig extends FileServiceConfig {
  chunkedUpload: {
    enabled: boolean;
    chunkSize: number;
    maxChunks: number;
    chunkTimeout: number;
  };
  batchProcessing: {
    enabled: boolean;
    maxBatchSize: number;
    maxConcurrentBatches: number;
    batchTimeout: number;
  };
  containerIntegration: {
    enabled: boolean;
    defaultContainerPath: string;
    transferTimeout: number;
  };
}

interface UploadSession {
  id: string;
  clientId: string;
  originalName: string;
  documentType: DocumentType;
  totalSize: number;
  uploadedChunks: Map<number, Buffer>;
  expectedChunks: number;
  lastActivity: Date;
  status: 'active' | 'paused' | 'completed' | 'cancelled' | 'error';
  metadata?: Partial<FileMetadata>;
}

interface BatchOperation {
  id: string;
  clientId: string;
  files: Array<{
    buffer: Buffer;
    name: string;
    type: DocumentType;
  }>;
  status: 'pending' | 'processing' | 'completed' | 'error';
  results: FileMetadata[];
  errors: string[];
  startedAt: Date;
  completedAt?: Date;
}

export class UploadManager extends EventEmitter implements IUploadManager {
  private fileService: FileService;
  private config: UploadManagerConfig;
  private uploadSessions: Map<string, UploadSession>;
  private batchOperations: Map<string, BatchOperation>;
  private activeUploads: Set<string>;
  private sessionCleanupTimer?: NodeJS.Timeout;
  private batchCleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<UploadManagerConfig> = {}) {
    super();

    this.config = {
      // FileService config defaults
      uploadPath: '/tmp/cryptalk-uploads',
      tempPath: '/tmp/cryptalk-temp',
      maxFileSize: 50 * 1024 * 1024,
      maxConcurrentUploads: 10,
      cleanupInterval: 60 * 60 * 1000,
      maxFileAge: 2 * 60 * 60 * 1000,
      enableFileCompression: false,
      enableFileEncryption: false,
      storage: {
        type: 'hybrid',
        memoryLimit: 100 * 1024 * 1024,
        diskPath: '/tmp/cryptalk-disk-storage'
      },
      // UploadManager specific config
      chunkedUpload: {
        enabled: true,
        chunkSize: 1024 * 1024, // 1MB chunks
        maxChunks: 100,
        chunkTimeout: 5 * 60 * 1000 // 5 minutes
      },
      batchProcessing: {
        enabled: true,
        maxBatchSize: 10,
        maxConcurrentBatches: 3,
        batchTimeout: 30 * 60 * 1000 // 30 minutes
      },
      containerIntegration: {
        enabled: true,
        defaultContainerPath: '/app/uploads',
        transferTimeout: 10 * 60 * 1000 // 10 minutes
      },
      ...config
    };

    this.fileService = new FileService(this.config);
    this.uploadSessions = new Map();
    this.batchOperations = new Map();
    this.activeUploads = new Set();

    this.setupFileServiceEvents();
    this.setupCleanupTimers();
  }

  private setupFileServiceEvents(): void {
    this.fileService.on('file_uploaded', (data) => {
      this.emit('file_uploaded', data);
    });

    this.fileService.on('file_validated', (data) => {
      this.emit('file_validated', data);
    });

    this.fileService.on('upload_error', (data) => {
      this.emit('upload_error', data);
    });

    this.fileService.on('file_deleted', (data) => {
      this.emit('file_deleted', data);
    });
  }

  private setupCleanupTimers(): void {
    // Cleanup expired upload sessions
    this.sessionCleanupTimer = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60000); // Every minute

    // Cleanup expired batch operations
    this.batchCleanupTimer = setInterval(() => {
      this.cleanupExpiredBatches();
    }, 300000); // Every 5 minutes
  }

  // IFileService interface methods (delegated to FileService)

  async processUpload(
    fileBuffer: Buffer, 
    originalName: string, 
    documentType: DocumentType, 
    clientId: string
  ): Promise<FileMetadata> {
    if (this.activeUploads.size >= this.config.maxConcurrentUploads) {
      throw new Error('Maximum concurrent uploads reached');
    }

    const uploadId = this.generateUploadId();
    this.activeUploads.add(uploadId);

    try {
      const result = await this.fileService.processUpload(fileBuffer, originalName, documentType, clientId);
      return result;
    } finally {
      this.activeUploads.delete(uploadId);
    }
  }

  async validateFile(
    fileBuffer: Buffer, 
    originalName: string, 
    documentType: DocumentType
  ): Promise<ValidationResult> {
    return this.fileService.validateFile(fileBuffer, originalName, documentType);
  }

  async generateFileMetadata(
    fileBuffer: Buffer, 
    originalName: string, 
    documentType: DocumentType, 
    clientId: string
  ): Promise<FileMetadata> {
    return this.fileService.generateFileMetadata(fileBuffer, originalName, documentType, clientId);
  }

  async saveFile(fileMetadata: FileMetadata, fileBuffer: Buffer): Promise<string> {
    return this.fileService.saveFile(fileMetadata, fileBuffer);
  }

  async readFile(fileId: string): Promise<Buffer> {
    return this.fileService.readFile(fileId);
  }

  async deleteFile(fileId: string): Promise<void> {
    return this.fileService.deleteFile(fileId);
  }

  async moveFile(fileId: string, newPath: string): Promise<void> {
    return this.fileService.moveFile(fileId, newPath);
  }

  async getFileMetadata(fileId: string): Promise<FileMetadata | null> {
    return this.fileService.getFileMetadata(fileId);
  }

  async updateFileMetadata(fileId: string, updates: Partial<FileMetadata>): Promise<FileMetadata> {
    return this.fileService.updateFileMetadata(fileId, updates);
  }

  async listFiles(clientId?: string, documentType?: DocumentType): Promise<FileMetadata[]> {
    return this.fileService.listFiles(clientId, documentType);
  }

  async validateFileByType(fileBuffer: Buffer, documentType: DocumentType): Promise<ValidationResult> {
    return this.fileService.validateFileByType(fileBuffer, documentType);
  }

  async detectMimeType(fileName: string, fileBuffer?: Buffer): Promise<string> {
    return this.fileService.detectMimeType(fileName, fileBuffer);
  }

  async validateSecure(fileBuffer: Buffer): Promise<ValidationResult> {
    return this.fileService.validateSecure(fileBuffer);
  }

  getUploadConfig(documentType?: DocumentType): UploadConfig | DocumentTypeConfig {
    return this.fileService.getUploadConfig(documentType);
  }

  async updateConfig(config: Partial<UploadConfig>): Promise<void> {
    return this.fileService.updateConfig(config);
  }

  getAllowedTypes(): DocumentType[] {
    return this.fileService.getAllowedTypes();
  }

  async getStats(): Promise<FileStats> {
    return this.fileService.getStats();
  }

  async getStatsForClient(clientId: string): Promise<Partial<FileStats>> {
    return this.fileService.getStatsForClient(clientId);
  }

  async cleanupExpiredFiles(): Promise<number> {
    return this.fileService.cleanupExpiredFiles();
  }

  async archiveOldFiles(olderThan: Date): Promise<number> {
    return this.fileService.archiveOldFiles(olderThan);
  }

  async validateStorage(): Promise<{
    available: boolean;
    freeSpace: number;
    totalSpace: number;
    issues: string[];
  }> {
    return this.fileService.validateStorage();
  }

  on(event: 'file_uploaded' | 'file_validated' | 'file_deleted' | 'storage_warning' | 'error', callback: Function): void {
    super.on(event, callback);
  }

  emit(event: string, data: any): boolean {
    return super.emit(event, data);
  }

  // IUploadManager specific methods

  /**
   * Start resumable upload session
   */
  async startResumableUpload(
    fileName: string,
    fileSize: number,
    documentType: DocumentType,
    clientId: string
  ): Promise<string> {
    if (!this.config.chunkedUpload.enabled) {
      throw new Error('Chunked upload is not enabled');
    }

    if (fileSize > this.config.maxFileSize) {
      throw new Error(`File too large. Maximum size: ${Math.round(this.config.maxFileSize / (1024 * 1024))}MB`);
    }

    const sessionId = this.generateUploadId();
    const expectedChunks = Math.ceil(fileSize / this.config.chunkedUpload.chunkSize);

    if (expectedChunks > this.config.chunkedUpload.maxChunks) {
      throw new Error(`Too many chunks required. Maximum: ${this.config.chunkedUpload.maxChunks}`);
    }

    const session: UploadSession = {
      id: sessionId,
      clientId,
      originalName: fileName,
      documentType,
      totalSize: fileSize,
      uploadedChunks: new Map(),
      expectedChunks,
      lastActivity: new Date(),
      status: 'active'
    };

    this.uploadSessions.set(sessionId, session);

    this.emit('upload_session_started', {
      sessionId,
      fileName,
      fileSize,
      documentType,
      clientId,
      expectedChunks,
      timestamp: new Date()
    });

    return sessionId;
  }

  /**
   * Resume upload with chunk
   */
  async resumeUpload(uploadId: string, chunk: Buffer, offset: number): Promise<void> {
    const session = this.uploadSessions.get(uploadId);
    if (!session) {
      throw new Error(`Upload session not found: ${uploadId}`);
    }

    if (session.status !== 'active') {
      throw new Error(`Upload session is ${session.status}, cannot resume`);
    }

    const chunkIndex = Math.floor(offset / this.config.chunkedUpload.chunkSize);
    
    if (chunkIndex >= session.expectedChunks) {
      throw new Error(`Invalid chunk index: ${chunkIndex}`);
    }

    // Validate chunk size
    const expectedChunkSize = (chunkIndex === session.expectedChunks - 1) 
      ? session.totalSize - (chunkIndex * this.config.chunkedUpload.chunkSize)
      : this.config.chunkedUpload.chunkSize;

    if (chunk.length !== expectedChunkSize) {
      throw new Error(`Invalid chunk size. Expected: ${expectedChunkSize}, Got: ${chunk.length}`);
    }

    session.uploadedChunks.set(chunkIndex, chunk);
    session.lastActivity = new Date();

    this.emit('chunk_uploaded', {
      sessionId: uploadId,
      chunkIndex,
      chunkSize: chunk.length,
      totalChunks: session.expectedChunks,
      uploadedChunks: session.uploadedChunks.size,
      progress: (session.uploadedChunks.size / session.expectedChunks) * 100,
      timestamp: new Date()
    });

    // Check if upload is complete
    if (session.uploadedChunks.size === session.expectedChunks) {
      await this.completeResumableUpload(uploadId);
    }
  }

  /**
   * Pause upload session
   */
  async pauseUpload(uploadId: string): Promise<void> {
    const session = this.uploadSessions.get(uploadId);
    if (!session) {
      throw new Error(`Upload session not found: ${uploadId}`);
    }

    session.status = 'paused';
    session.lastActivity = new Date();

    this.emit('upload_paused', {
      sessionId: uploadId,
      uploadedChunks: session.uploadedChunks.size,
      totalChunks: session.expectedChunks,
      timestamp: new Date()
    });
  }

  /**
   * Cancel upload session
   */
  async cancelUpload(uploadId: string): Promise<void> {
    const session = this.uploadSessions.get(uploadId);
    if (!session) {
      throw new Error(`Upload session not found: ${uploadId}`);
    }

    session.status = 'cancelled';
    this.uploadSessions.delete(uploadId);

    this.emit('upload_cancelled', {
      sessionId: uploadId,
      uploadedChunks: session.uploadedChunks.size,
      totalChunks: session.expectedChunks,
      timestamp: new Date()
    });
  }

  /**
   * Process batch upload
   */
  async processBatch(
    files: Array<{buffer: Buffer, name: string, type: DocumentType}>, 
    clientId: string
  ): Promise<FileMetadata[]> {
    if (!this.config.batchProcessing.enabled) {
      throw new Error('Batch processing is not enabled');
    }

    if (files.length > this.config.batchProcessing.maxBatchSize) {
      throw new Error(`Batch too large. Maximum size: ${this.config.batchProcessing.maxBatchSize}`);
    }

    const batchId = this.generateBatchId();
    const batch: BatchOperation = {
      id: batchId,
      clientId,
      files,
      status: 'processing',
      results: [],
      errors: [],
      startedAt: new Date()
    };

    this.batchOperations.set(batchId, batch);

    this.emit('batch_started', {
      batchId,
      clientId,
      fileCount: files.length,
      timestamp: new Date()
    });

    try {
      const results: FileMetadata[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
          const metadata = await this.processUpload(
            file.buffer, 
            file.name, 
            file.type, 
            clientId
          );
          
          results.push(metadata);
          batch.results.push(metadata);

          this.emit('batch_file_processed', {
            batchId,
            fileIndex: i,
            fileName: file.name,
            fileId: metadata.id,
            progress: ((i + 1) / files.length) * 100,
            timestamp: new Date()
          });

        } catch (error) {
          const errorMessage = `File ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          batch.errors.push(errorMessage);

          this.emit('batch_file_error', {
            batchId,
            fileIndex: i,
            fileName: file.name,
            error: errorMessage,
            timestamp: new Date()
          });
        }
      }

      batch.status = 'completed';
      batch.completedAt = new Date();

      this.emit('batch_completed', {
        batchId,
        clientId,
        successCount: results.length,
        errorCount: batch.errors.length,
        processingTime: batch.completedAt.getTime() - batch.startedAt.getTime(),
        timestamp: new Date()
      });

      return results;

    } catch (error) {
      batch.status = 'error';
      batch.completedAt = new Date();
      
      this.emit('batch_error', {
        batchId,
        clientId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });

      throw error;
    }
  }

  /**
   * Validate batch upload
   */
  async validateBatch(
    files: Array<{buffer: Buffer, name: string, type: DocumentType}>
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const file of files) {
      try {
        const result = await this.validateFile(file.buffer, file.name, file.type);
        results.push(result);
      } catch (error) {
        results.push({
          isValid: false,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          warnings: []
        });
      }
    }

    return results;
  }

  /**
   * Transfer file to container
   */
  async transferToContainer(fileId: string, containerId: string, containerPath: string): Promise<void> {
    if (!this.config.containerIntegration.enabled) {
      throw new Error('Container integration is not enabled');
    }

    try {
      const fileBuffer = await this.readFile(fileId);
      const metadata = await this.getFileMetadata(fileId);
      
      if (!metadata) {
        throw new Error(`File metadata not found: ${fileId}`);
      }

      // This would integrate with your Docker container manager
      // For now, we'll emit an event that can be handled by the container manager
      this.emit('container_transfer_requested', {
        fileId,
        containerId,
        containerPath,
        fileBuffer,
        metadata,
        timestamp: new Date()
      });

      this.emit('file_transferred', {
        fileId,
        containerId,
        containerPath,
        timestamp: new Date()
      });

    } catch (error) {
      this.emit('transfer_error', {
        fileId,
        containerId,
        containerPath,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Retrieve file from container
   */
  async retrieveFromContainer(containerId: string, containerPath: string): Promise<Buffer> {
    if (!this.config.containerIntegration.enabled) {
      throw new Error('Container integration is not enabled');
    }

    // This would integrate with your Docker container manager
    // For now, we'll emit an event and return a placeholder
    this.emit('container_retrieval_requested', {
      containerId,
      containerPath,
      timestamp: new Date()
    });

    throw new Error('Container retrieval not implemented - requires Docker integration');
  }

  /**
   * Get upload session status
   */
  getUploadSessionStatus(uploadId: string): {
    exists: boolean;
    status?: UploadSession['status'];
    progress?: number;
    uploadedChunks?: number;
    totalChunks?: number;
  } {
    const session = this.uploadSessions.get(uploadId);
    
    if (!session) {
      return { exists: false };
    }

    return {
      exists: true,
      status: session.status,
      progress: (session.uploadedChunks.size / session.expectedChunks) * 100,
      uploadedChunks: session.uploadedChunks.size,
      totalChunks: session.expectedChunks
    };
  }

  /**
   * Get batch operation status
   */
  getBatchStatus(batchId: string): BatchOperation | null {
    return this.batchOperations.get(batchId) || null;
  }

  /**
   * Get active uploads count
   */
  getActiveUploadsCount(): number {
    return this.activeUploads.size;
  }

  // Private helper methods

  private async completeResumableUpload(uploadId: string): Promise<void> {
    const session = this.uploadSessions.get(uploadId);
    if (!session) {
      throw new Error(`Upload session not found: ${uploadId}`);
    }

    try {
      // Reconstruct file from chunks
      const chunks: Buffer[] = [];
      for (let i = 0; i < session.expectedChunks; i++) {
        const chunk = session.uploadedChunks.get(i);
        if (!chunk) {
          throw new Error(`Missing chunk ${i}`);
        }
        chunks.push(chunk);
      }

      const fileBuffer = Buffer.concat(chunks);
      
      // Verify file size
      if (fileBuffer.length !== session.totalSize) {
        throw new Error(`File size mismatch. Expected: ${session.totalSize}, Got: ${fileBuffer.length}`);
      }

      // Process the complete file
      const metadata = await this.processUpload(
        fileBuffer,
        session.originalName,
        session.documentType,
        session.clientId
      );

      session.status = 'completed';
      session.metadata = metadata;

      this.emit('resumable_upload_completed', {
        sessionId: uploadId,
        fileId: metadata.id,
        fileName: metadata.originalName,
        fileSize: metadata.size,
        clientId: session.clientId,
        timestamp: new Date()
      });

      // Clean up session after a delay
      setTimeout(() => {
        this.uploadSessions.delete(uploadId);
      }, 60000); // Keep for 1 minute for status queries

    } catch (error) {
      session.status = 'error';
      
      this.emit('resumable_upload_error', {
        sessionId: uploadId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });

      throw error;
    }
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.uploadSessions.entries()) {
      const inactiveTime = now - session.lastActivity.getTime();
      
      if (inactiveTime > this.config.chunkedUpload.chunkTimeout) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      this.uploadSessions.delete(sessionId);
      
      this.emit('upload_session_expired', {
        sessionId,
        timestamp: new Date()
      });
    }
  }

  private cleanupExpiredBatches(): void {
    const now = Date.now();
    const expiredBatches: string[] = [];

    for (const [batchId, batch] of this.batchOperations.entries()) {
      const batchAge = now - batch.startedAt.getTime();
      
      if (batchAge > this.config.batchProcessing.batchTimeout && 
          (batch.status === 'completed' || batch.status === 'error')) {
        expiredBatches.push(batchId);
      }
    }

    for (const batchId of expiredBatches) {
      this.batchOperations.delete(batchId);
      
      this.emit('batch_operation_expired', {
        batchId,
        timestamp: new Date()
      });
    }
  }

  private generateUploadId(): string {
    return `upload_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.sessionCleanupTimer) {
      clearInterval(this.sessionCleanupTimer);
    }
    
    if (this.batchCleanupTimer) {
      clearInterval(this.batchCleanupTimer);
    }

    this.uploadSessions.clear();
    this.batchOperations.clear();
    this.activeUploads.clear();
    
    this.fileService.destroy();
    this.removeAllListeners();
    
    this.emit('manager_destroyed', { timestamp: new Date() });
  }
}