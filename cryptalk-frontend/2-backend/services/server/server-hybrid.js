const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const WebSocket = require('ws');
const ClaudeExecutor = require('./claude-executor');

// Carregar variáveis de ambiente
require('dotenv').config();

// Usar arquivo de configuração específico para produção se existir
if (process.env.NODE_ENV === 'production') {
  require('dotenv').config({ path: '.env.production' });
}

const app = express();
const PORT = process.env.PORT || 3001;
const WEBSOCKET_PORT = process.env.WEBSOCKET_PORT || 8080;

// Inicializar Claude Executor
const claudeExecutor = new ClaudeExecutor();

// Configuração de segurança para produção
if (process.env.NODE_ENV === 'production') {
  // Helmet para segurança
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", "wss:", "ws:"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "https:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false
  }));

  // Compressão
  app.use(compression());
  
  // Rate limiting
  const limiter = rateLimit({
    windowMs: (process.env.RATE_LIMIT_DURATION || 60) * 1000,
    max: process.env.RATE_LIMIT_POINTS || 20,
    message: 'Muitas requisições deste IP, tente novamente em um minuto.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  
  app.use('/api/', limiter);
}

// Configuração de CORS melhorada para arquitetura híbrida
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requisições sem origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map(o => o.trim());
    
    // Adicionar origens padrão
    const defaultOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://localhost:3000',
      'https://localhost:5173'
    ];
    
    // Origens específicas do tunnel Cloudflare
    const tunnelOrigins = [
      'https://furthermore-decide-para-ste.trycloudflare.com',
      'https://furthermore-decide-para-ste.trycloudflare.com:5173',
      'https://furthermore-decide-para-ste.trycloudflare.com:3000'
    ];
    
    const allOrigins = [...allowedOrigins, ...defaultOrigins, ...tunnelOrigins];
    
    // Permitir origens do Cloudflare Tunnel, Vercel, GitHub Pages
    if (origin.includes('trycloudflare.com') || 
        origin.includes('vercel.app') || 
        origin.includes('github.io') ||
        origin.includes('netlify.app') ||
        origin.includes('furthermore-decide-para-ste') ||
        allOrigins.includes(origin)) {
      console.log(`✅ CORS permitido para: ${origin}`);
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Client-Id', 'X-Document-Type'],
  preflightContinue: false
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Trust proxy para Cloudflare
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', true);
}

// Middleware de logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const origin = req.headers.origin || 'no-origin';
  console.log(`[${timestamp}] ${req.method} ${req.path} from ${origin}`);
  next();
});

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const clientId = req.body.clientId || uuidv4();
    const clientDir = path.join(__dirname, 'client-containers', clientId);
    
    try {
      await fs.mkdir(clientDir, { recursive: true });
      cb(null, clientDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Preservar nome original do arquivo
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB default
    files: parseInt(process.env.MAX_FILES) || 10
  },
  fileFilter: (req, file, cb) => {
    // Permitir apenas tipos específicos de arquivo
    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/markdown',
      'application/json',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido'), false);
    }
  }
});

// WebSocket Server com configuração melhorada
const wss = new WebSocket.Server({ 
  port: WEBSOCKET_PORT,
  perMessageDeflate: false,
  clientTracking: true,
  maxPayload: 1024 * 1024 * 10 // 10MB
});

// Armazenar conexões WebSocket por cliente
const clientConnections = new Map();

// Heartbeat para manter conexões vivas
function heartbeat() {
  this.isAlive = true;
}

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`📡 Nova conexão WebSocket de ${clientIp}`);
  
  ws.isAlive = true;
  ws.on('pong', heartbeat);
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'register' && data.clientId) {
        clientConnections.set(data.clientId, ws);
        console.log(`👤 Cliente ${data.clientId} registrado`);
        
        // Confirmar registro
        ws.send(JSON.stringify({
          type: 'registered',
          clientId: data.clientId,
          timestamp: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error('❌ Erro ao processar mensagem WebSocket:', error);
    }
  });

  ws.on('close', () => {
    console.log('🔌 Conexão WebSocket fechada');
    // Remover conexão do mapa
    for (const [clientId, connection] of clientConnections.entries()) {
      if (connection === ws) {
        clientConnections.delete(clientId);
        console.log(`👤 Cliente ${clientId} desconectado`);
        break;
      }
    }
  });

  ws.on('error', (error) => {
    console.error('❌ Erro WebSocket:', error);
  });
});

