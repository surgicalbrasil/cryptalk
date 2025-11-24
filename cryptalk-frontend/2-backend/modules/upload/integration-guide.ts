/**
 * Guia de Integração do Módulo Upload/File
 * Demonstra como integrar o módulo com o código existente (Express, containers, etc.)
 */

import { Request, Response } from 'express';
import { initializeUploadModule, UploadManager } from './index';

// Exemplo de integração com Express
class UploadIntegration {
  private uploadModule: ReturnType<typeof initializeUploadModule>;

  constructor() {
    this.uploadModule = initializeUploadModule({
      fileService: {
        uploadPath: '/tmp/cryptalk-uploads',
        storage: {
          type: 'hybrid',
          memoryLimit: 100 * 1024 * 1024 // 100MB
        }
      },
      uploadManager: {
        chunkedUpload: { enabled: true },
        batchProcessing: { enabled: true },
        containerIntegration: { enabled: true }
      }
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Handler para transferência de arquivos para containers
    this.uploadModule.on('container_transfer_requested', async (data) => {
      try {
        // Integração com o container manager existente
        await this.transferToDockerContainer(
          data.containerId,
          data.containerPath,
          data.fileBuffer
        );
        
        console.log(`✅ Arquivo transferido para container ${data.containerId}: ${data.containerPath}`);
      } catch (error) {
        console.error(`❌ Erro na transferência para container:`, error);
      }
    });

    // Outros event handlers...
    this.uploadModule.on('file_uploaded', (data) => {
      console.log(`📁 Arquivo enviado: ${data.originalName} (${data.fileId})`);
    });

    this.uploadModule.on('security_warning', (data) => {
      console.warn(`⚠️ Alerta de segurança:`, data);
    });
  }

  /**
   * Middleware Express para upload de arquivo único
   * Substitui o middleware do multer
   */
  expressUploadMiddleware() {
    return async (req: Request, res: Response, next: Function) => {
      try {
        // Simular recebimento de arquivo (normalmente viria do multer ou outro parser)
        const file = (req as any).file;
        const { documentType, clientId } = req.body;

        if (!file) {
          return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }

        // Processar com o módulo upload
        const metadata = await this.uploadModule.processUpload(
          file.buffer,
          file.originalname,
          documentType,
          clientId
        );

        // Transferir para container se necessário
        if (req.body.transferToContainer) {
          await this.uploadModule.transferToContainer(
            metadata.id,
            clientId,
            `/app/uploads/${metadata.safeFileName}`
          );
        }

        res.json({
          success: true,
          file: {
            id: metadata.id,
            originalName: metadata.originalName,
            size: metadata.size,
            documentType: metadata.documentType,
            status: metadata.status
          }
        });

      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Erro no upload'
        });
      }
    };
  }

  /**
   * Handler para upload resumível
   */
  async handleResumableUpload(req: Request, res: Response): Promise<void> {
    try {
      const { action } = req.params;
      const { fileName, fileSize, documentType, clientId, uploadId, chunkIndex } = req.body;

      switch (action) {
        case 'start':
          const sessionId = await this.uploadModule.startResumableUpload(
            fileName,
            fileSize,
            documentType,
            clientId
          );
          
          res.json({ sessionId });
          break;

        case 'upload':
          const chunk = (req as any).file?.buffer;
          if (!chunk) {
            return res.status(400).json({ error: 'Chunk não encontrado' });
          }

          const offset = chunkIndex * 1024 * 1024; // Assumindo chunks de 1MB
          await this.uploadModule.resumeUpload(uploadId, chunk, offset);
          
          const status = this.uploadModule.getUploadSessionStatus(uploadId);
          res.json(status);
          break;

        case 'pause':
          await this.uploadModule.pauseUpload(uploadId);
          res.json({ message: 'Upload pausado' });
          break;

        case 'cancel':
          await this.uploadModule.cancelUpload(uploadId);
          res.json({ message: 'Upload cancelado' });
          break;

        default:
          res.status(400).json({ error: 'Ação não reconhecida' });
      }

    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Erro no upload resumível'
      });
    }
  }

  /**
   * Handler para upload em lote
   */
  async handleBatchUpload(req: Request, res: Response): Promise<void> {
    try {
      const files = (req as any).files || [];
      const { clientId } = req.body;

      if (!files.length) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      // Preparar arquivos para processamento em lote
      const filesForBatch = files.map((file: any) => ({
        buffer: file.buffer,
        name: file.originalname,
        type: file.fieldname.replace('file_', '') // Assumindo fieldnames como 'file_legal', 'file_financial'
      }));

      // Processar lote
      const results = await this.uploadModule.processBatch(filesForBatch, clientId);

      res.json({
        success: true,
        files: results.map(metadata => ({
          id: metadata.id,
          originalName: metadata.originalName,
          size: metadata.size,
          documentType: metadata.documentType,
          status: metadata.status
        }))
      });

    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Erro no upload em lote'
      });
    }
  }

  /**
   * Handler para listagem de arquivos
   */
  async handleListFiles(req: Request, res: Response): Promise<void> {
    try {
      const { clientId } = req.params;
      const { documentType } = req.query;

      const files = await this.uploadModule.listFiles(
        clientId,
        documentType as any
      );

      res.json({ files });

    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Erro ao listar arquivos'
      });
    }
  }

  /**
   * Handler para estatísticas
   */
  async handleGetStats(req: Request, res: Response): Promise<void> {
    try {
      const { clientId } = req.params;

      let stats;
      if (clientId) {
        stats = await this.uploadModule.getStatsForClient(clientId);
      } else {
        stats = await this.uploadModule.getStats();
      }

      res.json({ stats });

    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Erro ao obter estatísticas'
      });
    }
  }

  /**
   * Handler para download de arquivo
   */
  async handleDownloadFile(req: Request, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;

      // Obter metadados
      const metadata = await this.uploadModule.getFileMetadata(fileId);
      if (!metadata) {
        return res.status(404).json({ error: 'Arquivo não encontrado' });
      }

      // Ler arquivo
      const fileBuffer = await this.uploadModule.readFile(fileId);

      // Configurar headers para download
      res.setHeader('Content-Disposition', `attachment; filename="${metadata.originalName}"`);
      res.setHeader('Content-Type', metadata.mimeType);
      res.setHeader('Content-Length', fileBuffer.length);

      res.send(fileBuffer);

    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Erro no download'
      });
    }
  }

  /**
   * Integração com container manager existente
   */
  private async transferToDockerContainer(
    containerId: string,
    containerPath: string,
    fileBuffer: Buffer
  ): Promise<void> {
    // Esta função seria implementada para integrar com o Docker container manager existente
    // Exemplo usando a API do Docker:
    
    /*
    const Docker = require('dockerode');
    const docker = new Docker();
    
    const container = docker.getContainer(containerId);
    
    // Criar um tar stream com o arquivo
    const tar = require('tar-stream');
    const pack = tar.pack();
    
    pack.entry({ name: path.basename(containerPath) }, fileBuffer);
    pack.finalize();
    
    // Enviar para o container
    await container.putArchive(pack, {
      path: path.dirname(containerPath)
    });
    */
    
    console.log(`Transferindo arquivo para container ${containerId}:${containerPath}`);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.uploadModule.destroy();
  }
}

