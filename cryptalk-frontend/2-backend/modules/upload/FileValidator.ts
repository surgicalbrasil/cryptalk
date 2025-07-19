/**
 * FileValidator - Validação modular e robusta de arquivos
 * Desacoplado de frameworks HTTP, usa apenas EventEmitter
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import * as path from 'path';
import { 
  ValidationResult, 
  DocumentType, 
  DocumentTypeConfig,
  IFileValidator 
} from '../../core/interfaces/IFileService';

export interface FileValidatorConfig {
  enableMalwareScanning: boolean;
  enableContentAnalysis: boolean;
  strictMimeTypeValidation: boolean;
  maxFileSizeBytes: number;
  temporaryValidationTimeout: number;
}

export class FileValidator extends EventEmitter implements IFileValidator {
  private config: FileValidatorConfig;
  private documentTypeConfigs: Map<DocumentType, DocumentTypeConfig>;

  constructor(config: Partial<FileValidatorConfig> = {}) {
    super();
    
    this.config = {
      enableMalwareScanning: false, // Disabled by default for performance
      enableContentAnalysis: true,
      strictMimeTypeValidation: true,
      maxFileSizeBytes: 50 * 1024 * 1024, // 50MB
      temporaryValidationTimeout: 30000, // 30 seconds
      ...config
    };

    this.documentTypeConfigs = this.initializeDocumentTypeConfigs();
  }

  private initializeDocumentTypeConfigs(): Map<DocumentType, DocumentTypeConfig> {
    const configs = new Map<DocumentType, DocumentTypeConfig>();

    configs.set('pitch-deck', {
      extensions: ['.pdf', '.ppt', '.pptx'],
      maxSize: 50 * 1024 * 1024, // 50MB
      mimeTypes: [
        'application/pdf',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ],
      validationRules: {
        requiresSignature: false,
        allowsEncryption: true,
        maxPages: 100
      }
    });

    configs.set('financial', {
      extensions: ['.pdf', '.xls', '.xlsx', '.csv'],
      maxSize: 25 * 1024 * 1024, // 25MB
      mimeTypes: [
        'application/pdf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
      ],
      validationRules: {
        requiresSignature: true,
        allowsEncryption: true,
        maxPages: 50
      }
    });

    configs.set('legal', {
      extensions: ['.pdf', '.doc', '.docx'],
      maxSize: 20 * 1024 * 1024, // 20MB
      mimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ],
      validationRules: {
        requiresSignature: true,
        allowsEncryption: false,
        maxPages: 200
      }
    });

    configs.set('technical', {
      extensions: ['.pdf', '.md', '.doc', '.docx'],
      maxSize: 30 * 1024 * 1024, // 30MB
      mimeTypes: [
        'application/pdf',
        'text/markdown',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ],
      validationRules: {
        requiresSignature: false,
        allowsEncryption: true,
        maxPages: 300
      }
    });

    configs.set('patent', {
      extensions: ['.pdf', '.doc', '.docx'],
      maxSize: 15 * 1024 * 1024, // 15MB
      mimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ],
      validationRules: {
        requiresSignature: true,
        allowsEncryption: false,
        maxPages: 150
      }
    });

    return configs;
  }

  /**
   * Validate file structure and integrity
   */
  async validateFileStructure(fileBuffer: Buffer, expectedType: DocumentType): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      detectedType: expectedType,
      securityFlags: {
        hasMacros: false,
        isEncrypted: false,
        isPasswordProtected: false,
        suspiciousContent: false
      }
    };

    try {
      // Basic buffer validation
      if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
        result.isValid = false;
        result.errors.push('Invalid or empty file buffer');
        return result;
      }

      // Check file size
      const typeConfig = this.documentTypeConfigs.get(expectedType);
      if (typeConfig && fileBuffer.length > typeConfig.maxSize) {
        result.isValid = false;
        result.errors.push(`File too large. Maximum size for ${expectedType}: ${Math.round(typeConfig.maxSize / (1024 * 1024))}MB`);
      }

      // Validate file signature (magic numbers)
      const magicNumbers = this.extractMagicNumbers(fileBuffer);
      const signatureValidation = this.validateFileSignature(magicNumbers, expectedType);
      
      if (!signatureValidation.isValid) {
        result.isValid = false;
        result.errors.push(...signatureValidation.errors);
      }

      // Security checks
      if (this.config.enableMalwareScanning) {
        const malwareCheck = await this.scanForMalware(fileBuffer);
        if (!malwareCheck) {
          result.isValid = false;
          result.errors.push('File failed malware scan');
          result.securityFlags!.suspiciousContent = true;
        }
      }

      // Check for encryption and password protection
      const encryptionCheck = this.checkForEncryption(fileBuffer, magicNumbers);
      result.securityFlags!.isEncrypted = encryptionCheck.isEncrypted;
      result.securityFlags!.isPasswordProtected = encryptionCheck.isPasswordProtected;

      // Apply document type specific validation rules
      if (typeConfig?.validationRules) {
        const rulesValidation = this.applyValidationRules(
          fileBuffer, 
          typeConfig.validationRules,
          result.securityFlags!
        );
        
        if (!rulesValidation.isValid) {
          result.isValid = false;
          result.errors.push(...rulesValidation.errors);
        }
        
        result.warnings.push(...rulesValidation.warnings);
      }

      this.emit('file_validated', {
        type: expectedType,
        size: fileBuffer.length,
        isValid: result.isValid,
        errors: result.errors,
        warnings: result.warnings
      });

      return result;

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      this.emit('validation_error', {
        type: expectedType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return result;
    }
  }

  /**
   * Scan for malware (basic implementation)
   */
  async scanForMalware(fileBuffer: Buffer): Promise<boolean> {
    if (!this.config.enableMalwareScanning) {
      return true;
    }

    try {
      // Basic heuristics for suspicious patterns
      const fileString = fileBuffer.toString('hex').toLowerCase();
      
      // Check for suspicious patterns (basic implementation)
      const suspiciousPatterns = [
        'eval\\s*\\(',
        'document\\.write',
        'iframe\\s+src',
        'script\\s+src',
        'javascript:',
        'vbscript:',
        'on\\w+\\s*=',
        'activexobject',
        'wscript\\.shell'
      ];

      for (const pattern of suspiciousPatterns) {
        if (new RegExp(pattern, 'i').test(fileString)) {
          this.emit('security_warning', {
            type: 'suspicious_pattern',
            pattern,
            timestamp: new Date()
          });
          return false;
        }
      }

      return true;

    } catch (error) {
      this.emit('malware_scan_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
      return false; // Fail closed for security
    }
  }

  /**
   * Check file integrity using hash
   */
  async checkFileIntegrity(fileBuffer: Buffer, expectedHash?: string): Promise<boolean> {
    try {
      if (!expectedHash) {
        return true; // No hash to verify against
      }

      const actualHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      const isValid = actualHash === expectedHash;

      if (!isValid) {
        this.emit('integrity_check_failed', {
          expectedHash,
          actualHash,
          timestamp: new Date()
        });
      }

      return isValid;

    } catch (error) {
      this.emit('integrity_check_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
      return false;
    }
  }

  /**
   * Extract metadata from file
   */
  async extractMetadata(fileBuffer: Buffer, fileName: string): Promise<Record<string, any>> {
    const metadata: Record<string, any> = {
      size: fileBuffer.length,
      fileName,
      extension: path.extname(fileName).toLowerCase(),
      hash: crypto.createHash('sha256').update(fileBuffer).digest('hex'),
      timestamp: new Date().toISOString()
    };

    try {
      const magicNumbers = this.extractMagicNumbers(fileBuffer);
      metadata.magicNumbers = magicNumbers;
      metadata.detectedMimeType = this.getMimeTypeFromMagicNumbers(magicNumbers);

      // Add file-type specific metadata
      const extension = metadata.extension as string;
      
      if (extension === '.pdf') {
        metadata.pdfMetadata = this.extractPdfMetadata(fileBuffer);
      } else if (['.doc', '.docx'].includes(extension)) {
        metadata.officeMetadata = this.extractOfficeMetadata(fileBuffer);
      }

      return metadata;

    } catch (error) {
      this.emit('metadata_extraction_error', {
        fileName,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
      
      return metadata;
    }
  }

  /**
   * Analyze file content
   */
  async analyzeContent(fileBuffer: Buffer, documentType: DocumentType): Promise<{
    pageCount?: number;
    wordCount?: number;
    hasImages?: boolean;
    hasTable?: boolean;
    language?: string;
  }> {
    const analysis: any = {};

    if (!this.config.enableContentAnalysis) {
      return analysis;
    }

    try {
      const magicNumbers = this.extractMagicNumbers(fileBuffer);
      
      if (this.isPdfFile(magicNumbers)) {
        analysis.pageCount = this.estimatePdfPageCount(fileBuffer);
        analysis.hasImages = this.checkForPdfImages(fileBuffer);
        analysis.hasTable = this.checkForPdfTables(fileBuffer);
      }
      
      if (this.isTextBasedFile(magicNumbers)) {
        const textContent = this.extractTextContent(fileBuffer);
        analysis.wordCount = this.countWords(textContent);
        analysis.language = this.detectLanguage(textContent);
      }

      return analysis;

    } catch (error) {
      this.emit('content_analysis_error', {
        documentType,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
      
      return analysis;
    }
  }

  /**
   * Get document type configuration
   */
  getDocumentTypeConfig(documentType: DocumentType): DocumentTypeConfig | undefined {
    return this.documentTypeConfigs.get(documentType);
  }

  /**
   * Update document type configuration
   */
  updateDocumentTypeConfig(documentType: DocumentType, config: DocumentTypeConfig): void {
    this.documentTypeConfigs.set(documentType, config);
    this.emit('config_updated', { documentType, config });
  }

  // Private helper methods

  private extractMagicNumbers(fileBuffer: Buffer): string {
    return fileBuffer.toString('hex', 0, Math.min(16, fileBuffer.length)).toLowerCase();
  }

  private validateFileSignature(magicNumbers: string, expectedType: DocumentType): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [] };
    
    const typeConfig = this.documentTypeConfigs.get(expectedType);
    if (!typeConfig) {
      result.isValid = false;
      result.errors.push(`Unknown document type: ${expectedType}`);
      return result;
    }

    const detectedMimeType = this.getMimeTypeFromMagicNumbers(magicNumbers);
    
    if (this.config.strictMimeTypeValidation && !typeConfig.mimeTypes.includes(detectedMimeType)) {
      result.isValid = false;
      result.errors.push(
        `File signature doesn't match expected type. Detected: ${detectedMimeType}, Expected: ${typeConfig.mimeTypes.join(', ')}`
      );
    }

    return result;
  }

  private getMimeTypeFromMagicNumbers(magicNumbers: string): string {
    // PDF
    if (magicNumbers.startsWith('25504446')) return 'application/pdf';
    
    // Office formats
    if (magicNumbers.startsWith('504b0304')) {
      return 'application/vnd.openxmlformats-officedocument'; // Generic Office
    }
    
    // Legacy Office
    if (magicNumbers.startsWith('d0cf11e0')) {
      return 'application/vnd.ms-office'; // Generic legacy Office
    }

    // Text files
    if (this.isTextFile(magicNumbers)) return 'text/plain';
    
    return 'application/octet-stream';
  }

  private checkForEncryption(fileBuffer: Buffer, magicNumbers: string): {
    isEncrypted: boolean;
    isPasswordProtected: boolean;
  } {
    // Basic heuristics for encrypted files
    const isEncrypted = this.hasEncryptionMarkers(fileBuffer);
    const isPasswordProtected = this.hasPasswordProtectionMarkers(fileBuffer);

    return { isEncrypted, isPasswordProtected };
  }

  private hasEncryptionMarkers(fileBuffer: Buffer): boolean {
    const searchString = fileBuffer.toString('ascii', 0, Math.min(1024, fileBuffer.length));
    return /encrypt|cipher|crypt/i.test(searchString);
  }

  private hasPasswordProtectionMarkers(fileBuffer: Buffer): boolean {
    const searchString = fileBuffer.toString('ascii', 0, Math.min(1024, fileBuffer.length));
    return /password|protected|locked/i.test(searchString);
  }

  private applyValidationRules(
    fileBuffer: Buffer, 
    rules: DocumentTypeConfig['validationRules'],
    securityFlags: NonNullable<ValidationResult['securityFlags']>
  ): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [] };

    if (!rules) return result;

    // Check encryption rules
    if (!rules.allowsEncryption && securityFlags.isEncrypted) {
      result.isValid = false;
      result.errors.push('Encrypted files are not allowed for this document type');
    }

    // Check signature requirements
    if (rules.requiresSignature && !this.hasDigitalSignature(fileBuffer)) {
      result.warnings.push('Document should have a digital signature');
    }

    return result;
  }

  private hasDigitalSignature(fileBuffer: Buffer): boolean {
    // Basic check for digital signature markers
    const searchString = fileBuffer.toString('ascii', 0, Math.min(2048, fileBuffer.length));
    return /signature|signed|certificate/i.test(searchString);
  }

  private isPdfFile(magicNumbers: string): boolean {
    return magicNumbers.startsWith('25504446');
  }

  private isTextBasedFile(magicNumbers: string): boolean {
    return this.isTextFile(magicNumbers);
  }

  private isTextFile(magicNumbers: string): boolean {
    // Check for common text file patterns
    const textPatterns = ['efbbbf', 'fffe', 'feff']; // BOM markers
    return textPatterns.some(pattern => magicNumbers.startsWith(pattern));
  }

  private estimatePdfPageCount(fileBuffer: Buffer): number {
    // Simple heuristic: count page objects in PDF
    const pdfString = fileBuffer.toString('ascii');
    const pageMatches = pdfString.match(/\/Type\s*\/Page[^s]/g);
    return pageMatches ? pageMatches.length : 1;
  }

  private checkForPdfImages(fileBuffer: Buffer): boolean {
    const pdfString = fileBuffer.toString('ascii', 0, Math.min(10240, fileBuffer.length));
    return /\/Image|\/XObject/i.test(pdfString);
  }

  private checkForPdfTables(fileBuffer: Buffer): boolean {
    const pdfString = fileBuffer.toString('ascii', 0, Math.min(10240, fileBuffer.length));
    return /\/Table|Td|TR/i.test(pdfString);
  }

  private extractTextContent(fileBuffer: Buffer): string {
    // Very basic text extraction for analysis
    return fileBuffer.toString('utf8', 0, Math.min(5000, fileBuffer.length));
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private detectLanguage(text: string): string {
    // Very basic language detection
    const portugueseWords = ['e', 'o', 'a', 'de', 'do', 'da', 'em', 'um', 'uma', 'para', 'com', 'não'];
    const englishWords = ['the', 'and', 'of', 'to', 'in', 'a', 'is', 'it', 'you', 'that', 'he', 'was'];
    
    const words = text.toLowerCase().split(/\s+/);
    
    const portugueseCount = words.filter(word => portugueseWords.includes(word)).length;
    const englishCount = words.filter(word => englishWords.includes(word)).length;
    
    if (portugueseCount > englishCount) {
      return 'pt-BR';
    } else if (englishCount > portugueseCount) {
      return 'en-US';
    }
    
    return 'unknown';
  }

  private extractPdfMetadata(fileBuffer: Buffer): Record<string, any> {
    const metadata: Record<string, any> = {};
    
    try {
      const pdfString = fileBuffer.toString('ascii', 0, Math.min(5000, fileBuffer.length));
      
      // Extract PDF version
      const versionMatch = pdfString.match(/%PDF-(\d+\.\d+)/);
      if (versionMatch) {
        metadata.version = versionMatch[1];
      }
      
      // Check for linearization (fast web view)
      metadata.isLinearized = /\/Linearized/.test(pdfString);
      
    } catch (error) {
      // Ignore extraction errors
    }
    
    return metadata;
  }

  private extractOfficeMetadata(fileBuffer: Buffer): Record<string, any> {
    const metadata: Record<string, any> = {};
    
    try {
      // Basic Office document detection
      metadata.isOfficeDocument = true;
      metadata.hasEmbeddedObjects = this.hasEmbeddedObjects(fileBuffer);
      
    } catch (error) {
      // Ignore extraction errors
    }
    
    return metadata;
  }

  private hasEmbeddedObjects(fileBuffer: Buffer): boolean {
    const searchString = fileBuffer.toString('ascii', 0, Math.min(2048, fileBuffer.length));
    return /embed|object|ole/i.test(searchString);
  }
}