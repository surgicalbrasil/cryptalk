/**
 * API Gateway - CrypTalk
 * Orchestrator simplificado que coordena os serviços especializados
 * Responsabilidade: Roteamento e coordenação entre serviços
 */

const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const rateLimit = require('express-rate-limit');

// Serviços especializados
const ClaudeTerminalService = require('./claude-terminal-service');
const DockerManager = require('./docker-manager');
const FileManager = require('./file-manager');

class APIGateway {
  constructor() {
    this.app = express();
    this.server = null;
    this.wss = null;
    this.port = process.env.PORT || 3002;
    
    // Inicializar serviços
    this.claudeTerminal = new ClaudeTerminalService();
    this.dockerManager = new DockerManager();
    this.fileManager = new FileManager();
    
    // Clientes conectados via WebSocket
    this.connectedClients = new Map(); // clientId -> websocket
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  setupMiddleware() {
    // Rate Limiting
    const generalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 100, // 100 requests por IP
      message: 'Muitas solicitações'
    });

    const uploadLimiter = rateLimit({
      windowMs: 5 * 60 * 1000, // 5 minutos
      max: 10, // 10 uploads por IP
      message: 'Muitos uploads'
    });

    // Middleware básico
    this.app.use(express.json({ limit: '1mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(generalLimiter);

    // CORS
    this.app.use(cors({
      origin: this.getAllowedOrigins(),
      credentials: true
    }));

    // Logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      next();
    });

    // Upload rate limiting para rotas específicas
    this.app.use('/api/upload', uploadLimiter);
  }