// Exemplo de como configurar rotas Express
export function setupUploadRoutes(app: any): UploadIntegration {
  const uploadIntegration = new UploadIntegration();

  // Upload único
  app.post('/api/client/:clientId/upload', 
    uploadIntegration.expressUploadMiddleware()
  );

  // Upload resumível
  app.post('/api/client/:clientId/resumable/:action',
    uploadIntegration.handleResumableUpload.bind(uploadIntegration)
  );

  // Upload em lote
  app.post('/api/client/:clientId/batch-upload',
    uploadIntegration.handleBatchUpload.bind(uploadIntegration)
  );

  // Listagem de arquivos
  app.get('/api/client/:clientId/files',
    uploadIntegration.handleListFiles.bind(uploadIntegration)
  );

  // Download de arquivo
  app.get('/api/files/:fileId/download',
    uploadIntegration.handleDownloadFile.bind(uploadIntegration)
  );

  // Estatísticas
  app.get('/api/stats/:clientId?',
    uploadIntegration.handleGetStats.bind(uploadIntegration)
  );

  return uploadIntegration;
}

// Exemplo de integração direta (sem Express)
export class DirectUploadIntegration {
  private uploadModule: ReturnType<typeof initializeUploadModule>;

  constructor() {
    this.uploadModule = initializeUploadModule();
  }

  /**
   * Processar upload direto de buffer
   */
  async processDirectUpload(
    fileBuffer: Buffer,
    fileName: string,
    documentType: string,
    clientId: string
  ) {
    try {
      const metadata = await this.uploadModule.processUpload(
        fileBuffer,
        fileName,
        documentType as any,
        clientId
      );

      return {
        success: true,
        fileId: metadata.id,
        metadata
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validar arquivo sem fazer upload
   */
  async validateOnly(
    fileBuffer: Buffer,
    fileName: string,
    documentType: string
  ) {
    try {
      const validation = await this.uploadModule.validateFile(
        fileBuffer,
        fileName,
        documentType as any
      );

      return validation;

    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: []
      };
    }
  }

  destroy(): void {
    this.uploadModule.destroy();
  }
}

// Exemplo de migração do código antigo
export class MigrationHelper {
  private uploadModule: ReturnType<typeof initializeUploadModule>;

  constructor() {
    this.uploadModule = initializeUploadModule();
  }

  /**
   * Converter do formato antigo (file-manager.js) para o novo
   */
  async migrateFromOldFileManager(
    fileBuffer: Buffer,
    originalName: string,
    documentType: string,
    clientId: string
  ) {
    // No código antigo:
    // const result = await fileManager.processUpload(fileBuffer, originalName, documentType, clientId);

    // No novo módulo:
    const metadata = await this.uploadModule.processUpload(
      fileBuffer,
      originalName,
      documentType as any,
      clientId
    );

    // Converter para formato compatível com código antigo
    return {
      success: true,
      file: {
        id: metadata.id,
        originalName: metadata.originalName,
        safeFileName: metadata.safeFileName,
        documentType: metadata.documentType,
        clientId: metadata.clientId,
        size: metadata.size,
        hash: metadata.hash,
        uploadedAt: metadata.uploadedAt.getTime(),
        mimeType: metadata.mimeType,
        status: metadata.status
      },
      buffer: await this.uploadModule.readFile(metadata.id)
    };
  }

  destroy(): void {
    this.uploadModule.destroy();
  }
}

export {
  UploadIntegration,
  DirectUploadIntegration,
  MigrationHelper
};