// Ping/Pong para manter conexões vivas
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      return ws.terminate();
    }
    
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(interval);
});

// Função para enviar mensagem via WebSocket
function sendToClient(clientId, message) {
  const connection = clientConnections.get(clientId);
  if (connection && connection.readyState === WebSocket.OPEN) {
    try {
      connection.send(JSON.stringify(message));
    } catch (error) {
      console.error(`❌ Erro ao enviar mensagem para cliente ${clientId}:`, error);
    }
  }
}

// Função para executar Claude Code via ClaudeExecutor
async function executeClaude(clientId, filePath, documentType) {
  try {
    // Validar arquivo antes da análise
    await claudeExecutor.validateFile(filePath);
    
    // Executar análise com callback de progresso
    const result = await claudeExecutor.executeAnalysis(
      clientId,
      filePath,
      documentType,
      (progress) => {
        // Enviar progresso em tempo real via WebSocket
        sendToClient(clientId, {
          type: 'analysis_chunk',
          content: progress.content,
          progress: progress.progress
        });
      }
    );
    
    return result;
  } catch (error) {
    throw error;
  }
}

// Função para limpar container do cliente
async function cleanupClient(clientId) {
  try {
    const clientDir = path.join(__dirname, 'client-containers', clientId);
    await fs.rm(clientDir, { recursive: true, force: true });
    console.log(`🧹 Container do cliente ${clientId} limpo`);
  } catch (error) {
    console.error(`❌ Erro ao limpar container do cliente ${clientId}:`, error);
  }
}

// Rotas da API

// Rota de saúde para monitoramento
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    activeConnections: clientConnections.size
  });
});

// Rota para informações do sistema
app.get('/api/info', (req, res) => {
  res.json({
    name: 'CrysTalk Backend',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    features: {
      claudeCode: true,
      websocket: true,
      fileUpload: true,
      realTimeAnalysis: true
    },
    limits: {
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024,
      maxFiles: parseInt(process.env.MAX_FILES) || 10,
      uploadTimeout: parseInt(process.env.UPLOAD_TIMEOUT) || 300000
    }
  });
});