  setupRoutes() {
    // Health Check
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'ok',
        services: {
          claude: this.claudeTerminal.getStatus(),
          docker: this.dockerManager.getStatus(),
          files: this.fileManager.getStatus()
        },
        timestamp: new Date().toISOString()
      });
    });

    // Upload de arquivos
    this.app.post('/api/upload', 
      this.fileManager.getUploadMiddleware(),
      this.handleUpload.bind(this)
    );

    // Análise de documentos
    this.app.post('/api/analyze', this.handleAnalyze.bind(this));

    // Chat conversacional
    this.app.post('/api/chat', this.handleChat.bind(this));

    // Gerenciamento de containers
    this.app.get('/api/containers/:clientId/status', this.handleContainerStatus.bind(this));
    this.app.delete('/api/containers/:clientId', this.handleContainerDestroy.bind(this));

    // Informações do sistema
    this.app.get('/api/info/types', (req, res) => {
      res.json(this.fileManager.getAllowedTypes());
    });

    this.app.get('/api/info/stats', (req, res) => {
      res.json({
        files: this.fileManager.getStats(),
        docker: this.dockerManager.getStatus(),
        claude: this.claudeTerminal.getStatus()
      });
    });

    // Fallback para rotas não encontradas
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint não encontrado',
        path: req.originalUrl
      });
    });
  }

  async handleUpload(req, res) {
    try {
      const { documentType, clientId } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      if (!clientId) {
        return res.status(400).json({ error: 'clientId é obrigatório' });
      }

      console.log(`📁 Upload recebido: ${file.originalname} (${documentType}) para ${clientId}`);

      // Processar arquivo com File Manager
      const uploadResult = await this.fileManager.processUpload(
        file.buffer,
        file.originalname,
        documentType,
        clientId
      );

      // Criar container para o cliente
      const containerInfo = await this.dockerManager.createClientContainer(clientId);

      // Copiar arquivo para container
      const containerPath = await this.dockerManager.copyFileToContainer(
        clientId,
        uploadResult.buffer,
        uploadResult.file.safeFileName
      );

      // Notificar via WebSocket
      this.notifyClient(clientId, {
        type: 'upload_completed',
        file: uploadResult.file,
        containerPath,
        containerId: containerInfo.id
      });

      res.json({
        success: true,
        file: uploadResult.file,
        containerPath,
        containerId: containerInfo.id,
        message: 'Arquivo carregado e container criado com sucesso'
      });

    } catch (error) {
      console.error('❌ Erro no upload:', error);
      res.status(500).json({
        error: 'Erro processando upload',
        details: error.message
      });
    }
  }

  async handleAnalyze(req, res) {
    try {
      const { clientId, documentType, filePath } = req.body;

      if (!clientId || !documentType) {
        return res.status(400).json({ error: 'clientId e documentType são obrigatórios' });
      }

      console.log(`🔍 Iniciando análise para cliente ${clientId}`);

      // Notificar início da análise
      this.notifyClient(clientId, {
        type: 'analysis_started',
        timestamp: Date.now()
      });

      // Iniciar análise com Claude Terminal
      const analysisResult = await this.claudeTerminal.startDocumentAnalysis(
        clientId,
        filePath || `/app/workspace`,
        documentType
      );

      // Notificar conclusão
      this.notifyClient(clientId, {
        type: 'analysis_completed',
        result: analysisResult.analysisResult
      });

      res.json({
        success: true,
        analysisId: analysisResult.conversationId,
        result: analysisResult.analysisResult
      });

    } catch (error) {
      console.error('❌ Erro na análise:', error);
      
      this.notifyClient(req.body.clientId, {
        type: 'analysis_error',
        error: error.message
      });

      res.status(500).json({
        error: 'Erro na análise',
        details: error.message
      });
    }
  }

  async handleChat(req, res) {
    try {
      const { clientId, message } = req.body;

      if (!clientId || !message) {
        return res.status(400).json({ error: 'clientId e message são obrigatórios' });
      }

      console.log(`💬 Chat para cliente ${clientId}: ${message.substring(0, 50)}...`);

      // Continuar conversa com Claude Terminal
      const chatResponse = await this.claudeTerminal.continueConversation(clientId, message);

      // Notificar via WebSocket
      this.notifyClient(clientId, {
        type: 'chat_response',
        message: message,
        response: chatResponse.response,
        timestamp: Date.now()
      });

      res.json({
        success: true,
        response: chatResponse.response,
        conversationId: chatResponse.conversationId
      });

    } catch (error) {
      console.error('❌ Erro no chat:', error);
      res.status(500).json({
        error: 'Erro no chat',
        details: error.message
      });
    }
  }

  async handleContainerStatus(req, res) {
    try {
      const { clientId } = req.params;
      const stats = await this.dockerManager.getContainerStats(clientId);
      
      res.json({
        success: true,
        clientId,
        stats
      });
    } catch (error) {
      res.status(404).json({
        error: 'Container não encontrado',
        clientId: req.params.clientId
      });
    }
  }

  async handleContainerDestroy(req, res) {
    try {
      const { clientId } = req.params;
      
      // Destruir container
      const destroyed = await this.dockerManager.destroyClientContainer(clientId);
      
      // Encerrar conversa Claude
      this.claudeTerminal.endConversation(clientId);
      
      // Notificar cliente
      this.notifyClient(clientId, {
        type: 'session_ended',
        timestamp: Date.now()
      });

      res.json({
        success: true,
        destroyed,
        message: 'Sessão encerrada'
      });

    } catch (error) {
      console.error('❌ Erro destruindo container:', error);
      res.status(500).json({
        error: 'Erro encerrando sessão',
        details: error.message
      });
    }
  }

  setupWebSocket() {
    this.wss = new WebSocket.Server({ noServer: true });

    this.wss.on('connection', (ws, request) => {
      const url = new URL(request.url, 'http://localhost');
      const clientId = url.searchParams.get('clientId');

      if (!clientId) {
        ws.close(4000, 'clientId é obrigatório');
        return;
      }

      console.log(`🔗 Cliente conectado via WebSocket: ${clientId}`);
      this.connectedClients.set(clientId, ws);

      // Ping/Pong para manter conexão
      ws.on('ping', () => ws.pong());
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleWebSocketMessage(clientId, message);
        } catch (error) {
          console.error('❌ Erro mensagem WebSocket:', error);
        }
      });

      ws.on('close', () => {
        console.log(`🔌 Cliente desconectado: ${clientId}`);
        this.connectedClients.delete(clientId);
      });

      // Enviar status inicial
      ws.send(JSON.stringify({
        type: 'connected',
        clientId,
        timestamp: Date.now()
      }));
    });
  }

  async handleWebSocketMessage(clientId, message) {
    switch (message.type) {
      case 'ping':
        this.notifyClient(clientId, { type: 'pong' });
        break;
        
      case 'get_status':
        this.notifyClient(clientId, {
          type: 'status',
          claude: this.claudeTerminal.getStatus(),
          docker: this.dockerManager.getStatus()
        });
        break;
    }
  }

  notifyClient(clientId, message) {
    const ws = this.connectedClients.get(clientId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  getAllowedOrigins() {
    const origins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://localhost:3000',
      'https://localhost:5173'
    ];

    if (process.env.TUNNEL_URL) {
      origins.push(process.env.TUNNEL_URL);
    }

    if (process.env.VERCEL_URL) {
      origins.push(`https://${process.env.VERCEL_URL}`);
    }

    return origins;
  }

  start() {
    this.server = this.app.listen(this.port, () => {
      console.log(`🚀 API Gateway rodando na porta ${this.port}`);
      console.log(`📡 WebSocket disponível`);
      console.log(`🔗 Health check: http://localhost:${this.port}/api/health`);
    });

    // WebSocket upgrade
    this.server.on('upgrade', (request, socket, head) => {
      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.wss.emit('connection', ws, request);
      });
    });

    return this.server;
  }

  async stop() {
    console.log('🛑 Parando API Gateway...');
    
    // Parar serviços
    await this.dockerManager.destroyAll();
    
    // Fechar WebSocket
    if (this.wss) {
      this.wss.close();
    }
    
    // Fechar servidor
    if (this.server) {
      this.server.close();
    }
  }
}

module.exports = APIGateway;

// Executar se chamado diretamente
if (require.main === module) {
  const gateway = new APIGateway();
  gateway.start();
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Encerrando sistema...');
    await gateway.stop();
    process.exit(0);
  });
}