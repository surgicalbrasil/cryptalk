/**
 * Serviço Central de Configuração
 * Remove hardcoded values e centraliza toda configuração
 */

import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs/promises';

// Carregar variáveis de ambiente
config();

export interface AppConfig {
  app: {
    port: number;
    env: 'development' | 'production' | 'test';
    name: string;
    version: string;
  };
  docker: {
    image: string;
    networkMode: string;
    maxConcurrent: number;
    maxAge: number;
    cleanup: {
      interval: number;
      enabled: boolean;
    };
    resources: {
      light: ResourceLimits;
      medium: ResourceLimits;
      heavy: ResourceLimits;
    };
  };
  claude: {
    apiKey: string;
    command: string;
    sessionTimeout: number;
    analysisTimeout: number;
    maxSessions: number;
    templates: {
      path: string;
      cache: boolean;
    };
  };
  upload: {
    maxFileSize: number;
    uploadPath: string;
    tempPath: string;
    allowedTypes: Record<string, DocumentTypeConfig>;
    cleanup: {
      interval: number;
      maxAge: number;
    };
  };
  websocket: {
    port: number;
    host: string;
    heartbeatInterval: number;
    reconnectAttempts: number;
    reconnectDelay: number;
    messageQueueSize: number;
    compression: boolean;
  };
  security: {
    rateLimit: {
      windowMs: number;
      max: number;
      enabled: boolean;
    };
    cors: {
      origin: string[];
      credentials: boolean;
    };
    validation: {
      enabled: boolean;
      strict: boolean;
    };
  };
  database?: {
    postgres?: {
      host: string;
      port: number;
      database: string;
      username: string;
      password: string;
    };
    redis?: {
      host: string;
      port: number;
      password?: string;
      db: number;
    };
  };
  monitoring?: {
    prometheus?: {
      enabled: boolean;
      port: number;
    };
    grafana?: {
      enabled: boolean;
      port: number;
    };
  };
}

interface ResourceLimits {
  cpuLimit: string;
  memoryLimit: string;
  swapLimit: string;
}

interface DocumentTypeConfig {
  extensions: string[];
  maxSize: number;
  mimeTypes: string[];
}

export class ConfigService {
  private static instance: ConfigService;
  private config: AppConfig;
  private configPath: string;

