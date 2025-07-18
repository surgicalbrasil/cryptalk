const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const WebSocket = require('ws');
const ClaudeExecutor = require('./claude-executor');

// Carregar variáveis de ambiente
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Inicializar Claude Executor
const claudeExecutor = new ClaudeExecutor();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

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
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// WebSocket Server
const wss = new WebSocket.Server({ port: 8080 });

// Armazenar conexões WebSocket por cliente
const clientConnections = new Map();

wss.on('connection', (ws) => {
  console.log('Nova conexão WebSocket estabelecida');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'register' && data.clientId) {
        clientConnections.set(data.clientId, ws);
        console.log(`Cliente ${data.clientId} registrado`);
      }
    } catch (error) {
      console.error('Erro ao processar mensagem WebSocket:', error);
    }
  });

  ws.on('close', () => {
    console.log('Conexão WebSocket fechada');
    // Remover conexão do mapa
    for (const [clientId, connection] of clientConnections.entries()) {
      if (connection === ws) {
        clientConnections.delete(clientId);
        break;
      }
    }
  });
});

// Função para enviar mensagem via WebSocket
function sendToClient(clientId, message) {
  const connection = clientConnections.get(clientId);
  if (connection && connection.readyState === WebSocket.OPEN) {
    connection.send(JSON.stringify(message));
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
    console.log(`Container do cliente ${clientId} limpo`);
  } catch (error) {
    console.error(`Erro ao limpar container do cliente ${clientId}:`, error);
  }
}

// Rotas da API

// Rota de health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Servidor CrysTalk funcionando',
    timestamp: new Date().toISOString()
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
      message: 'Sessão de cliente criada com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao criar sessão:', error);
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
    
    res.json({
      message: 'Arquivo enviado com sucesso',
      filePath: filePath,
      fileName: req.file.filename,
      clientId: clientId,
      documentType: documentType
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
      message: 'Análise iniciada...'
    });
    
    // Executar análise em background
    executeClaude(clientId, filePath, documentType)
      .then((result) => {
        sendToClient(clientId, {
          type: 'analysis_complete',
          content: result
        });
        
        // Log da análise concluída
        console.log(`✅ Análise concluída para cliente ${clientId}`);
      })
      .catch((error) => {
        console.error(`❌ Erro na análise para cliente ${clientId}:`, error);
        sendToClient(clientId, {
          type: 'analysis_error',
          error: error.message
        });
      });
    
    res.json({ message: 'Análise iniciada' });
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
    console.error('Erro ao listar arquivos:', error);
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
    console.error('Erro no download:', error);
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
    
    res.json({ message: 'Sessão do cliente limpa com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao limpar sessão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para servir o frontend (apenas para rota raiz)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Limpeza automática de containers antigos
const cleanupInterval = process.env.CLEANUP_INTERVAL || 3600000; // 1 hora
const maxClientAge = process.env.MAX_CLIENT_AGE || 86400000; // 24 horas

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
        console.error(`Erro ao verificar cliente ${clientId}:`, error);
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Limpeza automática: ${cleanedCount} containers removidos`);
    }
  } catch (error) {
    console.error('❌ Erro na limpeza automática:', error);
  }
}, cleanupInterval);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor CrysTalk rodando na porta ${PORT}`);
  console.log(`📡 WebSocket servidor rodando na porta 8080`);
  console.log(`🎯 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📁 Diretório de trabalho: ${__dirname}`);
  console.log(`🔧 Claude Code executor inicializado`);
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
  
  console.log('✅ Servidor encerrado com sucesso');
  process.exit(0);
});