// Rota para criar nova sessão de cliente
app.post('/api/client/create', async (req, res) => {
  try {
    const clientId = uuidv4();
    const clientDir = path.join(__dirname, 'client-containers', clientId);
    
    await fs.mkdir(clientDir, { recursive: true });
    
    res.json({ 
      clientId,
      message: 'Sessão de cliente criada com sucesso',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro ao criar sessão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para upload de arquivo
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    
    const clientId = req.body.clientId;
    const documentType = req.body.documentType;
    
    if (!clientId || !documentType) {
      return res.status(400).json({ error: 'clientId e documentType são obrigatórios' });
    }
    
    const filePath = req.file.path;
    
    console.log(`📁 Arquivo recebido: ${req.file.filename} (${req.file.size} bytes)`);
    
    res.json({
      message: 'Arquivo enviado com sucesso',
      filePath: filePath,
      fileName: req.file.filename,
      fileSize: req.file.size,
      clientId: clientId,
      documentType: documentType,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro no upload:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para iniciar análise
app.post('/api/analyze', async (req, res) => {
  try {
    const { clientId, filePath, documentType } = req.body;
    
    if (!clientId || !filePath || !documentType) {
      return res.status(400).json({ error: 'Parâmetros obrigatórios faltando' });
    }
    
    // Verificar se o arquivo existe
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }
    
    // Notificar cliente que análise iniciou
    sendToClient(clientId, {
      type: 'analysis_started',
      message: 'Análise iniciada...',
      timestamp: new Date().toISOString()
    });
    
    // Executar análise em background
    executeClaude(clientId, filePath, documentType)
      .then((result) => {
        sendToClient(clientId, {
          type: 'analysis_complete',
          content: result,
          timestamp: new Date().toISOString()
        });
        
        // Log da análise concluída
        console.log(`✅ Análise concluída para cliente ${clientId}`);
      })
      .catch((error) => {
        console.error(`❌ Erro na análise para cliente ${clientId}:`, error);
        sendToClient(clientId, {
          type: 'analysis_error',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      });
    
    res.json({ 
      message: 'Análise iniciada',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar análise:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para listar arquivos do cliente
app.get('/api/client/:clientId/files', async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const clientDir = path.join(__dirname, 'client-containers', clientId);
    
    try {
      const files = await fs.readdir(clientDir);
      const fileList = [];
      
      for (const file of files) {
        const filePath = path.join(clientDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isFile()) {
          fileList.push({
            name: file,
            size: stats.size,
            modified: stats.mtime,
            path: filePath
          });
        }
      }
      
      res.json({ files: fileList });
    } catch (error) {
      res.json({ files: [] });
    }
  } catch (error) {
    console.error('❌ Erro ao listar arquivos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para download de arquivo
app.get('/api/download/:clientId/:fileName', async (req, res) => {
  try {
    const { clientId, fileName } = req.params;
    const filePath = path.join(__dirname, 'client-containers', clientId, fileName);
    
    try {
      await fs.access(filePath);
      res.download(filePath, fileName);
    } catch (error) {
      res.status(404).json({ error: 'Arquivo não encontrado' });
    }
  } catch (error) {
    console.error('❌ Erro no download:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para limpar sessão do cliente
app.delete('/api/client/:clientId', async (req, res) => {
  try {
    const clientId = req.params.clientId;
    await cleanupClient(clientId);
    
    // Remover conexão WebSocket se existir
    clientConnections.delete(clientId);
    
    res.json({ 
      message: 'Sessão do cliente limpa com sucesso',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro ao limpar sessão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para servir arquivos estáticos (se necessário)
app.use('/static', express.static(path.join(__dirname, '../dist')));

// Rota catch-all para APIs não encontradas
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Limpeza automática de containers antigos
const cleanupInterval = parseInt(process.env.CLEANUP_INTERVAL) || 3600000; // 1 hora
const maxClientAge = parseInt(process.env.MAX_CLIENT_AGE) || 86400000; // 24 horas

if (process.env.CLEANUP_ENABLED !== 'false') {
  setInterval(async () => {
    try {
      const containersDir = path.join(__dirname, 'client-containers');
      
      // Verificar se o diretório existe
      try {
        await fs.access(containersDir);
      } catch {
        return; // Diretório não existe ainda
      }
      
      const clients = await fs.readdir(containersDir);
      const now = Date.now();
      let cleanedCount = 0;
      
      for (const clientId of clients) {
        const clientDir = path.join(containersDir, clientId);
        
        try {
          const stats = await fs.stat(clientDir);
          
          if (now - stats.mtime.getTime() > maxClientAge) {
            await cleanupClient(clientId);
            cleanedCount++;
          }
        } catch (error) {
          console.error(`❌ Erro ao verificar cliente ${clientId}:`, error);
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`🧹 Limpeza automática: ${cleanedCount} containers removidos`);
      }
    } catch (error) {
      console.error('❌ Erro na limpeza automática:', error);
    }
  }, cleanupInterval);
}

// Iniciar servidor
const server = app.listen(PORT, process.env.SERVER_HOST || '0.0.0.0', () => {
  console.log('==========================================');
  console.log('🚀 CrysTalk Backend - Arquitetura Híbrida');
  console.log('==========================================');
  console.log(`📡 Servidor HTTP: http://${process.env.SERVER_HOST || 'localhost'}:${PORT}`);
  console.log(`🔌 WebSocket: ws://${process.env.SERVER_HOST || 'localhost'}:${WEBSOCKET_PORT}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📁 Diretório: ${__dirname}`);
  console.log(`🧠 Claude Code: Ativo`);
  console.log(`🔧 CORS: ${process.env.CORS_ORIGIN || 'localhost'}`);
  console.log(`🛡️ Segurança: ${process.env.NODE_ENV === 'production' ? 'Produção' : 'Desenvolvimento'}`);
  console.log('==========================================');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Encerrando servidor CrysTalk...');
  
  // Parar todos os processos Claude ativos
  const activeProcesses = claudeExecutor.getActiveProcesses();
  console.log(`🔄 Parando ${activeProcesses.length} processos ativos...`);
  
  for (const processId of activeProcesses) {
    await claudeExecutor.killProcess(processId);
  }
  
  // Limpar todas as conexões WebSocket
  for (const [clientId, connection] of clientConnections.entries()) {
    connection.close();
  }
  
  // Fechar WebSocket server
  wss.close();
  
  // Fechar servidor HTTP
  server.close();
  
  console.log('✅ Servidor encerrado com sucesso');
  process.exit(0);
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Erro não capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada:', reason);
  console.error('Promise:', promise);
});

module.exports = app;