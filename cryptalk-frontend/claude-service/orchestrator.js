const express = require('express');
const multer = require('multer');
const Docker = require('dockerode');
const winston = require('winston');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('rate-limiter-flexible');
const { body, validationResult } = require('express-validator');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const archiver = require('archiver');
const yauzl = require('yauzl');
const sharp = require('sharp');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const cron = require('node-cron');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

class ClaudeCodeOrchestrator {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });
    
    this.docker = new Docker();
    this.userContainers = new Map();
    this.processingJobs = new Map();
    
    this.initializeLogger();
    this.initializeMiddleware();
    this.initializeRateLimiting();
    this.initializeStorage();
    this.initializeRoutes();
    this.initializeWebSocket();
    this.initializeCleanupTasks();
  }

  initializeLogger() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
  }

  initializeMiddleware() {
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));
    
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  }

  initializeRateLimiting() {
    const rateLimiter = new rateLimit.RateLimiterMemory({
      keyPrefix: 'middleware',
      points: 10, // Número de requests
      duration: 60, // Por minuto
    });

    this.app.use(async (req, res, next) => {
      try {
        await rateLimiter.consume(req.ip);
        next();
      } catch (rejRes) {
        res.status(429).json({ error: 'Rate limit exceeded' });
      }
    });
  }

  initializeStorage() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads', 'pending');
        fs.ensureDirSync(uploadDir);
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}-${file.originalname}`;
        cb(null, uniqueName);
      }
    });

    this.upload = multer({
      storage,
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
        files: 10
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'text/csv',
          'application/json',
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/zip',
          'application/x-zip-compressed'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Tipo de arquivo não permitido'), false);
        }
      }
    });
  }

  initializeRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        containers: this.userContainers.size,
        jobs: this.processingJobs.size
      });
    });

    // Upload de documentos
    this.app.post('/upload', 
      this.upload.array('documents', 10),
      [
        body('userId').isString().notEmpty(),
        body('projectId').isString().notEmpty()
      ],
      async (req, res) => {
        try {
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
          }

          const { userId, projectId } = req.body;
          const files = req.files;

          if (!files || files.length === 0) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
          }

          const jobId = uuidv4();
          const job = {
            id: jobId,
            userId,
            projectId,
            files: files.map(f => ({
              original: f.originalname,
              path: f.path,
              size: f.size,
              mimetype: f.mimetype
            })),
            status: 'pending',
            createdAt: new Date(),
            progress: 0
          };

          this.processingJobs.set(jobId, job);

          // Processar assincronamente
          this.processDocuments(jobId).catch(err => {
            this.logger.error('Erro no processamento:', err);
            job.status = 'failed';
            job.error = err.message;
          });

          res.json({
            jobId,
            message: 'Upload realizado com sucesso',
            filesCount: files.length
          });

        } catch (error) {
          this.logger.error('Erro no upload:', error);
          res.status(500).json({ error: 'Erro interno do servidor' });
        }
      }
    );

    // Status do job
    this.app.get('/job/:jobId/status', async (req, res) => {
      try {
        const { jobId } = req.params;
        const job = this.processingJobs.get(jobId);
        
        if (!job) {
          return res.status(404).json({ error: 'Job não encontrado' });
        }

        res.json({
          id: job.id,
          status: job.status,
          progress: job.progress,
          createdAt: job.createdAt,
          completedAt: job.completedAt,
          error: job.error,
          results: job.results
        });

      } catch (error) {
        this.logger.error('Erro ao buscar status:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    });

    // Processar com Claude
    this.app.post('/process',
      [
        body('jobId').isString().notEmpty(),
        body('prompt').isString().notEmpty(),
        body('userId').isString().notEmpty()
      ],
      async (req, res) => {
        try {
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
          }

          const { jobId, prompt, userId } = req.body;
          const job = this.processingJobs.get(jobId);

          if (!job) {
            return res.status(404).json({ error: 'Job não encontrado' });
          }

          if (job.status !== 'completed') {
            return res.status(400).json({ error: 'Job ainda não foi processado' });
          }

          const result = await this.processWithClaude(userId, job.results, prompt);

          res.json({
            result,
            timestamp: new Date().toISOString()
          });

        } catch (error) {
          this.logger.error('Erro no processamento Claude:', error);
          res.status(500).json({ error: 'Erro interno do servidor' });
        }
      }
    );

    // Listar jobs do usuário
    this.app.get('/jobs/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        const userJobs = Array.from(this.processingJobs.values())
          .filter(job => job.userId === userId)
          .map(job => ({
            id: job.id,
            projectId: job.projectId,
            status: job.status,
            progress: job.progress,
            createdAt: job.createdAt,
            completedAt: job.completedAt,
            filesCount: job.files.length
          }));

        res.json(userJobs);

      } catch (error) {
        this.logger.error('Erro ao listar jobs:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    });
  }

  initializeWebSocket() {
    this.io.on('connection', (socket) => {
      this.logger.info('Cliente conectado:', socket.id);

      socket.on('subscribe', (data) => {
        const { jobId } = data;
        socket.join(`job-${jobId}`);
        this.logger.info(`Cliente ${socket.id} inscrito no job ${jobId}`);
      });

      socket.on('disconnect', () => {
        this.logger.info('Cliente desconectado:', socket.id);
      });
    });
  }

  async processDocuments(jobId) {
    const job = this.processingJobs.get(jobId);
    if (!job) return;

    try {
      job.status = 'processing';
      job.progress = 0;
      this.emitJobUpdate(jobId, job);

      const results = [];
      const totalFiles = job.files.length;

      for (let i = 0; i < totalFiles; i++) {
        const file = job.files[i];
        this.logger.info(`Processando arquivo ${i + 1}/${totalFiles}: ${file.original}`);

        const content = await this.extractContent(file);
        results.push({
          filename: file.original,
          content,
          size: file.size,
          type: file.mimetype
        });

        job.progress = Math.round(((i + 1) / totalFiles) * 100);
        this.emitJobUpdate(jobId, job);

        // Mover arquivo para pasta de processados
        const processedDir = path.join(__dirname, 'uploads', 'completed');
        fs.ensureDirSync(processedDir);
        const newPath = path.join(processedDir, path.basename(file.path));
        await fs.move(file.path, newPath);
      }

      job.status = 'completed';
      job.completedAt = new Date();
      job.results = results;
      this.emitJobUpdate(jobId, job);

      this.logger.info(`Job ${jobId} concluído com sucesso`);

    } catch (error) {
      this.logger.error(`Erro no processamento do job ${jobId}:`, error);
      job.status = 'failed';
      job.error = error.message;
      this.emitJobUpdate(jobId, job);

      // Mover arquivos para pasta de falhas
      const failedDir = path.join(__dirname, 'uploads', 'failed');
      fs.ensureDirSync(failedDir);
      
      for (const file of job.files) {
        if (fs.existsSync(file.path)) {
          const newPath = path.join(failedDir, path.basename(file.path));
          await fs.move(file.path, newPath);
        }
      }
    }
  }

  async extractContent(file) {
    const filePath = file.path;
    const mimetype = file.mimetype;

    try {
      switch (mimetype) {
        case 'text/plain':
          return await fs.readFile(filePath, 'utf8');

        case 'application/pdf':
          const pdfBuffer = await fs.readFile(filePath);
          const pdfData = await pdfParse(pdfBuffer);
          return pdfData.text;

        case 'application/msword':
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          const docBuffer = await fs.readFile(filePath);
          const docResult = await mammoth.extractRawText({ buffer: docBuffer });
          return docResult.value;

        case 'image/jpeg':
        case 'image/png':
        case 'image/gif':
          // Para imagens, retornamos metadados
          const imageBuffer = await fs.readFile(filePath);
          const metadata = await sharp(imageBuffer).metadata();
          return `Imagem: ${metadata.width}x${metadata.height}, formato: ${metadata.format}`;

        case 'application/json':
          const jsonContent = await fs.readFile(filePath, 'utf8');
          return JSON.stringify(JSON.parse(jsonContent), null, 2);

        case 'text/csv':
          return await fs.readFile(filePath, 'utf8');

        case 'application/zip':
        case 'application/x-zip-compressed':
          return await this.extractZipContents(filePath);

        default:
          return `Arquivo de tipo ${mimetype} não suportado para extração de conteúdo`;
      }
    } catch (error) {
      this.logger.error(`Erro ao extrair conteúdo de ${file.original}:`, error);
      return `Erro ao extrair conteúdo: ${error.message}`;
    }
  }

  async extractZipContents(zipPath) {
    return new Promise((resolve, reject) => {
      const contents = [];
      
      yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
        if (err) return reject(err);

        zipfile.readEntry();
        zipfile.on('entry', (entry) => {
          if (/\/$/.test(entry.fileName)) {
            // Diretório
            zipfile.readEntry();
          } else {
            // Arquivo
            contents.push(`Arquivo: ${entry.fileName} (${entry.uncompressedSize} bytes)`);
            zipfile.readEntry();
          }
        });

        zipfile.on('end', () => {
          resolve(contents.join('\n'));
        });
      });
    });
  }

  async processWithClaude(userId, documentResults, prompt) {
    try {
      // Criar container isolado para o usuário
      const container = await this.getOrCreateUserContainer(userId);
      
      // Preparar contexto dos documentos
      const context = documentResults.map(doc => ({
        filename: doc.filename,
        content: doc.content.substring(0, 10000), // Limitar tamanho
        type: doc.type
      }));

      // Simular processamento com Claude
      // Em produção, aqui seria feita a chamada para a API do Claude
      const result = {
        analysis: `Análise baseada no prompt: "${prompt}"`,
        documents: context.length,
        summary: this.generateSummary(context),
        recommendations: this.generateRecommendations(context, prompt),
        timestamp: new Date().toISOString()
      };

      return result;

    } catch (error) {
      this.logger.error('Erro no processamento Claude:', error);
      throw error;
    }
  }

  generateSummary(documents) {
    const totalChars = documents.reduce((sum, doc) => sum + doc.content.length, 0);
    const fileTypes = [...new Set(documents.map(doc => doc.type))];
    
    return `Processados ${documents.length} documentos (${totalChars} caracteres total). Tipos: ${fileTypes.join(', ')}`;
  }

  generateRecommendations(documents, prompt) {
    return [
      'Revisar a estrutura dos documentos',
      'Considerar consolidar informações similares',
      'Verificar consistência entre documentos',
      `Análise focada em: ${prompt.substring(0, 100)}...`
    ];
  }

  async getOrCreateUserContainer(userId) {
    if (this.userContainers.has(userId)) {
      return this.userContainers.get(userId);
    }

    try {
      const container = await this.docker.createContainer({
        Image: 'alpine:latest',
        name: `claude-user-${userId}`,
        Cmd: ['sleep', '3600'],
        WorkingDir: '/workspace',
        HostConfig: {
          Memory: 512 * 1024 * 1024, // 512MB
          CpuQuota: 50000, // 50% CPU
          NetworkMode: 'none', // Sem acesso à rede
          ReadonlyRootfs: true,
          Tmpfs: {
            '/tmp': 'rw,size=100m',
            '/workspace': 'rw,size=100m'
          }
        }
      });

      await container.start();
      this.userContainers.set(userId, container);
      
      // Agendar limpeza após 1 hora
      setTimeout(() => {
        this.cleanupUserContainer(userId);
      }, 3600000);

      return container;

    } catch (error) {
      this.logger.error(`Erro ao criar container para usuário ${userId}:`, error);
      throw error;
    }
  }

  async cleanupUserContainer(userId) {
    const container = this.userContainers.get(userId);
    if (container) {
      try {
        await container.stop();
        await container.remove();
        this.userContainers.delete(userId);
        this.logger.info(`Container do usuário ${userId} removido`);
      } catch (error) {
        this.logger.error(`Erro ao remover container do usuário ${userId}:`, error);
      }
    }
  }

  emitJobUpdate(jobId, job) {
    this.io.to(`job-${jobId}`).emit('jobUpdate', {
      id: job.id,
      status: job.status,
      progress: job.progress,
      completedAt: job.completedAt,
      error: job.error
    });
  }

  initializeCleanupTasks() {
    // Limpeza a cada hora
    cron.schedule('0 * * * *', () => {
      this.cleanupOldJobs();
      this.cleanupOldFiles();
    });

    // Limpeza de containers órfãos a cada 6 horas
    cron.schedule('0 */6 * * *', () => {
      this.cleanupOrphanedContainers();
    });
  }

  cleanupOldJobs() {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas

    for (const [jobId, job] of this.processingJobs.entries()) {
      if (now - job.createdAt > maxAge) {
        this.processingJobs.delete(jobId);
        this.logger.info(`Job antigo removido: ${jobId}`);
      }
    }
  }

  async cleanupOldFiles() {
    const directories = ['completed', 'failed'];
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 dias

    for (const dir of directories) {
      const dirPath = path.join(__dirname, 'uploads', dir);
      if (fs.existsSync(dirPath)) {
        const files = await fs.readdir(dirPath);
        
        for (const file of files) {
          const filePath = path.join(dirPath, file);
          const stats = await fs.stat(filePath);
          
          if (Date.now() - stats.mtime.getTime() > maxAge) {
            await fs.remove(filePath);
            this.logger.info(`Arquivo antigo removido: ${filePath}`);
          }
        }
      }
    }
  }

  async cleanupOrphanedContainers() {
    try {
      const containers = await this.docker.listContainers({
        all: true,
        filters: { name: ['claude-user-'] }
      });

      for (const containerInfo of containers) {
        const container = this.docker.getContainer(containerInfo.Id);
        
        if (containerInfo.State === 'exited' || containerInfo.State === 'dead') {
          await container.remove();
          this.logger.info(`Container órfão removido: ${containerInfo.Names[0]}`);
        }
      }
    } catch (error) {
      this.logger.error('Erro na limpeza de containers:', error);
    }
  }

  async start() {
    const PORT = process.env.PORT || 3000;
    
    this.server.listen(PORT, () => {
      this.logger.info(`Claude Code Orchestrator iniciado na porta ${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      this.logger.info('Recebido SIGTERM, iniciando shutdown...');
      this.shutdown();
    });

    process.on('SIGINT', () => {
      this.logger.info('Recebido SIGINT, iniciando shutdown...');
      this.shutdown();
    });
  }

  async shutdown() {
    this.logger.info('Iniciando shutdown graceful...');
    
    // Fechar servidor
    this.server.close();
    
    // Limpar containers
    for (const [userId, container] of this.userContainers.entries()) {
      await this.cleanupUserContainer(userId);
    }
    
    this.logger.info('Shutdown concluído');
    process.exit(0);
  }
}

// Inicializar o orchestrador
const orchestrator = new ClaudeCodeOrchestrator();
orchestrator.start().catch(error => {
  console.error('Erro ao iniciar o orchestrator:', error);
  process.exit(1);
});

module.exports = ClaudeCodeOrchestrator;