/**
 * Teste abrangente do módulo Upload/File refatorado
 * Valida FileService, UploadManager, FileValidator e interfaces
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import { FileService } from './FileService';
import { UploadManager } from './UploadManager';
import { FileValidator } from './FileValidator';
import type { 
  DocumentType, 
  FileMetadata, 
  ValidationResult,
  DocumentTypeConfig,
  UploadConfig 
} from '../../core/interfaces/IFileService';

// Mock do módulo fs/promises
vi.mock('fs/promises', () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  readFile: vi.fn(),
  unlink: vi.fn(),
  rename: vi.fn(),
  access: vi.fn(),
  stat: vi.fn(),
  constants: {
    W_OK: 2
  }
}));

describe('Upload Module Tests', () => {
  let fileService: FileService;
  let uploadManager: UploadManager;
  let fileValidator: FileValidator;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Configuração de teste
    const testConfig = {
      uploadPath: '/test/uploads',
      tempPath: '/test/temp',
      maxFileSize: 10 * 1024 * 1024, // 10MB
      storage: {
        type: 'memory' as const,
        memoryLimit: 5 * 1024 * 1024, // 5MB
        diskPath: '/test/disk'
      }
    };

    fileService = new FileService(testConfig);
    uploadManager = new UploadManager(testConfig);
    fileValidator = new FileValidator({
      enableMalwareScanning: true,
      enableContentAnalysis: true
    });
  });

  afterEach(() => {
    fileService.destroy();
    uploadManager.destroy();
  });

  describe('FileValidator', () => {
    describe('File Type Validation', () => {
      it('deve validar arquivos PDF válidos', async () => {
        const pdfBuffer = Buffer.from('25504446', 'hex'); // PDF magic number
        const result = await fileValidator.validateFileStructure(pdfBuffer, 'pitch-deck');
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('deve rejeitar arquivos com tipo incorreto', async () => {
        const invalidBuffer = Buffer.from('invaliddata');
        const result = await fileValidator.validateFileStructure(invalidBuffer, 'pitch-deck');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('deve detectar MIME types corretamente', () => {
        const config = fileValidator.getDocumentTypeConfig('financial');
        expect(config).toBeDefined();
        expect(config?.mimeTypes).toContain('application/pdf');
        expect(config?.mimeTypes).toContain('text/csv');
      });
    });

    describe('Size Validation', () => {
      it('deve validar tamanho máximo por tipo de documento', async () => {
        const largeBuffer = Buffer.alloc(100 * 1024 * 1024); // 100MB
        const result = await fileValidator.validateFileStructure(largeBuffer, 'pitch-deck');
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(expect.stringContaining('File too large'));
      });

      it('deve aceitar arquivos dentro do limite', async () => {
        const validBuffer = Buffer.alloc(1 * 1024 * 1024); // 1MB
        validBuffer.write('25504446', 0, 'hex'); // PDF header
        const result = await fileValidator.validateFileStructure(validBuffer, 'pitch-deck');
        
        expect(result.errors).not.toContain(expect.stringContaining('File too large'));
      });
    });

    describe('Security Validation', () => {
      it('deve detectar padrões suspeitos', async () => {
        const maliciousBuffer = Buffer.from('eval(document.write)', 'utf8');
        const isSafe = await fileValidator.scanForMalware(maliciousBuffer);
        
        expect(isSafe).toBe(false);
      });

      it('deve detectar marcadores de criptografia', async () => {
        const encryptedBuffer = Buffer.from('encrypted content cipher protected', 'utf8');
        const result = await fileValidator.validateFileStructure(encryptedBuffer, 'legal');
        
        expect(result.securityFlags?.isEncrypted).toBe(true);
        expect(result.securityFlags?.isPasswordProtected).toBe(true);
      });

      it('deve validar integridade do arquivo com hash', async () => {
        const fileBuffer = Buffer.from('test content');
        const expectedHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        
        const isValid = await fileValidator.checkFileIntegrity(fileBuffer, expectedHash);
        expect(isValid).toBe(true);
        
        const invalidHash = 'invalidhash123';
        const isInvalid = await fileValidator.checkFileIntegrity(fileBuffer, invalidHash);
        expect(isInvalid).toBe(false);
      });
    });

    describe('Metadata Extraction', () => {
      it('deve extrair metadados básicos', async () => {
        const fileBuffer = Buffer.from('test content');
        const fileName = 'document.pdf';
        
        const metadata = await fileValidator.extractMetadata(fileBuffer, fileName);
        
        expect(metadata.size).toBe(fileBuffer.length);
        expect(metadata.fileName).toBe(fileName);
        expect(metadata.extension).toBe('.pdf');
        expect(metadata.hash).toBeDefined();
        expect(metadata.timestamp).toBeDefined();
      });

      it('deve analisar conteúdo de documentos', async () => {
        const textBuffer = Buffer.from('This is a test document with some words');
        const analysis = await fileValidator.analyzeContent(textBuffer, 'technical');
        
        expect(analysis.wordCount).toBeDefined();
        expect(analysis.language).toBeDefined();
      });
    });
  });

  describe('FileService', () => {
    describe('Upload Processing', () => {
      it('deve processar upload completo com sucesso', async () => {
        const fileBuffer = Buffer.from('25504446test content');
        const originalName = 'test.pdf';
        const documentType: DocumentType = 'pitch-deck';
        const clientId = 'client123';

        const metadata = await fileService.processUpload(
          fileBuffer, 
          originalName, 
          documentType, 
          clientId
        );

        expect(metadata).toBeDefined();
        expect(metadata.originalName).toBe(originalName);
        expect(metadata.documentType).toBe(documentType);
        expect(metadata.clientId).toBe(clientId);
        expect(metadata.status).toBe('ready');
        expect(metadata.id).toContain(clientId);
      });

      it('deve rejeitar uploads inválidos', async () => {
        const invalidBuffer = Buffer.alloc(0); // Buffer vazio
        
        await expect(
          fileService.processUpload(invalidBuffer, 'test.pdf', 'pitch-deck', 'client123')
        ).rejects.toThrow('Invalid file buffer');
      });

      it('deve validar parâmetros obrigatórios', async () => {
        const fileBuffer = Buffer.from('test');
        
        await expect(
          fileService.processUpload(fileBuffer, '', 'pitch-deck', 'client123')
        ).rejects.toThrow('Missing required parameters');
      });
    });

    describe('Event System', () => {
      it('deve emitir evento file_uploaded', async () => {
        const uploadedEvent = vi.fn();
        fileService.on('file_uploaded', uploadedEvent);

        const fileBuffer = Buffer.from('25504446test content');
        await fileService.processUpload(fileBuffer, 'test.pdf', 'pitch-deck', 'client123');

        expect(uploadedEvent).toHaveBeenCalled();
        const eventData = uploadedEvent.mock.calls[0][0];
        expect(eventData.fileId).toBeDefined();
        expect(eventData.originalName).toBe('test.pdf');
        expect(eventData.processingTime).toBeDefined();
      });

      it('deve emitir evento validation_error', async () => {
        const validationErrorEvent = vi.fn();
        fileService.on('validation_error', validationErrorEvent);

        const invalidBuffer = Buffer.from('invalid');
        await expect(
          fileService.processUpload(invalidBuffer, 'test.exe', 'pitch-deck', 'client123')
        ).rejects.toThrow();

        expect(validationErrorEvent).toHaveBeenCalled();
      });

      it('deve emitir eventos de progresso', async () => {
        const events: string[] = [];
        fileService.on('upload_started', () => events.push('started'));
        fileService.on('file_validated', () => events.push('validated'));
        fileService.on('file_saved', () => events.push('saved'));
        fileService.on('file_uploaded', () => events.push('uploaded'));

        const fileBuffer = Buffer.from('25504446test content');
        await fileService.processUpload(fileBuffer, 'test.pdf', 'pitch-deck', 'client123');

        expect(events).toContain('started');
        expect(events).toContain('validated');
        expect(events).toContain('saved');
        expect(events).toContain('uploaded');
      });
    });

    describe('Storage Operations', () => {
      it('deve salvar arquivo na memória para arquivos pequenos', async () => {
        const smallBuffer = Buffer.from('small file');
        const metadata: FileMetadata = {
          id: 'test-123',
          originalName: 'small.pdf',
          safeFileName: 'small_123.pdf',
          documentType: 'pitch-deck',
          clientId: 'client123',
          size: smallBuffer.length,
          hash: 'testhash',
          uploadedAt: new Date(),
          mimeType: 'application/pdf',
          status: 'uploading'
        };

        const path = await fileService.saveFile(metadata, smallBuffer);
        expect(path).toContain('memory://');
        
        const readBuffer = await fileService.readFile(metadata.id);
        expect(readBuffer).toEqual(smallBuffer);
      });

      it('deve salvar arquivo no disco para arquivos grandes', async () => {
        // Mock para simular salvamento em disco
        vi.mocked(fs.writeFile).mockResolvedValue();
        
        const largeService = new FileService({
          storage: {
            type: 'hybrid',
            memoryLimit: 100, // Limite muito baixo
            diskPath: '/test/disk'
          }
        });

        const largeBuffer = Buffer.alloc(1024); // 1KB
        const metadata: FileMetadata = {
          id: 'test-456',
          originalName: 'large.pdf',
          safeFileName: 'large_456.pdf',
          documentType: 'financial',
          clientId: 'client456',
          size: largeBuffer.length,
          hash: 'largehash',
          uploadedAt: new Date(),
          mimeType: 'application/pdf',
          status: 'uploading'
        };

        const path = await largeService.saveFile(metadata, largeBuffer);
        expect(path).toContain('/test/disk');
        expect(fs.writeFile).toHaveBeenCalled();

        largeService.destroy();
      });

      it('deve deletar arquivo corretamente', async () => {
        const fileBuffer = Buffer.from('test file');
        const metadata = await fileService.generateFileMetadata(
          fileBuffer, 
          'test.pdf', 
          'pitch-deck', 
          'client123'
        );
        
        await fileService.saveFile(metadata, fileBuffer);
        
        const deleteEvent = vi.fn();
        fileService.on('file_deleted', deleteEvent);

        await fileService.deleteFile(metadata.id);
        
        expect(deleteEvent).toHaveBeenCalled();
        await expect(fileService.readFile(metadata.id)).rejects.toThrow('File not found');
      });

      it('deve listar arquivos com filtros', async () => {
        // Salvar alguns arquivos
        const files = [
          { buffer: Buffer.from('file1'), name: 'doc1.pdf', type: 'pitch-deck' as DocumentType, client: 'client1' },
          { buffer: Buffer.from('file2'), name: 'doc2.pdf', type: 'financial' as DocumentType, client: 'client1' },
          { buffer: Buffer.from('file3'), name: 'doc3.pdf', type: 'pitch-deck' as DocumentType, client: 'client2' }
        ];

        for (const file of files) {
          await fileService.processUpload(file.buffer, file.name, file.type, file.client);
        }

        // Listar todos
        const allFiles = await fileService.listFiles();
        expect(allFiles.length).toBe(3);

        // Listar por cliente
        const client1Files = await fileService.listFiles('client1');
        expect(client1Files.length).toBe(2);

        // Listar por tipo
        const pitchDeckFiles = await fileService.listFiles(undefined, 'pitch-deck');
        expect(pitchDeckFiles.length).toBe(2);
      });
    });

    describe('Configuration', () => {
      it('deve retornar configuração geral de upload', () => {
        const config = fileService.getUploadConfig();
        expect(config).toBeDefined();
        expect((config as UploadConfig).maxFileSize).toBeDefined();
        expect((config as UploadConfig).allowedExtensions).toBeInstanceOf(Array);
      });

      it('deve retornar configuração específica por tipo', () => {
        const pitchDeckConfig = fileService.getUploadConfig('pitch-deck');
        expect(pitchDeckConfig).toBeDefined();
        expect((pitchDeckConfig as DocumentTypeConfig).extensions).toContain('.pdf');
        expect((pitchDeckConfig as DocumentTypeConfig).extensions).toContain('.pptx');
      });

      it('deve atualizar configuração dinamicamente', async () => {
        const configUpdateEvent = vi.fn();
        fileService.on('config_updated', configUpdateEvent);

        await fileService.updateConfig({
          maxFileSize: 100 * 1024 * 1024
        });

        expect(configUpdateEvent).toHaveBeenCalled();
        
        const updatedConfig = fileService.getUploadConfig() as UploadConfig;
        expect(updatedConfig.maxFileSize).toBe(100 * 1024 * 1024);
      });

      it('deve retornar tipos de documento permitidos', () => {
        const allowedTypes = fileService.getAllowedTypes();
        expect(allowedTypes).toContain('pitch-deck');
        expect(allowedTypes).toContain('financial');
        expect(allowedTypes).toContain('legal');
        expect(allowedTypes).toContain('technical');
        expect(allowedTypes).toContain('patent');
      });
    });

    describe('Statistics', () => {
      it('deve rastrear estatísticas de upload', async () => {
        const fileBuffer = Buffer.from('test content');
        
        await fileService.processUpload(fileBuffer, 'test1.pdf', 'pitch-deck', 'client123');
        await fileService.processUpload(fileBuffer, 'test2.pdf', 'financial', 'client123');

        const stats = await fileService.getStats();
        
        expect(stats.totalUploads).toBe(2);
        expect(stats.totalSize).toBe(fileBuffer.length * 2);
        expect(stats.uploadsByType['pitch-deck']).toBe(1);
        expect(stats.uploadsByType['financial']).toBe(1);
        expect(stats.averageSize).toBe(fileBuffer.length);
      });

      it('deve rastrear estatísticas por cliente', async () => {
        const fileBuffer = Buffer.from('test content');
        
        await fileService.processUpload(fileBuffer, 'test1.pdf', 'pitch-deck', 'client123');
        await fileService.processUpload(fileBuffer, 'test2.pdf', 'financial', 'client123');
        await fileService.processUpload(fileBuffer, 'test3.pdf', 'legal', 'client456');

        const clientStats = await fileService.getStatsForClient('client123');
        
        expect(clientStats.totalUploads).toBe(2);
        expect(clientStats.uploadsByType?.['pitch-deck']).toBe(1);
        expect(clientStats.uploadsByType?.['financial']).toBe(1);
      });
    });

    describe('Maintenance', () => {
      it('deve limpar arquivos expirados', async () => {
        // Criar serviço com tempo de vida curto
        const shortLivedService = new FileService({
          maxFileAge: 100 // 100ms
        });

        const fileBuffer = Buffer.from('test');
        await shortLivedService.processUpload(fileBuffer, 'old.pdf', 'pitch-deck', 'client123');

        // Aguardar expiração
        await new Promise(resolve => setTimeout(resolve, 150));

        const deletedCount = await shortLivedService.cleanupExpiredFiles();
        expect(deletedCount).toBe(1);

        const files = await shortLivedService.listFiles();
        expect(files.length).toBe(0);

        shortLivedService.destroy();
      });

      it('deve arquivar arquivos antigos', async () => {
        const fileBuffer = Buffer.from('test');
        const metadata = await fileService.processUpload(fileBuffer, 'old.pdf', 'pitch-deck', 'client123');

        const olderThan = new Date(Date.now() + 1000); // 1 segundo no futuro
        const archivedCount = await fileService.archiveOldFiles(olderThan);
        
        expect(archivedCount).toBe(1);

        const updatedMetadata = await fileService.getFileMetadata(metadata.id);
        expect(updatedMetadata?.status).toBe('archived');
      });

      it('deve validar disponibilidade de armazenamento', async () => {
        vi.mocked(fs.access).mockResolvedValue();
        vi.mocked(fs.stat).mockResolvedValue({} as any);

        const storageStatus = await fileService.validateStorage();
        
        expect(storageStatus.available).toBe(true);
        expect(storageStatus.issues).toHaveLength(0);
      });
    });
  });

  describe('UploadManager', () => {
    describe('Resumable Upload', () => {
      it('deve iniciar sessão de upload resumível', async () => {
        const sessionStartEvent = vi.fn();
        uploadManager.on('upload_session_started', sessionStartEvent);

        const sessionId = await uploadManager.startResumableUpload(
          'large-file.pdf',
          10 * 1024 * 1024, // 10MB
          'pitch-deck',
          'client123'
        );

        expect(sessionId).toBeDefined();
        expect(sessionStartEvent).toHaveBeenCalled();
        
        const eventData = sessionStartEvent.mock.calls[0][0];
        expect(eventData.expectedChunks).toBe(10); // 10MB / 1MB chunks
      });

      it('deve processar chunks de upload', async () => {
        const chunkUploadEvent = vi.fn();
        uploadManager.on('chunk_uploaded', chunkUploadEvent);

        const sessionId = await uploadManager.startResumableUpload(
          'file.pdf',
          2 * 1024 * 1024, // 2MB
          'pitch-deck',
          'client123'
        );

        const chunk1 = Buffer.alloc(1024 * 1024); // 1MB
        await uploadManager.resumeUpload(sessionId, chunk1, 0);

        expect(chunkUploadEvent).toHaveBeenCalled();
        const eventData = chunkUploadEvent.mock.calls[0][0];
        expect(eventData.progress).toBe(50); // 1 of 2 chunks
      });

      it('deve completar upload após todos os chunks', async () => {
        const completeEvent = vi.fn();
        uploadManager.on('resumable_upload_completed', completeEvent);

        const sessionId = await uploadManager.startResumableUpload(
          'file.pdf',
          1024 * 1024, // 1MB
          'pitch-deck',
          'client123'
        );

        const chunk = Buffer.alloc(1024 * 1024, '25504446', 'hex'); // PDF header
        await uploadManager.resumeUpload(sessionId, chunk, 0);

        expect(completeEvent).toHaveBeenCalled();
      });

      it('deve pausar e cancelar uploads', async () => {
        const sessionId = await uploadManager.startResumableUpload(
          'file.pdf',
          10 * 1024 * 1024,
          'pitch-deck',
          'client123'
        );

        await uploadManager.pauseUpload(sessionId);
        const pausedStatus = uploadManager.getUploadSessionStatus(sessionId);
        expect(pausedStatus.status).toBe('paused');

        await uploadManager.cancelUpload(sessionId);
        const cancelledStatus = uploadManager.getUploadSessionStatus(sessionId);
        expect(cancelledStatus.exists).toBe(false);
      });
    });

    describe('Batch Processing', () => {
      it('deve processar múltiplos arquivos em lote', async () => {
        const batchStartEvent = vi.fn();
        const batchCompleteEvent = vi.fn();
        uploadManager.on('batch_started', batchStartEvent);
        uploadManager.on('batch_completed', batchCompleteEvent);

        const files = [
          { buffer: Buffer.from('25504446file1'), name: 'file1.pdf', type: 'pitch-deck' as DocumentType },
          { buffer: Buffer.from('25504446file2'), name: 'file2.pdf', type: 'financial' as DocumentType },
          { buffer: Buffer.from('25504446file3'), name: 'file3.pdf', type: 'legal' as DocumentType }
        ];

        const results = await uploadManager.processBatch(files, 'client123');

        expect(results).toHaveLength(3);
        expect(batchStartEvent).toHaveBeenCalled();
        expect(batchCompleteEvent).toHaveBeenCalled();
        
        const completeData = batchCompleteEvent.mock.calls[0][0];
        expect(completeData.successCount).toBe(3);
        expect(completeData.errorCount).toBe(0);
      });

      it('deve validar arquivos em lote', async () => {
        const files = [
          { buffer: Buffer.from('25504446valid'), name: 'valid.pdf', type: 'pitch-deck' as DocumentType },
          { buffer: Buffer.from('invalid'), name: 'invalid.exe', type: 'financial' as DocumentType }
        ];

        const results = await uploadManager.validateBatch(files);

        expect(results).toHaveLength(2);
        expect(results[0].isValid).toBe(true);
        expect(results[1].isValid).toBe(false);
      });

      it('deve lidar com erros em processamento em lote', async () => {
        const batchErrorEvent = vi.fn();
        uploadManager.on('batch_file_error', batchErrorEvent);

        const files = [
          { buffer: Buffer.from('25504446valid'), name: 'valid.pdf', type: 'pitch-deck' as DocumentType },
          { buffer: Buffer.alloc(0), name: 'empty.pdf', type: 'financial' as DocumentType } // Arquivo vazio causará erro
        ];

        const results = await uploadManager.processBatch(files, 'client123');

        expect(results.length).toBeLessThan(files.length);
        expect(batchErrorEvent).toHaveBeenCalled();
      });
    });

    describe('Container Integration', () => {
      it('deve solicitar transferência para container', async () => {
        const transferEvent = vi.fn();
        uploadManager.on('container_transfer_requested', transferEvent);

        const fileBuffer = Buffer.from('test content');
        const metadata = await uploadManager.processUpload(
          fileBuffer, 
          'test.pdf', 
          'pitch-deck', 
          'client123'
        );

        await uploadManager.transferToContainer(
          metadata.id,
          'container123',
          '/app/uploads/test.pdf'
        );

        expect(transferEvent).toHaveBeenCalled();
        const eventData = transferEvent.mock.calls[0][0];
        expect(eventData.fileId).toBe(metadata.id);
        expect(eventData.containerId).toBe('container123');
        expect(eventData.containerPath).toBe('/app/uploads/test.pdf');
      });

      it('deve falhar transferência quando integração desabilitada', async () => {
        const disabledManager = new UploadManager({
          containerIntegration: {
            enabled: false,
            defaultContainerPath: '/app',
            transferTimeout: 60000
          }
        });

        await expect(
          disabledManager.transferToContainer('file123', 'container123', '/path')
        ).rejects.toThrow('Container integration is not enabled');

        disabledManager.destroy();
      });
    });

    describe('Status and Monitoring', () => {
      it('deve rastrear uploads ativos', async () => {
        const initialCount = uploadManager.getActiveUploadsCount();
        expect(initialCount).toBe(0);

        const uploadPromise = uploadManager.processUpload(
          Buffer.from('test'),
          'test.pdf',
          'pitch-deck',
          'client123'
        );

        // Durante o upload
        const activeCount = uploadManager.getActiveUploadsCount();
        expect(activeCount).toBeGreaterThan(0);

        await uploadPromise;

        // Após conclusão
        const finalCount = uploadManager.getActiveUploadsCount();
        expect(finalCount).toBe(0);
      });

      it('deve fornecer status de operações em lote', async () => {
        const files = [
          { buffer: Buffer.from('file1'), name: 'file1.pdf', type: 'pitch-deck' as DocumentType }
        ];

        const batchPromise = uploadManager.processBatch(files, 'client123');
        
        // Obter ID do batch através do evento
        let batchId: string = '';
        uploadManager.once('batch_started', (data) => {
          batchId = data.batchId;
        });

        await batchPromise;

        const batchStatus = uploadManager.getBatchStatus(batchId);
        expect(batchStatus).toBeDefined();
        expect(batchStatus?.status).toBe('completed');
        expect(batchStatus?.results.length).toBe(1);
      });
    });
  });

  describe('Integration Tests', () => {
    it('deve processar upload completo com validação e eventos', async () => {
      const events: string[] = [];
      
      // Registrar todos os eventos
      fileService.on('upload_started', () => events.push('upload_started'));
      fileService.on('file_validated', () => events.push('file_validated'));
      fileService.on('file_saved', () => events.push('file_saved'));
      fileService.on('file_uploaded', () => events.push('file_uploaded'));

      const fileBuffer = Buffer.from('25504446' + 'a'.repeat(1000), 'hex');
      const metadata = await fileService.processUpload(
        fileBuffer,
        'integration-test.pdf',
        'pitch-deck',
        'client-integration'
      );

      // Verificar metadados
      expect(metadata.id).toContain('client-integration');
      expect(metadata.status).toBe('ready');
      expect(metadata.size).toBe(fileBuffer.length);
      expect(metadata.mimeType).toBe('application/pdf');

      // Verificar eventos emitidos
      expect(events).toContain('upload_started');
      expect(events).toContain('file_validated');
      expect(events).toContain('file_saved');
      expect(events).toContain('file_uploaded');

      // Verificar leitura do arquivo
      const readBuffer = await fileService.readFile(metadata.id);
      expect(readBuffer).toEqual(fileBuffer);

      // Verificar estatísticas
      const stats = await fileService.getStats();
      expect(stats.totalUploads).toBeGreaterThan(0);
      expect(stats.uploadsByType['pitch-deck']).toBeGreaterThan(0);
    });

    it('deve integrar validação customizada com upload manager', async () => {
      // Criar validador customizado
      const customValidator = new FileValidator({
        enableMalwareScanning: true,
        strictMimeTypeValidation: true
      });

      // Registrar evento de segurança
      const securityWarnings: any[] = [];
      customValidator.on('security_warning', (warning) => {
        securityWarnings.push(warning);
      });

      // Arquivo suspeito
      const suspiciousBuffer = Buffer.from('eval(malicious code)');
      
      // Validar arquivo
      const validationResult = await customValidator.validateFileStructure(
        suspiciousBuffer,
        'technical'
      );

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.securityFlags?.suspiciousContent).toBe(true);
      expect(securityWarnings.length).toBeGreaterThan(0);
    });

    it('deve processar upload resumível completo', async () => {
      const fileSize = 5 * 1024 * 1024; // 5MB
      const chunkSize = 1024 * 1024; // 1MB
      const totalChunks = Math.ceil(fileSize / chunkSize);

      // Iniciar sessão
      const sessionId = await uploadManager.startResumableUpload(
        'large-resumable.pdf',
        fileSize,
        'financial',
        'client-resumable'
      );

      // Upload de chunks
      for (let i = 0; i < totalChunks; i++) {
        const isLastChunk = i === totalChunks - 1;
        const currentChunkSize = isLastChunk ? 
          fileSize - (i * chunkSize) : 
          chunkSize;
        
        const chunk = Buffer.alloc(currentChunkSize);
        if (i === 0) {
          chunk.write('25504446', 0, 'hex'); // PDF header no primeiro chunk
        }
        
        await uploadManager.resumeUpload(sessionId, chunk, i * chunkSize);
      }

      // Verificar status final
      const finalStatus = uploadManager.getUploadSessionStatus(sessionId);
      expect(finalStatus.progress).toBe(100);
      expect(finalStatus.status).toBe('completed');
    });
  });

  describe('Error Handling', () => {
    it('deve lidar com erros de sistema de arquivos', async () => {
      vi.mocked(fs.writeFile).mockRejectedValue(new Error('Disk full'));
      
      const diskService = new FileService({
        storage: {
          type: 'disk',
          memoryLimit: 0,
          diskPath: '/test/disk'
        }
      });

      const fileBuffer = Buffer.from('test');
      await expect(
        diskService.processUpload(fileBuffer, 'test.pdf', 'pitch-deck', 'client123')
      ).rejects.toThrow();

      diskService.destroy();
    });

    it('deve recuperar de falhas em processamento em lote', async () => {
      const files = [
        { buffer: Buffer.from('25504446file1'), name: 'file1.pdf', type: 'pitch-deck' as DocumentType },
        { buffer: Buffer.alloc(0), name: 'empty.pdf', type: 'financial' as DocumentType },
        { buffer: Buffer.from('25504446file3'), name: 'file3.pdf', type: 'legal' as DocumentType }
      ];

      const results = await uploadManager.processBatch(files, 'client123');
      
      // Deve processar arquivos válidos mesmo com falhas
      expect(results.length).toBe(2);
      expect(results.every(r => r.status === 'ready')).toBe(true);
    });

    it('deve limpar recursos corretamente após destruição', () => {
      const service = new FileService();
      const destroyEvent = vi.fn();
      service.on('service_destroyed', destroyEvent);

      service.destroy();

      expect(destroyEvent).toHaveBeenCalled();
      expect(() => service.emit('test', {})).not.toThrow();
    });
  });
});