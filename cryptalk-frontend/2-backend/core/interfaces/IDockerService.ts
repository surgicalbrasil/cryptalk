/**
 * Interface para o serviço Docker modular
 * Gerencia containers de forma isolada e desacoplada
 */

export interface ContainerConfig {
  image?: string;
  networkMode?: string;
  workDir?: string;
  env?: Record<string, string>;
  volumes?: Array<{
    host: string;
    container: string;
    mode?: 'ro' | 'rw';
  }>;
  resourceType?: 'light' | 'medium' | 'heavy';
}

export interface ContainerInfo {
  containerId: string;
  clientId: string;
  status: 'creating' | 'running' | 'stopped' | 'error';
  createdAt: Date;
  lastActivity: Date;
  resourceType: string;
  config: ContainerConfig;
}

export interface ContainerStats {
  cpuUsage: number;
  memoryUsage: number;
  networkIO: {
    rx: number;
    tx: number;
  };
  diskIO: {
    read: number;
    write: number;
  };
}

export interface ResourceConfig {
  cpuLimit: string;
  memoryLimit: string;
  swapLimit: string;
  ulimits?: Array<{
    name: string;
    hard: number;
    soft: number;
  }>;
}

export interface IDockerService {
  // Container Lifecycle
  createContainer(clientId: string, config?: ContainerConfig): Promise<ContainerInfo>;
  destroyContainer(clientId: string, force?: boolean): Promise<void>;
  restartContainer(clientId: string): Promise<void>;
  
  // File Operations
  copyFileToContainer(clientId: string, fileBuffer: Buffer, filePath: string): Promise<void>;
  copyFileFromContainer(clientId: string, sourcePath: string): Promise<Buffer>;
  listContainerFiles(clientId: string, directory: string): Promise<string[]>;
  
  // Execution
  execCommand(clientId: string, command: string, options?: any): Promise<string>;
  execCommandStream(clientId: string, command: string, onData: (data: string) => void): Promise<void>;
  
  // Monitoring
  getContainerStats(clientId: string): Promise<ContainerStats>;
  getContainerStatus(clientId: string): Promise<'running' | 'stopped' | 'error' | 'not_found'>;
  getContainerLogs(clientId: string, options?: any): Promise<string>;
  
  // Resource Management
  updateContainerResources(clientId: string, resourceType: 'light' | 'medium' | 'heavy'): Promise<void>;
  getResourceUsage(clientId: string): Promise<ContainerStats>;
  
  // Lifecycle Management
  cleanupExpiredContainers(): Promise<number>;
  renewContainer(clientId: string): Promise<void>;
  getManagerStatus(): Promise<{
    activeContainers: number;
    totalCreated: number;
    totalDestroyed: number;
    resourceUsage: any;
  }>;
  
  // Events
  on(event: 'container-created' | 'container-destroyed' | 'error' | 'resource-alert', callback: Function): void;
  emit(event: string, data: any): void;
}

export interface IContainerManager extends IDockerService {
  // Pool Management
  initializePool(size: number): Promise<void>;
  getFromPool(clientId: string): Promise<ContainerInfo>;
  returnToPool(clientId: string): Promise<void>;
  
  // Advanced Operations
  cloneContainer(sourceClientId: string, targetClientId: string): Promise<ContainerInfo>;
  migrateContainer(clientId: string, targetHost?: string): Promise<void>;
}