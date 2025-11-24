/**
 * File Manager
 * Responsabilidade única: Gerenciar upload, validação e armazenamento de arquivos
 * Extraído do orchestrator.js para simplificar arquitetura
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

class FileManager {
  constructor() {
    this.config = this.loadConfig();
    this.upload = this.setupMulter();
    this.stats = {
      totalUploads: 0,
      totalSize: 0,
      uploadsByType: {},
      failures: 0
    };
  }

  loadConfig() {
    return {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      allowedTypes: {
        'pitch-deck': {
          extensions: ['.pdf', '.ppt', '.pptx'],
          maxSize: 50 * 1024 * 1024,
          mimeTypes: [
            'application/pdf',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation'
          ]
        },
        'financial': {
          extensions: ['.pdf', '.xls', '.xlsx', '.csv'],
          maxSize: 25 * 1024 * 1024,
          mimeTypes: [
            'application/pdf',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv'
          ]
        },
        'legal': {
          extensions: ['.pdf', '.doc', '.docx'],
          maxSize: 20 * 1024 * 1024,
          mimeTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          ]
        },
        'technical': {
          extensions: ['.pdf', '.md', '.doc', '.docx'],
          maxSize: 30 * 1024 * 1024,
          mimeTypes: [
            'application/pdf',
            'text/markdown',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          ]
        }
      },
      
      uploadPath: '/tmp/cryptalk-uploads',
      cleanupInterval: 60 * 60 * 1000, // 1 hora
      maxAge: 2 * 60 * 60 * 1000 // 2 horas
    };
  }

  /**
   * Configurar Multer para upload
   */
  setupMulter() {
    return multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: this.config.maxFileSize,
        files: 1
      },
      fileFilter: (req, file, cb) => {
        this.validateFile(file, req.body.documentType)
          .then(() => cb(null, true))
          .catch(error => cb(error, false));
      }
    });
  }

  /**
   * Validar arquivo antes do upload
   */
  async validateFile(file, documentType) {
    if (!documentType || !this.config.allowedTypes[documentType]) {
      throw new Error(`Tipo de documento não suportado: ${documentType}`);
    }

    const typeConfig = this.config.allowedTypes[documentType];
    const fileExt = path.extname(file.originalname).toLowerCase();

    // Validar extensão
    if (!typeConfig.extensions.includes(fileExt)) {
      throw new Error(
        `Extensão não permitida para ${documentType}. ` +
        `Permitidas: ${typeConfig.extensions.join(', ')}`
      );
    }

    // Validar MIME type
    if (!typeConfig.mimeTypes.includes(file.mimetype)) {
      throw new Error(
        `Tipo de arquivo não permitido: ${file.mimetype}. ` +
        `Esperado: ${typeConfig.extensions.join(', ')}`
      );
    }

    // Validar tamanho
    if (file.size > typeConfig.maxSize) {
      const maxSizeMB = Math.round(typeConfig.maxSize / (1024 * 1024));
      throw new Error(
        `Arquivo muito grande. Máximo permitido para ${documentType}: ${maxSizeMB}MB`
      );
    }

    return true;
  }

  /**
   * Processar upload de arquivo
   */
  async processUpload(fileBuffer, originalName, documentType, clientId) {
    try {
      console.log(`📁 Processando upload: ${originalName} (${documentType}) para cliente ${clientId}`);

      // Validar dados
      if (!fileBuffer || !originalName || !documentType || !clientId) {
        throw new Error('Dados de upload incompletos');
      }

      // Gerar hash único para o arquivo
      const fileHash = crypto.createHash('sha256')
        .update(fileBuffer)
        .digest('hex')
        .substring(0, 16);

      // Gerar nome seguro
      const safeFileName = this.generateSafeFileName(originalName, fileHash);
      
      // Metadados do arquivo
      const fileMetadata = {
        id: `${clientId}-${fileHash}`,
        originalName,
        safeFileName,
        documentType,
        clientId,
        size: fileBuffer.length,
        hash: fileHash,
        uploadedAt: Date.now(),
        mimeType: this.detectMimeType(originalName),
        status: 'uploaded'
      };

      // Validar arquivo baseado no tipo
      await this.validateFileByType(fileBuffer, documentType, fileMetadata);

      // Atualizar estatísticas
      this.updateStats(documentType, fileBuffer.length);

      console.log(`✅ Upload processado: ${safeFileName}`);

      return {
        success: true,
        file: fileMetadata,
        buffer: fileBuffer
      };

    } catch (error) {
      this.stats.failures++;
      console.error(`❌ Erro processando upload:`, error);
      throw error;
    }
  }

  /**
   * Gerar nome seguro para arquivo
   */
  generateSafeFileName(originalName, hash) {
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext)
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .substring(0, 50);
    
    return `${baseName}_${hash}${ext}`;
  }

  /**
   * Detectar MIME type baseado na extensão
   */
  detectMimeType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes = {
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
    
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Validação específica por tipo de documento
   */
  async validateFileByType(fileBuffer, documentType, metadata) {
    switch (documentType) {
      case 'pitch-deck':
        return this.validatePitchDeck(fileBuffer, metadata);
      case 'financial':
        return this.validateFinancialDoc(fileBuffer, metadata);
      case 'legal':
        return this.validateLegalDoc(fileBuffer, metadata);
      case 'technical':
        return this.validateTechnicalDoc(fileBuffer, metadata);
      default:
        return this.validateGenericDocument(fileBuffer, metadata);
    }
  }

  /**
   * Validar pitch deck
   */
  async validatePitchDeck(fileBuffer, metadata) {
    // Validações específicas para pitch deck
    if (metadata.size < 50 * 1024) { // Menor que 50KB
      throw new Error('Pitch deck muito pequeno. Arquivo pode estar corrompido.');
    }

    // Verificar se é realmente um arquivo válido (magic numbers)
    if (metadata.mimeType === 'application/pdf') {
      if (!fileBuffer.toString('hex', 0, 4).toLowerCase().startsWith('25504446')) {
        throw new Error('Arquivo PDF corrompido ou inválido');
      }
    }

    return true;
  }

  /**
   * Validar documento financeiro
   */
  async validateFinancialDoc(fileBuffer, metadata) {
    // Validações específicas para documentos financeiros
    if (metadata.size < 10 * 1024) {
      throw new Error('Documento financeiro muito pequeno.');
    }

    return true;
  }

  /**
   * Validar documento legal
   */
  async validateLegalDoc(fileBuffer, metadata) {
    // Validações específicas para documentos legais
    if (metadata.size < 10 * 1024) {
      throw new Error('Documento legal muito pequeno.');
    }

    return true;
  }

  /**
   * Validar documento técnico
   */
  async validateTechnicalDoc(fileBuffer, metadata) {
    // Validações específicas para documentos técnicos
    if (metadata.size < 5 * 1024) {
      throw new Error('Documento técnico muito pequeno.');
    }

    return true;
  }

  /**
   * Validar documento genérico
   */
  async validateGenericDocument(fileBuffer, metadata) {
    // Validações básicas para qualquer documento
    if (metadata.size < 1024) {
      throw new Error('Arquivo muito pequeno (< 1KB).');
    }

    if (metadata.size > this.config.maxFileSize) {
      throw new Error('Arquivo muito grande.');
    }

    return true;
  }

  /**
   * Obter middleware do multer
   */
  getUploadMiddleware() {
    return this.upload.single('file');
  }

  /**
   * Obter configuração de tipos permitidos
   */
  getAllowedTypes() {
    const types = {};
    
    for (const [type, config] of Object.entries(this.config.allowedTypes)) {
      types[type] = {
        extensions: config.extensions,
        maxSize: Math.round(config.maxSize / (1024 * 1024)), // Em MB
        description: this.getTypeDescription(type)
      };
    }
    
    return types;
  }

  /**
   * Obter descrição do tipo de documento
   */
  getTypeDescription(type) {
    const descriptions = {
      'pitch-deck': 'Apresentação de negócio (PDF, PPT, PPTX)',
      'financial': 'Documento financeiro (PDF, XLS, XLSX, CSV)',
      'legal': 'Documento legal (PDF, DOC, DOCX)',
      'technical': 'Documento técnico (PDF, MD, DOC, DOCX)'
    };
    
    return descriptions[type] || 'Documento genérico';
  }

  /**
   * Atualizar estatísticas
   */
  updateStats(documentType, fileSize) {
    this.stats.totalUploads++;
    this.stats.totalSize += fileSize;
    
    if (!this.stats.uploadsByType[documentType]) {
      this.stats.uploadsByType[documentType] = 0;
    }
    this.stats.uploadsByType[documentType]++;
  }

  /**
   * Obter estatísticas
   */
  getStats() {
    return {
      ...this.stats,
      averageSize: this.stats.totalUploads > 0 ? 
        Math.round(this.stats.totalSize / this.stats.totalUploads) : 0,
      totalSizeMB: Math.round(this.stats.totalSize / (1024 * 1024))
    };
  }

  /**
   * Obter status do File Manager
   */
  getStatus() {
    return {
      allowedTypes: Object.keys(this.config.allowedTypes),
      maxFileSize: Math.round(this.config.maxFileSize / (1024 * 1024)), // MB
      stats: this.getStats(),
      config: {
        uploadPath: this.config.uploadPath,
        maxAge: this.config.maxAge
      }
    };
  }
}

module.exports = FileManager;