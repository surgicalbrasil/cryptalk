/**
 * Configuração do Sistema de Orquestração de Containers
 */

module.exports = {
  // Configurações do servidor
  server: {
    port: process.env.PORT || 3000,
    websocketPort: process.env.WS_PORT || 8080,
    environment: process.env.NODE_ENV || 'development',
    cors: {
      allowedOrigins: [
        'http://localhost:3000',
        'http://localhost:5173',
        'https://localhost:3000',
        'https://localhost:5173',
        process.env.TUNNEL_URL
      ].filter(Boolean),
      credentials: true
    }
  },

  // Configurações dos containers
  containers: {
    image: 'claude-user-env:latest',
    networkMode: 'claude-network',
    maxConcurrent: parseInt(process.env.MAX_CONTAINERS) || 10,
    maxAge: 30 * 60 * 1000, // 30 minutos
    
    // Configurações de recursos por tipo
    resources: {
      light: {
        memory: 256 * 1024 * 1024, // 256MB
        memorySwap: 256 * 1024 * 1024,
        cpuQuota: 25000, // 25% CPU
        pidsLimit: 50
      },
      medium: {
        memory: 512 * 1024 * 1024, // 512MB
        memorySwap: 512 * 1024 * 1024,
        cpuQuota: 50000, // 50% CPU
        pidsLimit: 100
      },
      heavy: {
        memory: 1024 * 1024 * 1024, // 1GB
        memorySwap: 1024 * 1024 * 1024,
        cpuQuota: 100000, // 100% CPU
        pidsLimit: 200
      }
    },

    // Configurações de segurança
    security: {
      securityOpts: [
        'no-new-privileges:true',
        'seccomp:unconfined',
        'apparmor:unconfined'
      ],
      capDrop: ['ALL'],
      capAdd: ['CHOWN', 'SETUID', 'SETGID', 'DAC_OVERRIDE'],
      readonlyRootfs: false,
      tmpfs: {
        '/tmp': 'size=200m,noexec,nosuid,nodev',
        '/run': 'size=100m,noexec,nosuid,nodev',
        '/var/tmp': 'size=100m,noexec,nosuid,nodev'
      },
      ulimits: [
        { Name: 'nofile', Soft: 1024, Hard: 2048 },
        { Name: 'nproc', Soft: 100, Hard: 200 }
      ]
    }
  },

  // Configurações de monitoramento
  monitoring: {
    statsInterval: 5000, // 5 segundos
    historySize: 100,
    alertCooldown: 5 * 60 * 1000, // 5 minutos
    
    // Limites para alertas
    thresholds: {
      cpu: 80, // 80% CPU
      memory: 85, // 85% memória
      disk: 90, // 90% disco
      networkRx: 100 * 1024 * 1024, // 100MB/s
      networkTx: 100 * 1024 * 1024  // 100MB/s
    }
  },

  // Configurações de rate limiting
  rateLimit: {
    create: {
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 10, // 10 criações por IP
      message: 'Muitas solicitações de criação de containers'
    },
    general: {
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 100, // 100 requests por IP
      message: 'Muitas solicitações'
    },
    analysis: {
      windowMs: 5 * 60 * 1000, // 5 minutos
      max: 20, // 20 análises por IP
      message: 'Muitas solicitações de análise'
    }
  },

  // Configurações do Claude API
  claude: {
    apiKey: process.env.CLAUDE_API_KEY,
    model: process.env.CLAUDE_MODEL || 'claude-3-sonnet-20240229',
    maxTokens: parseInt(process.env.CLAUDE_MAX_TOKENS) || 4000,
    temperature: parseFloat(process.env.CLAUDE_TEMPERATURE) || 0.7
  },

  // Configurações de logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
    maxFiles: 5,
    maxSize: '10m'
  },

  // Configurações de limpeza automática
  cleanup: {
    interval: 10 * 60 * 1000, // 10 minutos
    forceKillTimeout: 30 * 1000, // 30 segundos
    orphanedContainerAge: 60 * 60 * 1000 // 1 hora
  },

  // Configurações de backup
  backup: {
    enabled: process.env.BACKUP_ENABLED === 'true',
    interval: 24 * 60 * 60 * 1000, // 24 horas
    retention: 7, // 7 dias
    path: process.env.BACKUP_PATH || '/app/backups'
  }
};