  private constructor() {
    this.configPath = process.env.CONFIG_PATH || path.join(__dirname, '../../../3-config');
    this.config = this.loadDefaultConfig();
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * Carrega configuração padrão com fallbacks seguros
   */
  private loadDefaultConfig(): AppConfig {
    return {
      app: {
        port: Number(process.env.PORT) || 3002,
        env: (process.env.NODE_ENV as any) || 'development',
        name: 'CrypTalk',
        version: '1.0.0'
      },
      docker: {
        image: process.env.DOCKER_IMAGE || 'claude-user-env:latest',
        networkMode: process.env.DOCKER_NETWORK || 'bridge',
        maxConcurrent: Number(process.env.MAX_CONTAINERS) || 10,
        maxAge: Number(process.env.CONTAINER_MAX_AGE) || 1800000, // 30 min
        cleanup: {
          interval: 300000, // 5 min
          enabled: true
        },
        resources: {
          light: {
            cpuLimit: '0.5',
            memoryLimit: '512m',
            swapLimit: '256m'
          },
          medium: {
            cpuLimit: '1.0',
            memoryLimit: '1g',
            swapLimit: '512m'
          },
          heavy: {
            cpuLimit: '2.0',
            memoryLimit: '2g',
            swapLimit: '1g'
          }
        }
      },
      claude: {
        apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '',
        command: process.env.CLAUDE_COMMAND || 'claude',
        sessionTimeout: Number(process.env.SESSION_TIMEOUT) || 1800000, // 30 min
        analysisTimeout: Number(process.env.ANALYSIS_TIMEOUT) || 300000, // 5 min
        maxSessions: Number(process.env.MAX_SESSIONS) || 50,
        templates: {
          path: path.join(this.configPath, '../6-docs/analysis-structures'),
          cache: true
        }
      },
      upload: {
        maxFileSize: Number(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB
        uploadPath: process.env.UPLOAD_PATH || path.join(this.configPath, '../5-storage/uploads'),
        tempPath: process.env.TEMP_PATH || '/tmp/cryptalk-uploads',
        allowedTypes: {
          'pitch-deck': {
            extensions: ['.pdf', '.ppt', '.pptx'],
            maxSize: 50 * 1024 * 1024,
            mimeTypes: ['application/pdf', 'application/vnd.ms-powerpoint']
          },
          'financial': {
            extensions: ['.pdf', '.xls', '.xlsx', '.csv'],
            maxSize: 25 * 1024 * 1024,
            mimeTypes: ['application/pdf', 'application/vnd.ms-excel']
          },
          'legal': {
            extensions: ['.pdf', '.doc', '.docx'],
            maxSize: 20 * 1024 * 1024,
            mimeTypes: ['application/pdf', 'application/msword']
          },
          'technical': {
            extensions: ['.pdf', '.md', '.doc', '.docx'],
            maxSize: 30 * 1024 * 1024,
            mimeTypes: ['application/pdf', 'text/markdown']
          },
          'patent': {
            extensions: ['.pdf', '.doc', '.docx'],
            maxSize: 15 * 1024 * 1024,
            mimeTypes: ['application/pdf', 'application/msword']
          }
        },
        cleanup: {
          interval: 3600000, // 1 hora
          maxAge: 7200000   // 2 horas
        }
      },
      websocket: {
        port: Number(process.env.WS_PORT) || 8080,
        host: process.env.WS_HOST || '0.0.0.0',
        heartbeatInterval: Number(process.env.WS_HEARTBEAT) || 30000,
        reconnectAttempts: Number(process.env.WS_RECONNECT_ATTEMPTS) || 5,
        reconnectDelay: Number(process.env.WS_RECONNECT_DELAY) || 3000,
        messageQueueSize: Number(process.env.WS_QUEUE_SIZE) || 100,
        compression: process.env.WS_COMPRESSION === 'true'
      },
      security: {
        rateLimit: {
          windowMs: Number(process.env.RATE_LIMIT_WINDOW) || 900000, // 15 min
          max: Number(process.env.RATE_LIMIT_MAX) || 100,
          enabled: process.env.RATE_LIMIT_ENABLED !== 'false'
        },
        cors: {
          origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
          credentials: process.env.CORS_CREDENTIALS === 'true'
        },
        validation: {
          enabled: process.env.VALIDATION_ENABLED !== 'false',
          strict: process.env.VALIDATION_STRICT === 'true'
        }
      }
    };
  }

  /**
   * Carrega configuração de arquivo externo
   */
  public async loadFromFile(configPath?: string): Promise<void> {
    try {
      const filePath = configPath || path.join(this.configPath, 'app-config.json');
      const fileContent = await fs.readFile(filePath, 'utf8');
      const fileConfig = JSON.parse(fileContent);
      
      // Merge com configuração padrão
      this.config = this.mergeConfigs(this.config, fileConfig);
      
      console.log(`✅ Configuração carregada de: ${filePath}`);
    } catch (error) {
      console.warn(`⚠️ Não foi possível carregar arquivo de configuração: ${error}`);
      console.log('📋 Usando configuração padrão com variáveis de ambiente');
    }
  }

  /**
   * Salva configuração atual em arquivo
   */
  public async saveToFile(configPath?: string): Promise<void> {
    try {
      const filePath = configPath || path.join(this.configPath, 'app-config.json');
      await fs.writeFile(filePath, JSON.stringify(this.config, null, 2));
      console.log(`✅ Configuração salva em: ${filePath}`);
    } catch (error) {
      console.error(`❌ Erro ao salvar configuração: ${error}`);
    }
  }

  /**
   * Valida configuração atual
   */
  public validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validar configurações críticas
    if (!this.config.claude.apiKey) {
      errors.push('Claude API Key não configurada (ANTHROPIC_API_KEY ou CLAUDE_API_KEY)');
    }

    if (this.config.docker.maxConcurrent <= 0) {
      errors.push('Número máximo de containers deve ser maior que 0');
    }

    if (this.config.upload.maxFileSize <= 0) {
      errors.push('Tamanho máximo de arquivo deve ser maior que 0');
    }

    if (this.config.websocket.port < 1024 || this.config.websocket.port > 65535) {
      errors.push('Porta WebSocket deve estar entre 1024 e 65535');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Obtém configuração completa
   */
  public getConfig(): AppConfig {
    return JSON.parse(JSON.stringify(this.config)); // Deep clone
  }

  /**
   * Obtém configuração específica por módulo
   */
  public getModuleConfig<K extends keyof AppConfig>(module: K): AppConfig[K] {
    return JSON.parse(JSON.stringify(this.config[module]));
  }

  /**
   * Atualiza configuração de módulo específico
   */
  public updateModuleConfig<K extends keyof AppConfig>(
    module: K, 
    updates: Partial<AppConfig[K]>
  ): void {
    this.config[module] = { ...this.config[module], ...updates };
  }

  /**
   * Reload configuração (útil para hot-reload)
   */
  public async reload(): Promise<void> {
    this.config = this.loadDefaultConfig();
    await this.loadFromFile();
  }

  /**
   * Obtém informações de ambiente
   */
  public getEnvironmentInfo(): {
    nodeEnv: string;
    nodeVersion: string;
    platform: string;
    arch: string;
    pid: number;
    uptime: number;
  } {
    return {
      nodeEnv: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      uptime: process.uptime()
    };
  }

  /**
   * Merge recursivo de configurações
   */
  private mergeConfigs(base: any, override: any): any {
    const result = { ...base };
    
    for (const key in override) {
      if (override[key] && typeof override[key] === 'object' && !Array.isArray(override[key])) {
        result[key] = this.mergeConfigs(result[key] || {}, override[key]);
      } else {
        result[key] = override[key];
      }
    }
    
    return result;
  }
}

// Factory function para facilitar uso
export function createConfigService(): ConfigService {
  return ConfigService.getInstance();
}

// Singleton instance para exports diretos
export const configService = ConfigService.getInstance();