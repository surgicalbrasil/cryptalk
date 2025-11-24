/**
 * Módulo Docker - Exposição das principais classes
 * 
 * Este é o ponto de entrada principal do módulo Docker modularizado.
 * Exporta todas as interfaces e classes necessárias para uso externo.
 */

// Serviços principais
export { DockerService, DockerServiceConfig } from './DockerService';
export { ContainerManager, ContainerManagerConfig } from './ContainerManager';

// Interfaces
export {
  IDockerService,
  IContainerManager,
  ContainerConfig,
  ContainerInfo,
  ContainerStats,
  ResourceConfig
} from '../../core/interfaces/IDockerService';

// Tipos auxiliares
export interface DockerModuleOptions {
  containerManager: ContainerManagerConfig;
  workspaceBasePath: string;
  allowedFileTypes: string[];
  maxFileSize: number;
  execTimeout: number;
}

/**
 * Factory function para criar uma instância do DockerService
 */
export function createDockerService(options: DockerModuleOptions): DockerService {
  return new DockerService(options);
}

/**
 * Configuração padrão para desenvolvimento
 */
export const DEFAULT_CONFIG: DockerModuleOptions = {
  containerManager: {
    maxConcurrentContainers: 10,
    maxContainerAge: 300000, // 5 minutos
    cleanupInterval: 60000, // 1 minuto
    defaultImage: 'node:18-alpine',
    defaultNetworkMode: 'bridge',
    resourceConfigs: {
      light: {
        memory: 256 * 1024 * 1024, // 256MB
        memorySwap: 512 * 1024 * 1024, // 512MB
        cpuQuota: 50000, // 50% de 1 CPU
        pidsLimit: 100
      },
      medium: {
        memory: 512 * 1024 * 1024, // 512MB
        memorySwap: 1024 * 1024 * 1024, // 1GB
        cpuQuota: 100000, // 100% de 1 CPU
        pidsLimit: 200
      },
      heavy: {
        memory: 1024 * 1024 * 1024, // 1GB
        memorySwap: 2048 * 1024 * 1024, // 2GB
        cpuQuota: 200000, // 200% (2 CPUs)
        pidsLimit: 500
      }
    },
    securityConfig: {
      securityOpts: ['no-new-privileges'],
      capDrop: ['ALL'],
      capAdd: ['CHOWN', 'SETUID', 'SETGID'],
      readonlyRootfs: false,
      tmpfs: { '/tmp': 'rw,noexec,nosuid,size=100m' },
      ulimits: [
        { name: 'nofile', hard: 1024, soft: 1024 },
        { name: 'nproc', hard: 100, soft: 100 }
      ]
    }
  },
  workspaceBasePath: '/tmp/docker-workspaces',
  allowedFileTypes: ['.js', '.ts', '.json', '.txt', '.md', '.py', '.go'],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  execTimeout: 30000 // 30 segundos
};