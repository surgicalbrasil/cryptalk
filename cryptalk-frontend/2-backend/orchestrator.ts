/**
 * CrypTalk - Orchestrator Modular
 * Versão completamente refatorada usando arquitetura modular
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

// Core Modules
import { bootstrapCore, AppConfig } from './core';
import { Container } from './core/di/Container';
import { ConfigService } from './core/config/ConfigService';

// Modular Services
import { createDockerService } from './modules/docker';
import { createClaudeService } from './modules/claude';
import { createFileService } from './modules/upload';
import { createWebSocketModule } from './modules/websocket';

// Types
import { 
  IDockerService, 
  IClaudeService, 
  IFileService, 
  IWebSocketService 
} from './core/interfaces';

export class ModularOrchestrator {
  private app: express.Application;
  private container: Container;
  private config: AppConfig;
  private configService: ConfigService;
  
  // Services
  private dockerService!: IDockerService;
  private claudeService!: IClaudeService;
  private fileService!: IFileService;
  private wsModule!: any;

  constructor() {
    this.app = express();
  }

  /**
   * Inicialização completa do sistema
   */
  public async initialize(configPath?: string): Promise<void> {
    console.log('🚀 Inicializando CrypTalk Modular Orchestrator...');

    try {
      // 1. Bootstrap Core (Config + DI Container)
      const core = await bootstrapCore(configPath);
      this.container = core.container;
      this.config = core.config;
      this.configService = core.configService;

      // 2. Registrar serviços modulares no container
      await this.registerServices();

      // 3. Configurar Express
      this.setupExpress();

      // 4. Inicializar todos os serviços
      await this.container.initializeAll();

      // 5. Configurar rotas da API
      this.setupRoutes();

      // 6. Configurar handlers de eventos inter-módulos
      this.setupEventHandlers();

      console.log('✅ Orchestrator modular inicializado com sucesso');
    } catch (error) {
      console.error('❌ Erro na inicialização:', error);
      throw error;
    }
  }

  /**
   * Registra todos os serviços modulares no DI container
   */
  private async registerServices(): Promise<void> {
    console.log('📋 Registrando serviços modulares...');

    // Docker Service
    this.container.register({
      name: 'docker',
      type: 'docker',
      lifecycle: 'singleton',
      dependencies: ['config'],
      factory: (container) => {
        const config = container.resolve('config');
        return createDockerService(config.getModuleConfig('docker'));
      }
    });

    // Claude Service
    this.container.register({
      name: 'claude',
      type: 'claude',
      lifecycle: 'singleton',
      dependencies: ['config'],
      factory: (container) => {
        const config = container.resolve('config');
        return createClaudeService(config.getModuleConfig('claude'));
      }
    });

    // File Service
    this.container.register({
      name: 'upload',
      type: 'upload',
      lifecycle: 'singleton',
      dependencies: ['config'],
      factory: (container) => {
        const config = container.resolve('config');
        return createFileService(config.getModuleConfig('upload'));
      }
    });

    // WebSocket Module
    this.container.register({
      name: 'websocket',
      type: 'websocket',
      lifecycle: 'singleton',
      dependencies: ['config'],
      factory: (container) => {
        const config = container.resolve('config');
        return createWebSocketModule(config.getModuleConfig('websocket'));
      }
    });

    console.log('✅ Todos os serviços registrados no container');
  }

  /**
   * Configuração do Express com middlewares
   */
  private setupExpress(): void {
    console.log('⚙️ Configurando Express middlewares...');

    // Security & Performance
    this.app.use(helmet());
    this.app.use(compression());
    this.app.use(cors(this.config.security.cors));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting global
    if (this.config.security.rateLimit.enabled) {
      const limiter = rateLimit({
        windowMs: this.config.security.rateLimit.windowMs,
        max: this.config.security.rateLimit.max,
        message: { error: 'Muitas solicitações. Tente novamente mais tarde.' },
        standardHeaders: true,
        legacyHeaders: false,
      });
      this.app.use('/api/', limiter);
    }

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
      next();
    });
  }

  /**
   * Configuração das rotas da API
   */
  private setupRoutes(): void {
    console.log('🛣️ Configurando rotas da API...');

    // Health check
    this.app.get('/api/health', async (req, res) => {
      const health = await this.container.healthCheck();
      const metrics = this.container.getMetrics();
      
      res.status(health.healthy ? 200 : 503).json({
        healthy: health.healthy,
        services: health.services,
        metrics,
        timestamp: new Date().toISOString()
      });
    });

    // Upload route
    this.app.post('/api/upload', async (req, res) => {
      try {
        // Implementação será feita via eventos entre módulos
        res.json({ message: 'Upload endpoint configurado' });
      } catch (error) {
        res.status(500).json({ error: 'Erro no upload' });
      }
    });

    // Análise route
    this.app.post('/api/analyze', async (req, res) => {
      try {
        // Implementação será feita via eventos entre módulos
        res.json({ message: 'Análise endpoint configurado' });
      } catch (error) {
        res.status(500).json({ error: 'Erro na análise' });
      }
    });

    // Container routes
    this.app.post('/api/container/:clientId', async (req, res) => {
      try {
        // Implementação será feita via eventos entre módulos
        res.json({ message: 'Container endpoint configurado' });
      } catch (error) {
        res.status(500).json({ error: 'Erro no container' });
      }
    });

    // Status route
    this.app.get('/api/status', async (req, res) => {
      const services = this.container.listServices();
      const envInfo = this.configService.getEnvironmentInfo();
      
      res.json({
        services,
        environment: envInfo,
        config: {
          app: this.config.app,
          security: {
            rateLimit: this.config.security.rateLimit.enabled,
            cors: this.config.security.cors.origin.length > 0
          }
        }
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({ 
        error: 'Endpoint não encontrado',
        availableEndpoints: [
          '/api/health',
          '/api/upload', 
          '/api/analyze',
          '/api/container/:clientId',
          '/api/status'
        ]
      });
    });

    // Error handler
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('❌ Erro na API:', err);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: err.message,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Configuração de eventos entre módulos
   */
  private async setupEventHandlers(): Promise<void> {
    console.log('📡 Configurando eventos inter-módulos...');

    // Resolver serviços
    this.dockerService = await this.container.resolve('docker');
    this.claudeService = await this.container.resolve('claude');
    this.fileService = await this.container.resolve('upload');
    this.wsModule = await this.container.resolve('websocket');

    // Eventos Docker → WebSocket
    this.dockerService.on('container-created', (data) => {
      this.wsModule.eventBus.publish('docker:container-created', data);
    });

    this.dockerService.on('container-destroyed', (data) => {
      this.wsModule.eventBus.publish('docker:container-destroyed', data);
    });

    // Eventos Claude → WebSocket
    this.claudeService.on('analysis_started', (data) => {
      this.wsModule.eventBus.publish('claude:analysis-started', data);
    });

    this.claudeService.on('analysis_progress', (data) => {
      this.wsModule.eventBus.publish('claude:analysis-progress', data);
    });

    this.claudeService.on('analysis_completed', (data) => {
      this.wsModule.eventBus.publish('claude:analysis-completed', data);
    });

    // Eventos Upload → WebSocket
    this.fileService.on('file_uploaded', (data) => {
      this.wsModule.eventBus.publish('upload:file-uploaded', data);
    });

    this.fileService.on('file_validated', (data) => {
      this.wsModule.eventBus.publish('upload:file-validated', data);
    });

    // WebSocket → Outros módulos (commands)
    this.wsModule.eventBus.subscribe('command:*', async (event: string, data: any) => {
      const [, command] = event.split(':');
      
      switch (command) {
        case 'create-container':
          await this.dockerService.createContainer(data.clientId, data.config);
          break;
        case 'analyze-document':
          await this.claudeService.analyzeDocument(data.request);
          break;
        case 'upload-file':
          await this.fileService.processUpload(data.buffer, data.name, data.type, data.clientId);
          break;
      }
    });

    console.log('✅ Eventos inter-módulos configurados');
  }

  /**
   * Inicia o servidor
   */
  public async start(): Promise<void> {
    try {
      // Inicializar todos os serviços
      await this.container.startAll();

      // Iniciar servidor HTTP
      const port = this.config.app.port;
      this.app.listen(port, () => {
        console.log(`🚀 CrypTalk Modular rodando na porta ${port}`);
        console.log(`🏥 Health check: http://localhost:${port}/api/health`);
        console.log(`📊 Status: http://localhost:${port}/api/status`);
        console.log(`🌐 WebSocket: ws://localhost:${this.config.websocket.port}`);
        console.log(`🎯 Ambiente: ${this.config.app.env}`);
      });

    } catch (error) {
      console.error('❌ Erro ao iniciar servidor:', error);
      throw error;
    }
  }

  /**
   * Parada graceful do sistema
   */
  public async stop(): Promise<void> {
    console.log('⏹️ Iniciando shutdown graceful...');
    
    try {
      await this.container.stopAll();
      console.log('✅ Shutdown completed gracefully');
    } catch (error) {
      console.error('❌ Erro durante shutdown:', error);
    }
  }

  /**
   * Obtém métricas do sistema
   */
  public async getMetrics() {
    return {
      container: this.container.getMetrics(),
      services: this.container.listServices(),
      health: await this.container.healthCheck(),
      environment: this.configService.getEnvironmentInfo()
    };
  }
}

/**
 * Factory function para criar orchestrator
 */
export function createOrchestrator(): ModularOrchestrator {
  return new ModularOrchestrator();
}

/**
 * Startup script se executado diretamente
 */
if (require.main === module) {
  async function main() {
    const orchestrator = createOrchestrator();
    
    // Graceful shutdown handlers
    process.on('SIGTERM', async () => {
      console.log('📥 SIGTERM recebido');
      await orchestrator.stop();
      process.exit(0);
    });
    
    process.on('SIGINT', async () => {
      console.log('📥 SIGINT recebido');
      await orchestrator.stop();
      process.exit(0);
    });

    try {
      await orchestrator.initialize();
      await orchestrator.start();
    } catch (error) {
      console.error('💥 Falha fatal na inicialização:', error);
      process.exit(1);
    }
  }

  main().catch(console.error);
}

export default ModularOrchestrator;