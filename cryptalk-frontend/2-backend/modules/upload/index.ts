/**
 * Upload Module - Exports and Module Entry Point
 * Centraliza todas as exportações do módulo Upload/File
 */

// Core Services
export { FileService, FileServiceConfig } from './FileService';
export { UploadManager, UploadManagerConfig } from './UploadManager';
export { FileValidator, FileValidatorConfig } from './FileValidator';

// Re-export interfaces from core
export {
  IFileService,
  IUploadManager,
  IFileValidator,
  FileMetadata,
  UploadConfig,
  DocumentTypeConfig,
  ValidationResult,
  FileStats,
  DocumentType
} from '../../core/interfaces/IFileService';

// Module Factory Functions
import { FileService, FileServiceConfig } from './FileService';
import { UploadManager, UploadManagerConfig } from './UploadManager';
import { FileValidator, FileValidatorConfig } from './FileValidator';

/**
 * Factory function to create a FileService instance
 */
export function createFileService(config?: Partial<FileServiceConfig>): FileService {
  return new FileService(config);
}

/**
 * Factory function to create an UploadManager instance
 */
export function createUploadManager(config?: Partial<UploadManagerConfig>): UploadManager {
  return new UploadManager(config);
}

/**
 * Factory function to create a FileValidator instance
 */
export function createFileValidator(config?: Partial<FileValidatorConfig>): FileValidator {
  return new FileValidator(config);
}

/**
 * Default module configuration
 */
export const defaultConfig = {
  fileService: {
    uploadPath: '/tmp/cryptalk-uploads',
    tempPath: '/tmp/cryptalk-temp',
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxConcurrentUploads: 10,
    cleanupInterval: 60 * 60 * 1000, // 1 hour
    maxFileAge: 2 * 60 * 60 * 1000, // 2 hours
    storage: {
      type: 'hybrid' as const,
      memoryLimit: 100 * 1024 * 1024, // 100MB
      diskPath: '/tmp/cryptalk-disk-storage'
    }
  },
  uploadManager: {
    chunkedUpload: {
      enabled: true,
      chunkSize: 1024 * 1024, // 1MB
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
    }
  },
  fileValidator: {
    enableMalwareScanning: false,
    enableContentAnalysis: true,
    strictMimeTypeValidation: true,
    maxFileSizeBytes: 50 * 1024 * 1024,
    temporaryValidationTimeout: 30000
  }
};

/**
 * Module initialization function
 * Creates a complete upload service with all components
 */
export function initializeUploadModule(config?: {
  fileService?: Partial<FileServiceConfig>;
  uploadManager?: Partial<UploadManagerConfig>;
  fileValidator?: Partial<FileValidatorConfig>;
}) {
  const fileValidator = createFileValidator(config?.fileValidator);
  const fileService = createFileService(config?.fileService);
  const uploadManager = createUploadManager(config?.uploadManager);

  // Setup inter-service communication
  setupServiceIntegration(fileService, uploadManager, fileValidator);

  return {
    fileService,
    uploadManager,
    fileValidator,
    
    // Convenience methods
    processUpload: uploadManager.processUpload.bind(uploadManager),
    validateFile: uploadManager.validateFile.bind(uploadManager),
    deleteFile: uploadManager.deleteFile.bind(uploadManager),
    listFiles: uploadManager.listFiles.bind(uploadManager),
    getStats: uploadManager.getStats.bind(uploadManager),
    
    // Batch operations
    processBatch: uploadManager.processBatch.bind(uploadManager),
    validateBatch: uploadManager.validateBatch.bind(uploadManager),
    
    // Resumable uploads
    startResumableUpload: uploadManager.startResumableUpload.bind(uploadManager),
    resumeUpload: uploadManager.resumeUpload.bind(uploadManager),
    pauseUpload: uploadManager.pauseUpload.bind(uploadManager),
    cancelUpload: uploadManager.cancelUpload.bind(uploadManager),
    
    // Container integration
    transferToContainer: uploadManager.transferToContainer.bind(uploadManager),
    retrieveFromContainer: uploadManager.retrieveFromContainer.bind(uploadManager),
    
    // Cleanup
    destroy: () => {
      uploadManager.destroy();
      fileService.destroy();
      fileValidator.removeAllListeners();
    }
  };
}

/**
 * Setup integration between services
 */
function setupServiceIntegration(
  fileService: FileService,
  uploadManager: UploadManager,
  fileValidator: FileValidator
): void {
  // Forward critical events
  fileValidator.on('security_warning', (data) => {
    fileService.emit('security_warning', data);
    uploadManager.emit('security_warning', data);
  });

  fileValidator.on('validation_error', (data) => {
    fileService.emit('validation_error', data);
    uploadManager.emit('validation_error', data);
  });

  fileService.on('storage_warning', (data) => {
    uploadManager.emit('storage_warning', data);
  });

  fileService.on('file_deleted', (data) => {
    uploadManager.emit('file_deleted', data);
  });

  // Error propagation
  fileService.on('error', (error) => {
    uploadManager.emit('error', error);
  });

  fileValidator.on('error', (error) => {
    fileService.emit('error', error);
    uploadManager.emit('error', error);
  });
}

/**
 * Module health check
 */
export async function checkModuleHealth() {
  const health = {
    status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
    components: {
      fileService: 'unknown' as 'healthy' | 'degraded' | 'unhealthy',
      uploadManager: 'unknown' as 'healthy' | 'degraded' | 'unhealthy',
      fileValidator: 'unknown' as 'healthy' | 'degraded' | 'unhealthy'
    },
    issues: [] as string[],
    timestamp: new Date()
  };

  try {
    // Basic functionality checks
    const testBuffer = Buffer.from('test content');
    const validator = createFileValidator();
    
    // Test validator
    try {
      await validator.validateFileStructure(testBuffer, 'technical');
      health.components.fileValidator = 'healthy';
    } catch (error) {
      health.components.fileValidator = 'degraded';
      health.issues.push(`FileValidator: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Test file service
    try {
      const fileService = createFileService();
      await fileService.validateStorage();
      health.components.fileService = 'healthy';
      fileService.destroy();
    } catch (error) {
      health.components.fileService = 'degraded';
      health.issues.push(`FileService: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Test upload manager
    try {
      const uploadManager = createUploadManager();
      uploadManager.getActiveUploadsCount(); // Simple check
      health.components.uploadManager = 'healthy';
      uploadManager.destroy();
    } catch (error) {
      health.components.uploadManager = 'degraded';
      health.issues.push(`UploadManager: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Determine overall status
    const componentStatuses = Object.values(health.components);
    
    if (componentStatuses.every(status => status === 'healthy')) {
      health.status = 'healthy';
    } else if (componentStatuses.some(status => status === 'unhealthy')) {
      health.status = 'unhealthy';
    } else {
      health.status = 'degraded';
    }

    validator.removeAllListeners();
    return health;

  } catch (error) {
    health.status = 'unhealthy';
    health.issues.push(`Module health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return health;
  }
}

/**
 * Module metadata
 */
export const moduleInfo = {
  name: 'upload',
  version: '1.0.0',
  description: 'Modular file upload and management service',
  features: [
    'File upload and validation',
    'Resumable uploads',
    'Batch processing',
    'Container integration',
    'Security scanning',
    'Content analysis',
    'Multiple storage backends',
    'Event-driven architecture'
  ],
  dependencies: [],
  exports: [
    'FileService',
    'UploadManager', 
    'FileValidator',
    'initializeUploadModule',
    'createFileService',
    'createUploadManager',
    'createFileValidator',
    'checkModuleHealth'
  ]
};