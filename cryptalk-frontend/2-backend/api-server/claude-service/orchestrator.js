const express = require('express');
const Docker = require('dockerode');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');
const WebSocket = require('ws');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const tar = require('tar-stream');
const ClaudeConversationManager = require('./claude-conversation');
const ClaudeTerminalService = require('./claude-terminal-service');
const DockerManager = require('./docker-manager');
const FileManager = require('./file-manager');

// Carregar variáveis de ambiente
require('dotenv').config();

// Função de sanitização básica
function sanitizeInput(input, maxLength = 255) {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .trim()                           // Remove espaços
    .substring(0, maxLength)          // Limita tamanho
    .replace(/[<>\"'&]/g, '')         // Remove caracteres perigosos
    .replace(/[^\w\s\-\.]/g, '');     // Permite apenas alfanuméricos, espaços, hífens e pontos
}

// Função para validar UUID
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Função para validar tipos de documento
function isValidDocumentType(type) {
  const validTypes = ['pitch-deck', 'patent', 'financial', 'tech-doc', 'legal-doc'];
  return validTypes.includes(type);
}

const app = express();
const PORT = process.env.PORT || 3002;

// Inicializar serviços especializados
const claudeConversation = new ClaudeConversationManager();
const claudeTerminal = new ClaudeTerminalService();
const dockerManager = new DockerManager();
const fileManager = new FileManager();

// Configuração do multer para upload de arquivos
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    console.log(`🔍 CORS check - Origin: ${origin}`);
    // Permitir requisições sem origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:5176',
      'https://localhost:3000',
      'https://localhost:3001',
      'https://localhost:3002',
      'https://localhost:5173',
      'https://localhost:5174',
      'https://localhost:5175',
      'https://localhost:5176'
    ];
    
    // Suporte a tunnel Cloudflare
    if (process.env.TUNNEL_URL) {
      allowedOrigins.push(process.env.TUNNEL_URL);
    }
    
    // Permitir domínios do Cloudflare Tunnel
    if (origin.includes('trycloudflare.com') || 
        origin.includes('vercel.app') || 
        origin.includes('github.io') ||
        origin.includes('netlify.app') ||
        allowedOrigins.includes(origin)) {
      console.log(`✅ CORS allowed for: ${origin}`);
      callback(null, true);
    } else {
      console.log(`❌ CORS blocked for: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../dist')));

// Rate limiting mais específico e inteligente
const createRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Reduzido para 5 criações por IP
  message: { error: 'Muitas solicitações de criação de containers. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 10, // 10 uploads por IP por 5 minutos
  message: { error: 'Muitos uploads. Aguarde 5 minutos antes de tentar novamente.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const analyzeRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 20, // 20 análises por IP por 10 minutos
  message: { error: 'Muitas análises solicitadas. Aguarde 10 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // Aumentado para 200 requests gerais
  message: { error: 'Muitas solicitações. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Aplicar rate limiting geral
app.use('/api/', generalRateLimit);

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error(`❌ Erro no servidor:`, err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Dados inválidos', details: err.message });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// WebSocket Server
const wss = new WebSocket.Server({ port: 8080 });
const clientConnections = new Map();

// Configurações do container
const CONTAINER_CONFIG = {
  image: 'claude-analyzer:v1.0',  // ✅ Imagem otimizada e escalável
  networkMode: 'bridge',
  restartPolicy: { Name: 'unless-stopped' },
  hostConfig: {
    memory: 256 * 1024 * 1024, // ✅ 256MB (otimizado)
    memorySwap: 256 * 1024 * 1024, // Sem swap
    cpuPeriod: 100000,
    cpuQuota: 25000, // ✅ 25% CPU (otimizado)
    pidsLimit: 50, // ✅ Limite reduzido
    AutoRemove: false, // ✅ Manter container ativo durante sessão
    securityOpt: [
      'no-new-privileges:true'
    ],
    capDrop: ['ALL'],
    capAdd: ['CHOWN', 'SETUID', 'SETGID'],
    readonlyRootfs: false,
    tmpfs: {
      '/tmp': 'size=100m,noexec,nosuid,nodev', // ✅ Reduzido
      '/app/workspace': 'size=50m' // ✅ Workspace temporário
    },
    ulimits: [
      { Name: 'nofile', Soft: 512, Hard: 1024 }, // ✅ Reduzido
      { Name: 'nproc', Soft: 50, Hard: 100 } // ✅ Reduzido
    ]
  },
  env: [
    'NODE_ENV=production',
    'CLAUDE_API_KEY=' + process.env.CLAUDE_API_KEY,
    'CONTAINER_MODE=isolated',
    'DEBIAN_FRONTEND=noninteractive'
  ]
};

// Configurações de recursos por tipo de análise
const RESOURCE_CONFIGS = {
  light: {
    memory: 256 * 1024 * 1024, // 256MB
    cpuQuota: 25000 // 25% CPU
  },
  medium: {
    memory: 512 * 1024 * 1024, // 512MB
    cpuQuota: 50000 // 50% CPU
  },
  heavy: {
    memory: 1024 * 1024 * 1024, // 1GB
    cpuQuota: 100000 // 100% CPU
  }
};

// Configurações de monitoramento
const MONITORING_CONFIG = {
  statsInterval: 5000, // 5 segundos
  alertThresholds: {
    cpu: 80, // 80% CPU
    memory: 85, // 85% memória
    disk: 90, // 90% disco
    networkRx: 100 * 1024 * 1024, // 100MB/s
    networkTx: 100 * 1024 * 1024  // 100MB/s
  },
  historySize: 100, // Manter 100 pontos de dados históricos
  alertCooldown: 5 * 60 * 1000 // 5 minutos entre alertas similares
};

// Gerenciador de containers por cliente
class ClientContainerManager {
  constructor() {
    this.docker = new Docker(); // Initialize Docker instance
    this.activeContainers = new Map();
    this.containerTimeouts = new Map();
    this.containerStats = new Map();
    this.containerHistory = new Map();
    this.alertHistory = new Map();
    this.maxContainerAge = 30 * 60 * 1000; // 30 minutos
    this.maxConcurrentContainers = 10;
    this.totalContainersCreated = 0;
    this.totalContainersDestroyed = 0;
    this.setupMonitoring();
  }

  setupMonitoring() {
    // Monitoramento de recursos em tempo real
    setInterval(async () => {
      await this.monitorContainers();
    }, MONITORING_CONFIG.statsInterval);

    // Limpeza de estatísticas antigas
    setInterval(() => {
      this.cleanupOldStats();
    }, 60000); // A cada minuto
  }

  async monitorContainers() {
    for (const [clientId, containerInfo] of this.activeContainers.entries()) {
      try {
        const stats = await this.getContainerStats(clientId);
        if (stats) {
          this.containerStats.set(clientId, {
            ...stats,
            timestamp: Date.now()
          });
          
          // Verificar alertas
          await this.checkResourceAlerts(clientId, stats);
        }
      } catch (error) {
        console.error(`❌ Erro ao monitorar container ${clientId}:`, error);
      }
    }
  }

  async checkResourceAlerts(clientId, stats) {
    const alerts = [];
    const now = Date.now();
    
    // Verificar CPU
    if (stats.cpu > MONITORING_CONFIG.alertThresholds.cpu) {
      alerts.push({
        type: 'cpu_high',
        message: `CPU alta: ${stats.cpu.toFixed(2)}%`,
        value: stats.cpu,
        threshold: MONITORING_CONFIG.alertThresholds.cpu
      });
    }
    
    // Verificar memória
    if (stats.memory > MONITORING_CONFIG.alertThresholds.memory) {
      alerts.push({
        type: 'memory_high',
        message: `Memória alta: ${stats.memory.toFixed(2)}%`,
        value: stats.memory,
        threshold: MONITORING_CONFIG.alertThresholds.memory
      });
    }
    
    // Verificar rede
    if (stats.network.rx > MONITORING_CONFIG.alertThresholds.networkRx) {
      alerts.push({
        type: 'network_rx_high',
        message: `Tráfego de rede RX alto: ${(stats.network.rx / 1024 / 1024).toFixed(2)} MB/s`,
        value: stats.network.rx,
        threshold: MONITORING_CONFIG.alertThresholds.networkRx
      });
    }
    
    if (stats.network.tx > MONITORING_CONFIG.alertThresholds.networkTx) {
      alerts.push({
        type: 'network_tx_high',
        message: `Tráfego de rede TX alto: ${(stats.network.tx / 1024 / 1024).toFixed(2)} MB/s`,
        value: stats.network.tx,
        threshold: MONITORING_CONFIG.alertThresholds.networkTx
      });
    }
    
    // Processar alertas com cooldown
    for (const alert of alerts) {
      const alertKey = `${clientId}_${alert.type}`;
      const lastAlert = this.alertHistory.get(alertKey);
      
      if (!lastAlert || now - lastAlert > MONITORING_CONFIG.alertCooldown) {
        console.warn(`⚠️  Alerta para container ${clientId}: ${alert.message}`);
        
        sendToClient(clientId, {
          type: 'resource_alert',
          alert: alert,
          timestamp: now
        });
        
        this.alertHistory.set(alertKey, now);
      }
    }
    
    // Armazenar histórico de estatísticas
    if (!this.containerHistory.has(clientId)) {
      this.containerHistory.set(clientId, []);
    }
    
    const history = this.containerHistory.get(clientId);
    history.push({
      ...stats,
      timestamp: now
    });
    
    // Limitar tamanho do histórico
    if (history.length > MONITORING_CONFIG.historySize) {
      history.shift();
    }
  }

  cleanupOldStats() {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutos
    
    for (const [clientId, stats] of this.containerStats.entries()) {
      if (now - stats.timestamp > maxAge) {
        this.containerStats.delete(clientId);
      }
    }
  }

  async createClientContainer(clientId, resourceType = 'medium') {
    try {
      // Verificar limite de containers
      if (this.activeContainers.size >= this.maxConcurrentContainers) {
        throw new Error('Limite máximo de containers atingido');
      }

      const containerName = `claude-user-${clientId}`;
      
      // Verificar se container já existe
      if (this.activeContainers.has(clientId)) {
        await this.cleanupContainer(clientId);
      }

      // Criar volumes para o cliente
      const volumeName = `claude-data-${clientId}`;
      const uploadsVolume = `claude-uploads-${clientId}`;
      const logsVolume = `claude-logs-${clientId}`;
      
      await this.createVolumes([
        { name: volumeName, driver: 'local' },
        { name: uploadsVolume, driver: 'local' },
        { name: logsVolume, driver: 'local' }
      ]);

      // Configuração de recursos baseada no tipo
      const resourceConfig = RESOURCE_CONFIGS[resourceType] || RESOURCE_CONFIGS.medium;
      
      // Configuração do container
      const config = {
        ...CONTAINER_CONFIG,
        name: containerName,
        Labels: {
          'com.crystalk.client-id': clientId,
          'com.crystalk.resource-type': resourceType,
          'com.crystalk.created-at': Date.now().toString()
        },
        Volumes: {
          '/app/data': {},
          '/app/uploads': {},
          '/app/logs': {},
          '/app/workspace': {}
        },
        HostConfig: {
          ...CONTAINER_CONFIG.hostConfig,
          Memory: resourceConfig.memory,
          MemorySwap: resourceConfig.memory,
          CpuQuota: resourceConfig.cpuQuota,
          Binds: [
            `${volumeName}:/app/data`,
            `${uploadsVolume}:/app/uploads`,
            `${logsVolume}:/app/logs`
          ],
          NetworkMode: 'bridge'
        },
        Env: [
          ...CONTAINER_CONFIG.env,
          `CLIENT_ID=${clientId}`,
          `CONTAINER_NAME=${containerName}`,
          `RESOURCE_TYPE=${resourceType}`,
          `MAX_MEMORY=${resourceConfig.memory}`,
          `MAX_CPU_QUOTA=${resourceConfig.cpuQuota}`
        ]
      };

      // Criar container
      const container = await this.docker.createContainer(config);
      await container.start();

      // Aguardar container ficar pronto
      await this.waitForContainer(container);

      // Registrar container ativo
      this.activeContainers.set(clientId, {
        container,
        containerName,
        volumeName,
        uploadsVolume,
        logsVolume,
        resourceType,
        createdAt: Date.now(),
        lastActivity: Date.now()
      });

      // Configurar timeout
      this.setupContainerTimeout(clientId);

      // Atualizar métricas
      this.totalContainersCreated++;

      console.log(`✅ Container criado para cliente ${clientId}: ${containerName} (${resourceType})`);
      return container;
    } catch (error) {
      console.error(`❌ Erro ao criar container para cliente ${clientId}:`, error);
      throw error;
    }
  }

  async createVolumes(volumeConfigs) {
    for (const config of volumeConfigs) {
      try {
        await this.docker.createVolume({ 
          Name: config.name,
          Driver: config.driver || 'local',
          Labels: {
            'com.crystalk.managed': 'true',
            'com.crystalk.created-at': Date.now().toString()
          }
        });
      } catch (error) {
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }
    }
  }

  async waitForContainer(container, maxWait = 10000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      try {
        const info = await container.inspect();
        if (info.State.Running) {
          return true;
        }
      } catch (error) {
        // Container ainda não está pronto
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    throw new Error('Container não ficou pronto no tempo limite');
  }

  async executeInContainer(clientId, command, onData, options = {}) {
    const containerInfo = this.activeContainers.get(clientId);
    if (!containerInfo) {
      throw new Error(`Container não encontrado para cliente ${clientId}`);
    }

    const { container } = containerInfo;
    
    // Atualizar último acesso
    containerInfo.lastActivity = Date.now();
    
    try {
      // Configuração da execução
      const execConfig = {
        Cmd: Array.isArray(command) ? command : ['/bin/sh', '-c', command],
        AttachStdout: true,
        AttachStderr: true,
        AttachStdin: false,
        Tty: false,
        WorkingDir: options.workingDir || '/app',
        Env: options.env || [],
        User: options.user || 'claude'
      };

      // Criar execução
      const exec = await container.exec(execConfig);
      
      // Executar comando com timeout
      const timeout = options.timeout || 30000; // 30 segundos
      const stream = await exec.start({ hijack: true, stdin: false });
      
      // Processar saída
      let output = '';
      let timeoutHandle;
      
      const processOutput = (chunk) => {
        const data = chunk.toString();
        output += data;
        if (onData) onData(data);
      };
      
      // Configurar timeout
      const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`Timeout de ${timeout}ms excedido`));
        }, timeout);
      });
      
      // Processar stream
      const streamPromise = new Promise((resolve, reject) => {
        stream.on('data', processOutput);
        stream.on('end', () => resolve(output));
        stream.on('error', reject);
      });
      
      try {
        const result = await Promise.race([streamPromise, timeoutPromise]);
        clearTimeout(timeoutHandle);
        
        // Verificar código de saída
        const inspectResult = await exec.inspect();
        if (inspectResult.ExitCode !== 0) {
          throw new Error(`Comando falhou com código ${inspectResult.ExitCode}`);
        }
        
        return result;
      } catch (error) {
        clearTimeout(timeoutHandle);
        throw error;
      }
    } catch (error) {
      console.error(`❌ Erro ao executar comando no container ${clientId}:`, error);
      throw error;
    }
  }

  async cleanupContainer(clientId, force = false) {
    const containerInfo = this.activeContainers.get(clientId);
    if (!containerInfo) return;

    const { 
      container, 
      containerName, 
      volumeName, 
      uploadsVolume, 
      logsVolume 
    } = containerInfo;

    try {
      console.log(`🧹 Iniciando limpeza do container ${containerName}...`);
      
      // Parar container
      try {
        const info = await container.inspect();
        if (info.State.Running) {
          await container.stop({ t: force ? 5 : 10 });
        }
      } catch (error) {
        console.warn(`⚠️  Erro ao parar container ${containerName}:`, error.message);
      }
      
      // Remover container
      try {
        await container.remove({ force });
      } catch (error) {
        console.warn(`⚠️  Erro ao remover container ${containerName}:`, error.message);
      }
      
      // Remover volumes
      const volumes = [volumeName, uploadsVolume, logsVolume].filter(Boolean);
      for (const volume of volumes) {
        try {
          await this.docker.getVolume(volume).remove({ force });
        } catch (error) {
          console.warn(`⚠️  Erro ao remover volume ${volume}:`, error.message);
        }
      }

      // Limpar timeout
      if (this.containerTimeouts.has(clientId)) {
        clearTimeout(this.containerTimeouts.get(clientId));
        this.containerTimeouts.delete(clientId);
      }

      // Remover estatísticas
      this.containerStats.delete(clientId);

      // Remover do registro
      this.activeContainers.delete(clientId);
      
      // Atualizar métricas
      this.totalContainersDestroyed++;
      
      console.log(`✅ Container ${containerName} removido para cliente ${clientId}`);
    } catch (error) {
      console.error(`❌ Erro ao limpar container ${clientId}:`, error);
      if (!force) {
        // Tentar limpeza forçada
        console.log(`🔄 Tentando limpeza forçada para ${clientId}...`);
        await this.cleanupContainer(clientId, true);
      }
    }
  }

  setupContainerTimeout(clientId) {
    // Limpar timeout existente
    if (this.containerTimeouts.has(clientId)) {
      clearTimeout(this.containerTimeouts.get(clientId));
    }

    // Configurar novo timeout
    const timeout = setTimeout(async () => {
      console.log(`⏰ Timeout atingido para cliente ${clientId}, removendo container`);
      await this.cleanupContainer(clientId);
    }, this.maxContainerAge);

    this.containerTimeouts.set(clientId, timeout);
  }

  async getContainerStatus(clientId) {
    const containerInfo = this.activeContainers.get(clientId);
    if (!containerInfo) return null;

    const { container, createdAt, resourceType, lastActivity } = containerInfo;
    
    try {
      const info = await container.inspect();
      const stats = this.containerStats.get(clientId);
      
      return {
        id: info.Id,
        status: info.State.Status,
        created: createdAt,
        uptime: Date.now() - createdAt,
        lastActivity,
        resourceType,
        stats: stats ? {
          cpu: stats.cpu,
          memory: stats.memory,
          network: stats.network,
          disk: stats.disk
        } : null
      };
    } catch (error) {
      return null;
    }
  }

  async getContainerStats(clientId) {
    const containerInfo = this.activeContainers.get(clientId);
    if (!containerInfo) return null;

    const { container } = containerInfo;
    
    try {
      const stats = await container.stats({ stream: false });
      
      // Calcular CPU
      const cpuUsage = stats.cpu_stats.cpu_usage.total_usage;
      const systemUsage = stats.cpu_stats.system_cpu_usage;
      const preCpuUsage = stats.precpu_stats.cpu_usage.total_usage;
      const preSystemUsage = stats.precpu_stats.system_cpu_usage;
      
      const cpuPercent = ((cpuUsage - preCpuUsage) / (systemUsage - preSystemUsage)) * 100;
      
      // Calcular memória
      const memoryUsage = stats.memory_stats.usage;
      const memoryLimit = stats.memory_stats.limit;
      const memoryPercent = (memoryUsage / memoryLimit) * 100;
      
      return {
        cpu: cpuPercent || 0,
        memory: memoryPercent || 0,
        memoryUsage: memoryUsage || 0,
        memoryLimit: memoryLimit || 0,
        network: {
          rx: stats.networks?.eth0?.rx_bytes || 0,
          tx: stats.networks?.eth0?.tx_bytes || 0
        },
        disk: {
          read: stats.blkio_stats.io_service_bytes_recursive?.[0]?.value || 0,
          write: stats.blkio_stats.io_service_bytes_recursive?.[1]?.value || 0
        }
      };
    } catch (error) {
      console.error(`❌ Erro ao obter estatísticas do container ${clientId}:`, error);
      return null;
    }
  }

  async listActiveContainers() {
    const containers = [];
    for (const [clientId, info] of this.activeContainers.entries()) {
      const status = await this.getContainerStatus(clientId);
      if (status) {
        containers.push({
          clientId,
          ...status
        });
      }
    }
    return containers;
  }

  async cleanupOldContainers() {
    const now = Date.now();
    const toCleanup = [];

    for (const [clientId, info] of this.activeContainers.entries()) {
      if (now - info.createdAt > this.maxContainerAge) {
        toCleanup.push(clientId);
      }
    }

    for (const clientId of toCleanup) {
      await this.cleanupContainer(clientId);
    }

    return toCleanup.length;
  }

  async writeFileToContainer(clientId, filePath, content) {
    const containerInfo = this.activeContainers.get(clientId);
    if (!containerInfo) {
      throw new Error(`Container não encontrado para cliente ${clientId}`);
    }

    const { container } = containerInfo;
    
    try {
      console.log(`📝 Preparando arquivo para container: ${filePath}`);
      
      // Criar diretório se necessário
      const dirPath = path.dirname(filePath);
      await this.executeInContainer(clientId, `mkdir -p "${dirPath}"`);
      
      // Converter base64 para buffer
      const fileBuffer = Buffer.from(content, 'base64');
      const fileName = path.basename(filePath);
      
      console.log(`📦 Criando archive TAR para: ${fileName} (${fileBuffer.length} bytes)`);
      
      // Criar tar stream usando tar-stream
      const pack = tar.pack();
      
      // Adicionar arquivo ao tar
      pack.entry({ name: fileName }, fileBuffer);
      pack.finalize();
      
      // Enviar para container usando Docker SDK
      console.log(`📋 Enviando arquivo para container via Docker SDK`);
      await container.putArchive(pack, { path: dirPath });
      
      // Arquivo enviado com sucesso via Docker SDK
      
      console.log(`✅ Arquivo ${filePath} escrito no container ${clientId} via Docker SDK`);
      return true;
    } catch (error) {
      console.error(`❌ Erro ao escrever arquivo no container ${clientId}:`, error);
      throw error;
    }
  }

  async readFileFromContainer(clientId, filePath) {
    const containerInfo = this.activeContainers.get(clientId);
    if (!containerInfo) {
      throw new Error(`Container não encontrado para cliente ${clientId}`);
    }

    try {
      // Ler arquivo usando base64 para preservar conteúdo
      const command = `cat "${filePath}" | base64`;
      const base64Content = await this.executeInContainer(clientId, command);
      
      // Decodificar conteúdo
      const content = Buffer.from(base64Content.trim(), 'base64');
      
      return content;
    } catch (error) {
      console.error(`❌ Erro ao ler arquivo do container ${clientId}:`, error);
      throw error;
    }
  }

  async copyFileFromContainer(clientId, containerPath, localPath) {
    const containerInfo = this.activeContainers.get(clientId);
    if (!containerInfo) {
      throw new Error(`Container não encontrado para cliente ${clientId}`);
    }

    try {
      console.log(`📥 Copiando arquivo do container: ${containerPath} → ${localPath}`);
      
      // Ler arquivo do container
      const fileContent = await this.readFileFromContainer(clientId, containerPath);
      
      // Criar diretório local se não existir
      const localDir = path.dirname(localPath);
      await require('fs').promises.mkdir(localDir, { recursive: true });
      
      // Escrever arquivo local
      await require('fs').promises.writeFile(localPath, fileContent);
      
      console.log(`✅ Arquivo copiado com sucesso: ${localPath}`);
      return true;
    } catch (error) {
      console.error(`❌ Erro ao copiar arquivo do container:`, error);
      throw error;
    }
  }

  async listFiles(clientId, directory) {
    const containerInfo = this.activeContainers.get(clientId);
    if (!containerInfo) {
      throw new Error(`Container não encontrado para cliente ${clientId}`);
    }

    try {
      // Listar arquivos com informações detalhadas
      const command = `find "${directory}" -type f -exec ls -la {} \\; 2>/dev/null | awk '{print $9 "|" $5 "|" $6 " " $7 " " $8}'`;
      const output = await this.executeInContainer(clientId, command);
      
      // Processar saída
      const files = output.trim().split('\n').filter(line => line.length > 0).map(line => {
        const [filePath, size, date] = line.split('|');
        return {
          path: filePath.trim(),
          size: parseInt(size) || 0,
          date: date.trim(),
          name: path.basename(filePath.trim())
        };
      });
      
      return files;
    } catch (error) {
      console.error(`❌ Erro ao listar arquivos do container ${clientId}:`, error);
      return [];
    }
  }
}

// Instanciar gerenciador
const containerManager = new ClientContainerManager();

// WebSocket handling
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
    for (const [clientId, connection] of clientConnections.entries()) {
      if (connection === ws) {
        clientConnections.delete(clientId);
        break;
      }
    }
  });
});

// Configurar listeners do Claude Conversation
claudeConversation.on('progress', (data) => {
  sendToClient(data.clientId, {
    type: 'analysis_progress',
    data: data.chunk,
    timestamp: new Date().toISOString()
  });
});

// Função para enviar mensagem via WebSocket
function sendToClient(clientId, message) {
  const connection = clientConnections.get(clientId);
  if (connection && connection.readyState === WebSocket.OPEN) {
    connection.send(JSON.stringify(message));
  }
}

// Rotas da API

// Criar sessão de cliente
app.post('/api/client/create', createRateLimit, async (req, res) => {
  try {
    const clientId = uuidv4();
    const resourceType = sanitizeInput(req.body.resourceType || 'medium', 10);
    const priority = sanitizeInput(req.body.priority || 'normal', 10);
    
    // Validar tipo de recurso
    if (!['light', 'medium', 'heavy'].includes(resourceType)) {
      return res.status(400).json({ error: 'Tipo de recurso inválido' });
    }
    
    // Validar prioridade
    if (!['low', 'normal', 'high'].includes(priority)) {
      return res.status(400).json({ error: 'Prioridade inválida' });
    }
    
    // Criar container para o cliente
    await containerManager.createClientContainer(clientId, resourceType);
    
    res.json({
      clientId,
      message: 'Sessão criada com sucesso',
      containerStatus: 'created',
      resourceType,
      maxAge: containerManager.maxContainerAge
    });
  } catch (error) {
    console.error('Erro ao criar sessão:', error);
    res.status(500).json({ error: error.message || 'Erro ao criar container do cliente' });
  }
});

// Status do container do cliente
app.get('/api/client/:clientId/status', async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const status = await containerManager.getContainerStatus(clientId);
    
    if (!status) {
      return res.status(404).json({ error: 'Container não encontrado' });
    }
    
    res.json(status);
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Executar análise
app.post('/api/analyze', analyzeRateLimit, async (req, res) => {
  try {
    const { clientId, filePath, documentType } = req.body;
    
    if (!clientId || !filePath || !documentType) {
      return res.status(400).json({ error: 'Parâmetros obrigatórios faltando' });
    }
    
    // Verificar se container existe
    const status = await containerManager.getContainerStatus(clientId);
    if (!status) {
      return res.status(404).json({ error: 'Container não encontrado' });
    }
    
    // Notificar início da análise
    sendToClient(clientId, {
      type: 'analysis_started',
      message: 'Análise iniciada no container isolado...'
    });
    
    // Executar análise no container
    const command = [
      'node',
      '/app/simple-analyzer.js',
      '--file', filePath,
      '--type', documentType,
      '--client', clientId
    ];
    
    containerManager.executeInContainer(clientId, command, (data) => {
      sendToClient(clientId, {
        type: 'analysis_chunk',
        content: data
      });
    })
    .then((result) => {
      sendToClient(clientId, {
        type: 'analysis_complete',
        content: result
      });
    })
    .catch((error) => {
      console.error(`❌ Erro na análise para cliente ${clientId}:`, error);
      sendToClient(clientId, {
        type: 'analysis_error',
        error: error.message
      });
    });
    
    res.json({ message: 'Análise iniciada no container' });
  } catch (error) {
    console.error('❌ Erro ao iniciar análise:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar containers ativos
app.get('/api/containers', async (req, res) => {
  try {
    const containers = await containerManager.listActiveContainers();
    res.json({ containers });
  } catch (error) {
    console.error('Erro ao listar containers:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Download de arquivo do container
app.get('/api/download/:clientId/:filename', async (req, res) => {
  try {
    const { clientId, filename } = req.params;
    
    // Verificar se container existe
    const status = await containerManager.getContainerStatus(clientId);
    if (!status) {
      return res.status(404).json({ error: 'Container não encontrado' });
    }
    
    // Caminho do arquivo no container
    const filePath = `/app/uploads/${filename}`;
    
    // Verificar se arquivo existe no container
    try {
      await containerManager.executeInContainer(clientId, `test -f "${filePath}"`);
    } catch (error) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }
    
    // Ler arquivo do container
    const fileContent = await containerManager.readFileFromContainer(clientId, filePath);
    
    // Configurar headers para download
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // Enviar arquivo
    res.send(Buffer.from(fileContent, 'base64'));
  } catch (error) {
    console.error('❌ Erro no download:', error);
    res.status(500).json({ error: 'Erro ao baixar arquivo' });
  }
});

// Remover container do cliente
app.delete('/api/client/:clientId', async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const { force = false } = req.query;
    
    await containerManager.cleanupContainer(clientId, force === 'true');
    clientConnections.delete(clientId);
    
    res.json({ message: 'Container removido com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao remover container:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Estatísticas do container
app.get('/api/client/:clientId/stats', async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const stats = await containerManager.getContainerStats(clientId);
    
    if (!stats) {
      return res.status(404).json({ error: 'Container não encontrado' });
    }
    
    res.json(stats);
  } catch (error) {
    console.error('❌ Erro ao obter estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Executar comando no container
app.post('/api/client/:clientId/execute', async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const { command, workingDir, timeout = 30000 } = req.body;
    
    if (!command) {
      return res.status(400).json({ error: 'Comando obrigatório' });
    }
    
    const result = await containerManager.executeInContainer(
      clientId, 
      command, 
      null, 
      { workingDir, timeout }
    );
    
    res.json({ result });
  } catch (error) {
    console.error('❌ Erro ao executar comando:', error);
    res.status(500).json({ error: error.message });
  }
});

// Redimensionar recursos do container
app.patch('/api/client/:clientId/resize', async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const { resourceType } = req.body;
    
    if (!['light', 'medium', 'heavy'].includes(resourceType)) {
      return res.status(400).json({ error: 'Tipo de recurso inválido' });
    }
    
    // Recriar container com novos recursos
    await containerManager.cleanupContainer(clientId);
    await containerManager.createClientContainer(clientId, resourceType);
    
    res.json({ 
      message: 'Recursos redimensionados com sucesso',
      resourceType 
    });
  } catch (error) {
    console.error('❌ Erro ao redimensionar recursos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Renovar timeout do container
app.patch('/api/client/:clientId/renew', async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const containerInfo = containerManager.activeContainers.get(clientId);
    
    if (!containerInfo) {
      return res.status(404).json({ error: 'Container não encontrado' });
    }
    
    // Renovar timeout
    containerManager.setupContainerTimeout(clientId);
    containerInfo.lastActivity = Date.now();
    
    res.json({ 
      message: 'Timeout renovado com sucesso',
      newExpiry: Date.now() + containerManager.maxContainerAge
    });
  } catch (error) {
    console.error('❌ Erro ao renovar timeout:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload de arquivo para análise
app.post('/api/client/:clientId/upload', uploadRateLimit, upload.single('file'), async (req, res) => {
  try {
    // Sanitizar e validar inputs
    const clientId = sanitizeInput(req.params.clientId, 50);
    const documentType = sanitizeInput(req.body.documentType, 20);
    
    // Validações de segurança
    if (!isValidUUID(clientId)) {
      return res.status(400).json({ error: 'Client ID inválido' });
    }
    
    if (!isValidDocumentType(documentType)) {
      return res.status(400).json({ error: 'Tipo de documento inválido' });
    }
    
    console.log('📤 Upload iniciado para cliente:', clientId);
    console.log('📄 Arquivo recebido:', req.file ? sanitizeInput(req.file.originalname, 100) : 'Nenhum arquivo');
    console.log('📋 Document Type:', documentType);
    
    if (!req.file) {
      console.log('❌ Nenhum arquivo fornecido');
      return res.status(400).json({ error: 'Nenhum arquivo fornecido' });
    }
    
    // Criar container se não existir
    if (!containerManager.activeContainers.has(clientId)) {
      console.log('🐳 Criando container para cliente:', clientId);
      await containerManager.createClientContainer(clientId, 'medium');
    }
    
    // Salvar arquivo no container
    const fileName = req.file.originalname;
    const filePath = `/app/uploads/${fileName}`;
    const fileContent = req.file.buffer.toString('base64');
    
    console.log('💾 Salvando arquivo no container:', filePath);
    await containerManager.writeFileToContainer(clientId, filePath, fileContent);
    
    console.log('✅ Upload concluído com sucesso');
    res.json({ 
      message: 'Arquivo enviado com sucesso',
      filePath,
      fileName,
      fileType: req.file.mimetype,
      documentType
    });
  } catch (error) {
    console.error('❌ Erro ao fazer upload:', error);
    res.status(500).json({ error: error.message });
  }
});

// Análise de documento com Claude Code
app.post('/api/client/:clientId/analyze', analyzeRateLimit, async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const { fileName, documentType, analysisType = 'medium' } = req.body;
    
    if (!fileName || !documentType) {
      return res.status(400).json({ error: 'Nome do arquivo e tipo de documento são obrigatórios' });
    }
    
    // Verificar se container existe
    if (!containerManager.activeContainers.has(clientId)) {
      return res.status(404).json({ error: 'Container não encontrado. Faça upload do arquivo primeiro.' });
    }
    
    // Iniciar análise
    const analysisId = uuidv4();
    const filePath = `/app/uploads/${fileName}`;
    
    // Executar análise com Claude Code conversacional
    setImmediate(async () => {
      try {
        // Notificar início da análise
        sendToClient(clientId, {
          type: 'analysis_started',
          analysisId,
          fileName,
          documentType,
          timestamp: new Date().toISOString()
        });
        
        // Determinar template baseado no tipo de documento
        const templatePath = path.join(__dirname, 'analysis-templates', `${documentType}-analysis.md`);
        const localFilePath = path.join(__dirname, '../uploads', fileName);
        
        // Copiar arquivo do container para local (para Claude Code acessar)
        await containerManager.copyFileFromContainer(clientId, filePath, localFilePath);
        
        // Iniciar sessão conversacional Claude Code
        const sessionResult = await claudeConversation.startDocumentAnalysis(
          clientId, 
          localFilePath, 
          documentType, 
          templatePath
        );
        
        const result = sessionResult.initialAnalysis;
        
        // Notificar conclusão
        sendToClient(clientId, {
          type: 'analysis_completed',
          analysisId,
          fileName,
          documentType,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error(`❌ Erro na análise ${analysisId}:`, error);
        sendToClient(clientId, {
          type: 'analysis_error',
          analysisId,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    res.json({ 
      message: 'Análise iniciada com sucesso',
      analysisId,
      fileName,
      documentType,
      estimatedTime: '2-5 minutos'
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar análise:', error);
    res.status(500).json({ error: error.message });
  }
});

// Chat conversacional com documento analisado
app.post('/api/client/:clientId/chat', async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }
    
    // Verificar se container existe
    if (!containerManager.activeContainers.has(clientId)) {
      return res.status(404).json({ error: 'Container não encontrado. Faça upload do arquivo primeiro.' });
    }
    
    const chatId = uuidv4();
    
    // Executar chat conversacional em background
    setImmediate(async () => {
      try {
        // Notificar início do chat
        sendToClient(clientId, {
          type: 'chat_started',
          chatId,
          message,
          timestamp: new Date().toISOString()
        });
        
        // Continuar conversa Claude Code
        const conversationResult = await claudeConversation.continueConversation(clientId, message);
        
        // Notificar resposta completa
        sendToClient(clientId, {
          type: 'chat_completed',
          chatId,
          response: conversationResult.response,
          sessionActive: conversationResult.sessionActive,
          messageCount: conversationResult.messageCount,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error(`❌ Erro no chat ${chatId}:`, error);
        sendToClient(clientId, {
          type: 'chat_error',
          chatId,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    res.json({ 
      message: 'Chat iniciado com sucesso',
      chatId
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar chat:', error);
    res.status(500).json({ error: error.message });
  }
});

// Status da sessão conversacional
app.get('/api/client/:clientId/session', async (req, res) => {
  try {
    const clientId = req.params.clientId;
    
    // Verificar se container existe
    if (!containerManager.activeContainers.has(clientId)) {
      return res.status(404).json({ error: 'Container não encontrado' });
    }
    
    // Obter status da sessão Claude
    const sessionStatus = claudeConversation.getSessionStatus(clientId);
    
    res.json({
      clientId,
      session: sessionStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro ao obter status da sessão:', error);
    res.status(500).json({ error: error.message });
  }
});

// Histórico da conversa
app.get('/api/client/:clientId/history', async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const limit = parseInt(req.query.limit) || 10;
    
    // Verificar se container existe
    if (!containerManager.activeContainers.has(clientId)) {
      return res.status(404).json({ error: 'Container não encontrado' });
    }
    
    // Obter histórico da conversa
    const history = claudeConversation.getConversationHistory(clientId, limit);
    
    res.json({
      clientId,
      history,
      messageCount: history.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro ao obter histórico:', error);
    res.status(500).json({ error: error.message });
  }
});

// Listar arquivos do cliente
app.get('/api/client/:clientId/files', async (req, res) => {
  try {
    const clientId = req.params.clientId;
    
    if (!containerManager.activeContainers.has(clientId)) {
      return res.status(404).json({ error: 'Container não encontrado' });
    }
    
    // Listar arquivos no container
    const files = await containerManager.listFiles(clientId, '/app/uploads');
    
    res.json({ 
      files,
      clientId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro ao listar arquivos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Baixar resultado de análise
app.get('/api/client/:clientId/download/:fileName', async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const fileName = req.params.fileName;
    
    if (!containerManager.activeContainers.has(clientId)) {
      return res.status(404).json({ error: 'Container não encontrado' });
    }
    
    // Ler arquivo do container
    const filePath = `/app/results/${fileName}`;
    const fileContent = await containerManager.readFileFromContainer(clientId, filePath);
    
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(fileContent);
  } catch (error) {
    console.error('❌ Erro ao baixar arquivo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    containers: containerManager.activeContainers.size,
    uptime: process.uptime(),
    claudeCode: process.env.CLAUDE_API_KEY ? 'configured' : 'not configured',
    tunnelActive: process.env.TUNNEL_ACTIVE === 'true'
  });
});

// Métricas do sistema
app.get('/api/metrics', async (req, res) => {
  try {
    const systemMetrics = {
      timestamp: new Date().toISOString(),
      containers: {
        active: containerManager.activeContainers.size,
        total_created: containerManager.totalContainersCreated,
        total_destroyed: containerManager.totalContainersDestroyed,
        max_concurrent: containerManager.maxConcurrentContainers
      },
      resources: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        uptime: process.uptime()
      },
      docker: {
        connected: true, // Simplificado - poderia verificar conexão real
        version: await this.docker.version().catch(() => null)
      }
    };

    res.json(systemMetrics);
  } catch (error) {
    console.error('❌ Erro ao obter métricas:', error);
    res.status(500).json({ error: 'Erro ao obter métricas do sistema' });
  }
});

// Histórico de estatísticas de um container
app.get('/api/client/:clientId/history', async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const history = containerManager.containerHistory.get(clientId) || [];
    
    res.json({
      clientId,
      history,
      count: history.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro ao obter histórico:', error);
    res.status(500).json({ error: 'Erro ao obter histórico' });
  }
});

// Servir frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Limpeza automática de containers
setInterval(async () => {
  try {
    const cleaned = await containerManager.cleanupOldContainers();
    if (cleaned > 0) {
      console.log(`🧹 Limpeza automática: ${cleaned} containers removidos`);
    }
  } catch (error) {
    console.error('❌ Erro na limpeza automática:', error);
  }
}, 10 * 60 * 1000); // A cada 10 minutos

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Claude Code Orchestrator rodando na porta ${PORT}`);
  console.log(`📡 WebSocket servidor rodando na porta 8080`);
  console.log(`🐳 Docker integration ativo`);
  console.log(`🎯 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Encerrando Claude Code Orchestrator...');
  
  // Limpar todos os containers
  const activeClients = Array.from(containerManager.activeContainers.keys());
  console.log(`🔄 Limpando ${activeClients.length} containers ativos...`);
  
  for (const clientId of activeClients) {
    await containerManager.cleanupContainer(clientId);
  }
  
  // Fechar conexões WebSocket
  for (const [clientId, connection] of clientConnections.entries()) {
    connection.close();
  }
  
  wss.close();
  
  console.log('✅ Servidor encerrado com sucesso');
  process.exit(0);
});