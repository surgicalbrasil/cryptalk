/**
 * Container Manager - Gerenciamento de Containers Docker
 * Responsabilidade única: Gerenciar ciclo de vida dos containers
 * Zero acoplamento com HTTP/WebSocket
 */

import { EventEmitter } from 'events';
import Docker, { Container } from 'dockerode';
import { ContainerInfo, ContainerConfig, ContainerStats } from '../../core/interfaces/IDockerService';

export interface ContainerManagerConfig {
  maxConcurrentContainers: number;
  maxContainerAge: number;
  cleanupInterval: number;
  defaultImage: string;
  defaultNetworkMode: string;
  resourceConfigs: Record<string, any>;
  securityConfig: any;
}

interface ActiveContainer {
  container: Container;
  info: ContainerInfo;
  timeout?: NodeJS.Timeout;
  volumes: string[];
}

export class ContainerManager extends EventEmitter {
  private docker: Docker;
  private activeContainers = new Map<string, ActiveContainer>();
  private config: ContainerManagerConfig;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: ContainerManagerConfig) {
    super();
    this.docker = new Docker();
    this.config = config;
    this.setupCleanupTimer();
  }

  /**
   * Criar container para cliente
   */
  async createContainer(clientId: string, containerConfig: ContainerConfig = {}): Promise<ContainerInfo> {
    try {
      // Verificar limite de containers
      if (this.activeContainers.size >= this.config.maxConcurrentContainers) {
        throw new Error('Limite máximo de containers atingido');
      }

      // Verificar se já existe container para cliente
      if (this.activeContainers.has(clientId)) {
        await this.destroyContainer(clientId);
      }

      const containerName = `claude-client-${clientId}`;
      const resourceType = containerConfig.resourceType || 'medium';
      const resources = this.config.resourceConfigs[resourceType];

      if (!resources) {
        throw new Error(`Tipo de recurso inválido: ${resourceType}`);
      }

      // Criar volumes para o cliente
      const volumes = await this.createVolumes(clientId);

      // Configuração do container
      const dockerConfig = {
        Image: containerConfig.image || this.config.defaultImage,
        name: containerName,
        Env: this.buildEnvironmentVariables(clientId, containerConfig.env),
        WorkingDir: containerConfig.workDir || '/app',
        
        // Configuração de recursos
        HostConfig: {
          Memory: resources.memory,
          MemorySwap: resources.memorySwap,
          CpuQuota: resources.cpuQuota,
          PidsLimit: resources.pidsLimit,
          NetworkMode: containerConfig.networkMode || this.config.defaultNetworkMode,
          
          // Configuração de segurança
          SecurityOpt: this.config.securityConfig.securityOpts,
          CapDrop: this.config.securityConfig.capDrop,
          CapAdd: this.config.securityConfig.capAdd,
          ReadonlyRootfs: this.config.securityConfig.readonlyRootfs,
          Tmpfs: this.config.securityConfig.tmpfs,
          Ulimits: this.config.securityConfig.ulimits,
          
          // Volumes
          Binds: this.buildVolumeBinds(clientId, volumes, containerConfig.volumes),
          
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

      // Criar e iniciar container
      const container = await this.docker.createContainer(dockerConfig);
      await container.start();

      // Aguardar container ficar pronto
      await this.waitForContainer(container);

      // Criar informações do container
      const containerInfo: ContainerInfo = {
        containerId: container.id,
        clientId,
        status: 'running',
        createdAt: new Date(),
        lastActivity: new Date(),
        resourceType,
        config: containerConfig
      };

      // Armazenar container ativo
      const activeContainer: ActiveContainer = {
        container,
        info: containerInfo,
        volumes
      };

      this.activeContainers.set(clientId, activeContainer);

      // Configurar timeout automático
      this.setupContainerTimeout(clientId);

      // Emitir evento
      this.emit('container-created', { clientId, containerInfo });

      return containerInfo;

    } catch (error) {
      this.emit('error', { 
        operation: 'createContainer', 
        clientId, 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Destruir container do cliente
   */
  async destroyContainer(clientId: string, force: boolean = false): Promise<void> {
    const activeContainer = this.activeContainers.get(clientId);
    if (!activeContainer) {
      return;
    }

    try {
      const { container, timeout, volumes } = activeContainer;

      // Limpar timeout
      if (timeout) {
        clearTimeout(timeout);
      }

      // Parar container
      try {
        await container.stop({ t: force ? 5 : 10 });
      } catch (error) {
        // Container pode já estar parado
      }

      // Remover container
      try {
        await container.remove({ force });
      } catch (error) {
        // Container pode já estar removido
      }

      // Remover volumes
      await this.removeVolumes(volumes);

      // Remover do registro
      this.activeContainers.delete(clientId);

      // Emitir evento
      this.emit('container-destroyed', { clientId, forced: force });

    } catch (error) {
      this.emit('error', { 
        operation: 'destroyContainer', 
        clientId, 
        error: error instanceof Error ? error.message : String(error)
      });
      
      if (!force) {
        // Tentar destruição forçada
        await this.destroyContainer(clientId, true);
      } else {
        throw error;
      }
    }
  }

  /**
   * Reiniciar container
   */
  async restartContainer(clientId: string): Promise<void> {
    const activeContainer = this.activeContainers.get(clientId);
    if (!activeContainer) {
      throw new Error(`Container não encontrado para cliente: ${clientId}`);
    }

    try {
      await activeContainer.container.restart();
      activeContainer.info.lastActivity = new Date();
      
      // Reconfigurar timeout
      this.setupContainerTimeout(clientId);

      this.emit('container-restarted', { clientId });

    } catch (error) {
      this.emit('error', { 
        operation: 'restartContainer', 
        clientId, 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Obter status do container
   */
  async getContainerStatus(clientId: string): Promise<'running' | 'stopped' | 'error' | 'not_found'> {
    const activeContainer = this.activeContainers.get(clientId);
    if (!activeContainer) {
      return 'not_found';
    }

    try {
      const info = await activeContainer.container.inspect();
      if (info.State.Running) {
        return 'running';
      } else if (info.State.Status === 'exited') {
        return 'stopped';
      } else {
        return 'error';
      }
    } catch (error) {
      return 'error';
    }
  }

  /**
   * Obter estatísticas do container
   */
  async getContainerStats(clientId: string): Promise<ContainerStats> {
    const activeContainer = this.activeContainers.get(clientId);
    if (!activeContainer) {
      throw new Error(`Container não encontrado para cliente: ${clientId}`);
    }

    try {
      const stats = await activeContainer.container.stats({ stream: false });
      return this.parseContainerStats(stats);
    } catch (error) {
      this.emit('error', { 
        operation: 'getContainerStats', 
        clientId, 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Obter informações do container
   */
  getContainerInfo(clientId: string): ContainerInfo | null {
    const activeContainer = this.activeContainers.get(clientId);
    return activeContainer ? { ...activeContainer.info } : null;
  }

  /**
   * Renovar timeout do container
   */
  renewContainer(clientId: string): void {
    const activeContainer = this.activeContainers.get(clientId);
    if (!activeContainer) {
      throw new Error(`Container não encontrado para cliente: ${clientId}`);
    }

    activeContainer.info.lastActivity = new Date();
    this.setupContainerTimeout(clientId);
  }

  /**
   * Limpar containers expirados
   */
  async cleanupExpiredContainers(): Promise<number> {
    const now = Date.now();
    const expiredContainers: string[] = [];

    for (const [clientId, activeContainer] of this.activeContainers) {
      const age = now - activeContainer.info.lastActivity.getTime();
      if (age > this.config.maxContainerAge) {
        expiredContainers.push(clientId);
      }
    }

    for (const clientId of expiredContainers) {
      try {
        await this.destroyContainer(clientId);
      } catch (error) {
        this.emit('error', { 
          operation: 'cleanupExpiredContainers', 
          clientId, 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return expiredContainers.length;
  }

  /**
   * Obter container Docker
   */
  getDockerContainer(clientId: string): Container | null {
    const activeContainer = this.activeContainers.get(clientId);
    return activeContainer ? activeContainer.container : null;
  }

  /**
   * Listar containers ativos
   */
  listActiveContainers(): ContainerInfo[] {
    return Array.from(this.activeContainers.values()).map(ac => ({ ...ac.info }));
  }

  /**
   * Destruir todos os containers
   */
  async destroyAll(): Promise<void> {
    const clientIds = Array.from(this.activeContainers.keys());
    
    await Promise.all(
      clientIds.map(clientId => this.destroyContainer(clientId, true))
    );

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  // Métodos privados

  private setupCleanupTimer(): void {
    this.cleanupTimer = setInterval(
      () => this.cleanupExpiredContainers().catch(error => 
        this.emit('error', { operation: 'automaticCleanup', error: error.message })
      ),
      this.config.cleanupInterval
    );
  }

  private async waitForContainer(container: Container, maxWait: number = 10000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      try {
        const info = await container.inspect();
        if (info.State.Running) {
          return;
        }
      } catch (error) {
        // Container ainda não está pronto
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    throw new Error('Container não ficou pronto dentro do timeout');
  }

  private async createVolumes(clientId: string): Promise<string[]> {
    const volumes = [
      `claude-data-${clientId}`,
      `claude-uploads-${clientId}`,
      `claude-logs-${clientId}`
    ];

    for (const volumeName of volumes) {
      try {
        await this.docker.createVolume({
          Name: volumeName,
          Driver: 'local',
          Labels: {
            'com.cryptalk.client-id': clientId,
            'com.cryptalk.created-at': Date.now().toString(),
            'com.cryptalk.managed': 'true'
          }
        });
      } catch (error: any) {
        if (!error.message?.includes('already exists')) {
          throw error;
        }
      }
    }

    return volumes;
  }

  private async removeVolumes(volumes: string[]): Promise<void> {
    for (const volumeName of volumes) {
      try {
        await this.docker.getVolume(volumeName).remove({ force: true });
      } catch (error) {
        // Volume pode já estar removido ou não existir
      }
    }
  }

  private buildEnvironmentVariables(clientId: string, customEnv?: Record<string, string>): string[] {
    const baseEnv = [
      `CLIENT_ID=${clientId}`,
      `CREATED_AT=${Date.now()}`,
      'NODE_ENV=production',
      'DEBIAN_FRONTEND=noninteractive'
    ];

    if (customEnv) {
      Object.entries(customEnv).forEach(([key, value]) => {
        baseEnv.push(`${key}=${value}`);
      });
    }

    return baseEnv;
  }

  private buildVolumeBinds(
    clientId: string, 
    volumes: string[], 
    customVolumes?: Array<{ host: string; container: string; mode?: 'ro' | 'rw' }>
  ): string[] {
    const binds = [
      `${volumes[0]}:/app/data`,
      `${volumes[1]}:/app/uploads`,
      `${volumes[2]}:/app/logs`,
      `/tmp/claude-clients/${clientId}:/app/workspace:rw`
    ];

    if (customVolumes) {
      customVolumes.forEach(vol => {
        const mode = vol.mode || 'rw';
        binds.push(`${vol.host}:${vol.container}:${mode}`);
      });
    }

    return binds;
  }

  private setupContainerTimeout(clientId: string): void {
    const activeContainer = this.activeContainers.get(clientId);
    if (!activeContainer) return;

    // Limpar timeout anterior
    if (activeContainer.timeout) {
      clearTimeout(activeContainer.timeout);
    }

    // Configurar novo timeout
    activeContainer.timeout = setTimeout(async () => {
      this.emit('container-expired', { clientId });
      try {
        await this.destroyContainer(clientId);
      } catch (error) {
        this.emit('error', { 
          operation: 'autoDestroy', 
          clientId, 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }, this.config.maxContainerAge);
  }

  private parseContainerStats(stats: any): ContainerStats {
    // Calcular CPU
    const cpuUsage = stats.cpu_stats?.cpu_usage?.total_usage || 0;
    const systemUsage = stats.cpu_stats?.system_cpu_usage || 0;
    const preCpuUsage = stats.precpu_stats?.cpu_usage?.total_usage || 0;
    const preSystemUsage = stats.precpu_stats?.system_cpu_usage || 0;
    
    let cpuPercent = 0;
    if (systemUsage > preSystemUsage && cpuUsage > preCpuUsage) {
      cpuPercent = ((cpuUsage - preCpuUsage) / (systemUsage - preSystemUsage)) * 100;
    }
    
    // Calcular memória
    const memoryUsage = stats.memory_stats?.usage || 0;
    const memoryLimit = stats.memory_stats?.limit || 0;
    const memoryPercent = memoryLimit > 0 ? (memoryUsage / memoryLimit) * 100 : 0;
    
    return {
      cpuUsage: cpuPercent,
      memoryUsage: memoryPercent,
      networkIO: {
        rx: stats.networks?.eth0?.rx_bytes || 0,
        tx: stats.networks?.eth0?.tx_bytes || 0
      },
      diskIO: {
        read: stats.blkio_stats?.io_service_bytes_recursive?.[0]?.value || 0,
        write: stats.blkio_stats?.io_service_bytes_recursive?.[1]?.value || 0
      }
    };
  }
}