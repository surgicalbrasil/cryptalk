/**
 * Docker Manager
 * Responsabilidade única: Gerenciar containers Docker para clientes
 * Extraído do orchestrator.js para simplificar arquitetura
 */

const Docker = require('dockerode');
const path = require('path');
const tar = require('tar-stream');
const { v4: uuidv4 } = require('uuid');

class DockerManager {
  constructor() {
    this.docker = new Docker();
    this.containers = new Map(); // clientId -> container info
    this.config = this.loadConfig();
    this.stats = {
      totalCreated: 0,
      totalDestroyed: 0,
      activeContainers: 0
    };
    
    // Limpeza automática a cada 10 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredContainers();
    }, 10 * 60 * 1000);
  }

  loadConfig() {
    return {
      image: 'claude-user-env:latest',
      networkMode: 'claude-network',
      maxConcurrent: parseInt(process.env.MAX_CONTAINERS) || 10,
      maxAge: 30 * 60 * 1000, // 30 minutos
      
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
    };
  }

  /**
   * Criar container para cliente
   */
  async createClientContainer(clientId, resourceType = 'medium') {
    try {
      // Verificar limite de containers
      if (this.containers.size >= this.config.maxConcurrent) {
        throw new Error('Limite de containers simultâneos atingido');
      }

      // Verificar se já existe container para cliente
      if (this.containers.has(clientId)) {
        await this.destroyClientContainer(clientId);
      }

      const containerName = `claude-client-${clientId}`;
      const resources = this.config.resources[resourceType];

      console.log(`🐳 Criando container para cliente ${clientId} (${resourceType})`);

      // Configuração do container
      const containerConfig = {
        Image: this.config.image,
        name: containerName,
        Env: [
          `CLIENT_ID=${clientId}`,
          `RESOURCE_TYPE=${resourceType}`,
          `CREATED_AT=${Date.now()}`
        ],
        WorkingDir: '/app',
        
        // Recursos
        HostConfig: {
          Memory: resources.memory,
          MemorySwap: resources.memorySwap,
          CpuQuota: resources.cpuQuota,
          PidsLimit: resources.pidsLimit,
          NetworkMode: this.config.networkMode,
          
          // Segurança
          SecurityOpt: this.config.security.securityOpts,
          CapDrop: this.config.security.capDrop,
          CapAdd: this.config.security.capAdd,
          ReadonlyRootfs: this.config.security.readonlyRootfs,
          Tmpfs: this.config.security.tmpfs,
          Ulimits: this.config.security.ulimits,
          
          // Volumes temporários
          Binds: [
            `/tmp/claude-clients/${clientId}:/app/workspace:rw`
          ],
          
          // Auto-remove quando parar
          AutoRemove: true
        },

        // Labels para identificação
        Labels: {
          'com.cryptalk.client-id': clientId,
          'com.cryptalk.resource-type': resourceType,
          'com.cryptalk.created-at': Date.now().toString(),
          'com.cryptalk.managed': 'true'
        }
      };

      // Criar container
      const container = await this.docker.createContainer(containerConfig);
      await container.start();

      // Aguardar container ficar pronto
      await this.waitForContainer(container);

      // Armazenar informações
      const containerInfo = {
        id: container.id,
        clientId,
        containerName,
        resourceType,
        container,
        createdAt: Date.now(),
        lastActivity: Date.now()
      };

      this.containers.set(clientId, containerInfo);
      this.stats.totalCreated++;
      this.stats.activeContainers = this.containers.size;

      // Configurar timeout automático
      this.setupContainerTimeout(clientId);

      console.log(`✅ Container criado: ${containerName}`);
      return containerInfo;

    } catch (error) {
      console.error(`❌ Erro criando container para ${clientId}:`, error);
      throw error;
    }
  }

  /**
   * Aguardar container ficar pronto
   */
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
    
    throw new Error('Container não ficou pronto dentro do timeout');
  }

  /**
   * Copiar arquivo para container
   */
  async copyFileToContainer(clientId, fileBuffer, fileName, destinationPath = '/app/workspace') {
    const containerInfo = this.containers.get(clientId);
    if (!containerInfo) {
      throw new Error(`Container não encontrado para cliente: ${clientId}`);
    }

    try {
      console.log(`📁 Copiando arquivo ${fileName} para container ${clientId}`);

      // Criar tar stream
      const pack = tar.pack();
      pack.entry({ name: fileName }, fileBuffer);
      pack.finalize();

      // Copiar para container
      await containerInfo.container.putArchive(pack, {
        path: destinationPath
      });

      // Atualizar última atividade
      containerInfo.lastActivity = Date.now();

      console.log(`✅ Arquivo copiado: ${destinationPath}/${fileName}`);
      return `${destinationPath}/${fileName}`;

    } catch (error) {
      console.error(`❌ Erro copiando arquivo para container ${clientId}:`, error);
      throw error;
    }
  }

  /**
   * Copiar arquivo do container
   */
  async copyFileFromContainer(clientId, sourcePath, destinationPath) {
    const containerInfo = this.containers.get(clientId);
    if (!containerInfo) {
      throw new Error(`Container não encontrado para cliente: ${clientId}`);
    }

    try {
      console.log(`📁 Copiando arquivo do container ${clientId}: ${sourcePath}`);

      const stream = await containerInfo.container.getArchive({
        path: sourcePath
      });

      // Extrair arquivo do tar stream
      const extract = tar.extract();
      
      return new Promise((resolve, reject) => {
        extract.on('entry', (header, stream, next) => {
          const chunks = [];
          
          stream.on('data', chunk => chunks.push(chunk));
          stream.on('end', () => {
            const fileBuffer = Buffer.concat(chunks);
            require('fs').writeFileSync(destinationPath, fileBuffer);
            resolve(destinationPath);
            next();
          });
          
          stream.resume();
        });

        extract.on('finish', () => {
          console.log(`✅ Arquivo copiado do container: ${destinationPath}`);
        });

        extract.on('error', reject);
        stream.pipe(extract);
      });

    } catch (error) {
      console.error(`❌ Erro copiando arquivo do container ${clientId}:`, error);
      throw error;
    }
  }

  /**
   * Executar comando no container
   */
  async execInContainer(clientId, command, workingDir = '/app/workspace') {
    const containerInfo = this.containers.get(clientId);
    if (!containerInfo) {
      throw new Error(`Container não encontrado para cliente: ${clientId}`);
    }

    try {
      const exec = await containerInfo.container.exec({
        Cmd: ['sh', '-c', command],
        AttachStdout: true,
        AttachStderr: true,
        WorkingDir: workingDir
      });

      const stream = await exec.start({ Detach: false });
      
      return new Promise((resolve, reject) => {
        let output = '';
        
        stream.on('data', (data) => {
          output += data.toString();
        });
        
        stream.on('end', () => {
          resolve(output);
        });
        
        stream.on('error', reject);
      });

    } catch (error) {
      console.error(`❌ Erro executando comando no container ${clientId}:`, error);
      throw error;
    }
  }

  /**
   * Obter estatísticas do container
   */
  async getContainerStats(clientId) {
    const containerInfo = this.containers.get(clientId);
    if (!containerInfo) {
      throw new Error(`Container não encontrado para cliente: ${clientId}`);
    }

    try {
      const stats = await containerInfo.container.stats({ stream: false });
      return {
        cpu: this.calculateCpuPercent(stats),
        memory: this.calculateMemoryUsage(stats),
        network: stats.networks,
        uptime: Date.now() - containerInfo.createdAt
      };
    } catch (error) {
      console.error(`❌ Erro obtendo stats do container ${clientId}:`, error);
      throw error;
    }
  }

  /**
   * Destruir container do cliente
   */
  async destroyClientContainer(clientId) {
    const containerInfo = this.containers.get(clientId);
    if (!containerInfo) {
      return false;
    }

    try {
      console.log(`🗑️ Destruindo container para cliente ${clientId}`);

      // Parar container
      try {
        await containerInfo.container.stop({ t: 10 });
      } catch (error) {
        // Container pode já estar parado
      }

      // Remover container
      try {
        await containerInfo.container.remove({ force: true });
      } catch (error) {
        // Container pode já estar removido
      }

      // Limpar timeout
      if (containerInfo.timeout) {
        clearTimeout(containerInfo.timeout);
      }

      // Remover do registro
      this.containers.delete(clientId);
      this.stats.totalDestroyed++;
      this.stats.activeContainers = this.containers.size;

      console.log(`✅ Container destruído: ${containerInfo.containerName}`);
      return true;

    } catch (error) {
      console.error(`❌ Erro destruindo container ${clientId}:`, error);
      return false;
    }
  }

  /**
   * Configurar timeout automático do container
   */
  setupContainerTimeout(clientId) {
    const containerInfo = this.containers.get(clientId);
    if (!containerInfo) return;

    // Limpar timeout anterior
    if (containerInfo.timeout) {
      clearTimeout(containerInfo.timeout);
    }

    // Configurar novo timeout
    containerInfo.timeout = setTimeout(() => {
      console.log(`⏰ Container ${clientId} expirou, destruindo...`);
      this.destroyClientContainer(clientId);
    }, this.config.maxAge);
  }

  /**
   * Limpar containers expirados
   */
  async cleanupExpiredContainers() {
    const now = Date.now();
    const expiredContainers = [];

    for (const [clientId, containerInfo] of this.containers) {
      const age = now - containerInfo.lastActivity;
      if (age > this.config.maxAge) {
        expiredContainers.push(clientId);
      }
    }

    if (expiredContainers.length > 0) {
      console.log(`🧹 Limpando ${expiredContainers.length} containers expirados`);
      
      for (const clientId of expiredContainers) {
        await this.destroyClientContainer(clientId);
      }
    }
  }

  /**
   * Obter status do Docker Manager
   */
  getStatus() {
    return {
      activeContainers: this.containers.size,
      maxConcurrent: this.config.maxConcurrent,
      stats: this.stats,
      containers: Array.from(this.containers.entries()).map(([clientId, info]) => ({
        clientId,
        resourceType: info.resourceType,
        age: Date.now() - info.createdAt,
        lastActivity: Date.now() - info.lastActivity
      }))
    };
  }

  /**
   * Calcular porcentagem de CPU
   */
  calculateCpuPercent(stats) {
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - 
                    stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - 
                       stats.precpu_stats.system_cpu_usage;
    
    if (systemDelta > 0 && cpuDelta > 0) {
      return (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100;
    }
    return 0;
  }

  /**
   * Calcular uso de memória
   */
  calculateMemoryUsage(stats) {
    const used = stats.memory_stats.usage - (stats.memory_stats.stats?.cache || 0);
    const available = stats.memory_stats.limit;
    
    return {
      used: used,
      available: available,
      percent: (used / available) * 100
    };
  }

  /**
   * Destruir todos os containers
   */
  async destroyAll() {
    console.log('🗑️ Destruindo todos os containers...');
    
    const clientIds = Array.from(this.containers.keys());
    for (const clientId of clientIds) {
      await this.destroyClientContainer(clientId);
    }
    
    // Limpar interval de cleanup
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

module.exports = DockerManager;