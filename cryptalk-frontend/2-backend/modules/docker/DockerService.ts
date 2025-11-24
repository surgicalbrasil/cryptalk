/**
 * Docker Service - Implementação Modular
 * Responsabilidade: Orquestrar operações Docker de forma isolada
 * Zero acoplamento com HTTP/WebSocket - apenas EventEmitter para comunicação
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import path from 'path';
import tar from 'tar-stream';
import { 
  IDockerService, 
  ContainerConfig, 
  ContainerInfo, 
  ContainerStats 
} from '../../core/interfaces/IDockerService';
import { ContainerManager, ContainerManagerConfig } from './ContainerManager';

export interface DockerServiceConfig {
  containerManager: ContainerManagerConfig;
  workspaceBasePath: string;
  allowedFileTypes: string[];
  maxFileSize: number;
  execTimeout: number;
}

export class DockerService extends EventEmitter implements IDockerService {
  private containerManager: ContainerManager;
  private config: DockerServiceConfig;
  private stats = {
    totalCreated: 0,
    totalDestroyed: 0,
    filesTransferred: 0,
    commandsExecuted: 0
  };

  constructor(config: DockerServiceConfig) {
    super();
    this.config = config;
    this.containerManager = new ContainerManager(config.containerManager);
    this.setupEventForwarding();
  }

  // Container Lifecycle

  async createContainer(clientId: string, config: ContainerConfig = {}): Promise<ContainerInfo> {
    try {
      this.validateClientId(clientId);
      
      // Preparar workspace local para o cliente
      await this.prepareClientWorkspace(clientId);
      
      const containerInfo = await this.containerManager.createContainer(clientId, config);
      this.stats.totalCreated++;
      
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

  async destroyContainer(clientId: string, force: boolean = false): Promise<void> {
    try {
      this.validateClientId(clientId);
      
      await this.containerManager.destroyContainer(clientId, force);
      
      // Limpar workspace local
      await this.cleanupClientWorkspace(clientId);
      
      this.stats.totalDestroyed++;
      this.emit('container-destroyed', { clientId, forced: force });
      
    } catch (error) {
      this.emit('error', { 
        operation: 'destroyContainer', 
        clientId, 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async restartContainer(clientId: string): Promise<void> {
    try {
      this.validateClientId(clientId);
      await this.containerManager.restartContainer(clientId);
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

  // File Operations

  async copyFileToContainer(clientId: string, fileBuffer: Buffer, filePath: string): Promise<void> {
    try {
      this.validateClientId(clientId);
      this.validateFileBuffer(fileBuffer);
      this.validateFilePath(filePath);

      const container = this.containerManager.getDockerContainer(clientId);
      if (!container) {
        throw new Error(`Container não encontrado para cliente: ${clientId}`);
      }

      // Criar tar stream
      const pack = tar.pack();
      const fileName = path.basename(filePath);
      const dirPath = path.dirname(filePath);

      pack.entry({ name: fileName }, fileBuffer);
      pack.finalize();

      // Copiar para container
      await container.putArchive(pack, { path: dirPath });

      // Atualizar última atividade
      this.containerManager.renewContainer(clientId);
      this.stats.filesTransferred++;

      this.emit('file-copied-to-container', { clientId, filePath, size: fileBuffer.length });

    } catch (error) {
      this.emit('error', { 
        operation: 'copyFileToContainer', 
        clientId, 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async copyFileFromContainer(clientId: string, sourcePath: string): Promise<Buffer> {
    try {
      this.validateClientId(clientId);
      this.validateFilePath(sourcePath);

      const container = this.containerManager.getDockerContainer(clientId);
      if (!container) {
        throw new Error(`Container não encontrado para cliente: ${clientId}`);
      }

      const stream = await container.getArchive({ path: sourcePath });
      
      return new Promise<Buffer>((resolve, reject) => {
        const extract = tar.extract();
        let fileBuffer: Buffer | null = null;

        extract.on('entry', (header, entryStream, next) => {
          const chunks: Buffer[] = [];
          
          entryStream.on('data', chunk => chunks.push(chunk));
          entryStream.on('end', () => {
            fileBuffer = Buffer.concat(chunks);
            next();
          });
          entryStream.on('error', reject);
          
          entryStream.resume();
        });

        extract.on('finish', () => {
          if (fileBuffer) {
            this.stats.filesTransferred++;
            this.emit('file-copied-from-container', { clientId, sourcePath, size: fileBuffer.length });
            resolve(fileBuffer);
          } else {
            reject(new Error('Arquivo não encontrado no container'));
          }
        });

        extract.on('error', reject);
        stream.pipe(extract);
      });

    } catch (error) {
      this.emit('error', { 
        operation: 'copyFileFromContainer', 
        clientId, 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async listContainerFiles(clientId: string, directory: string): Promise<string[]> {
    try {
      this.validateClientId(clientId);
      
      const result = await this.execCommand(
        clientId, 
        `find "${directory}" -type f 2>/dev/null || echo "Directory not found"`
      );
      
      return result
        .split('\n')
        .filter(line => line.trim().length > 0 && line !== 'Directory not found')
        .map(line => line.trim());

    } catch (error) {
      this.emit('error', { 
        operation: 'listContainerFiles', 
        clientId, 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // Execution

  async execCommand(clientId: string, command: string, options: any = {}): Promise<string> {
    try {
      this.validateClientId(clientId);
      this.validateCommand(command);

      const container = this.containerManager.getDockerContainer(clientId);
      if (!container) {
        throw new Error(`Container não encontrado para cliente: ${clientId}`);
      }

      const execConfig = {
        Cmd: this.parseCommand(command),
        AttachStdout: true,
        AttachStderr: true,
        AttachStdin: false,
        Tty: false,
        WorkingDir: options.workingDir || '/app/workspace',
        Env: options.env || [],
        User: options.user || 'root'
      };

      const exec = await container.exec(execConfig);
      const stream = await exec.start({ hijack: true, stdin: false });

      const result = await this.processExecStream(stream, options.timeout || this.config.execTimeout);
      
      // Verificar código de saída
      const inspectResult = await exec.inspect();
      if (inspectResult.ExitCode !== 0) {
        throw new Error(`Comando falhou com código ${inspectResult.ExitCode}: ${result}`);
      }

      // Atualizar última atividade
      this.containerManager.renewContainer(clientId);
      this.stats.commandsExecuted++;

      this.emit('command-executed', { clientId, command, exitCode: inspectResult.ExitCode });
      return result;

    } catch (error) {
      this.emit('error', { 
        operation: 'execCommand', 
        clientId, 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async execCommandStream(clientId: string, command: string, onData: (data: string) => void): Promise<void> {
    try {
      this.validateClientId(clientId);
      this.validateCommand(command);

      const container = this.containerManager.getDockerContainer(clientId);
      if (!container) {
        throw new Error(`Container não encontrado para cliente: ${clientId}`);
      }

      const execConfig = {
        Cmd: this.parseCommand(command),
        AttachStdout: true,
        AttachStderr: true,
        AttachStdin: false,
        Tty: false,
        WorkingDir: '/app/workspace'
      };

      const exec = await container.exec(execConfig);
      const stream = await exec.start({ hijack: true, stdin: false });

      return new Promise<void>((resolve, reject) => {
        stream.on('data', (chunk) => {
          const data = chunk.toString();
          onData(data);
        });

        stream.on('end', async () => {
          try {
            const inspectResult = await exec.inspect();
            this.containerManager.renewContainer(clientId);
            this.stats.commandsExecuted++;
            
            this.emit('command-streamed', { clientId, command, exitCode: inspectResult.ExitCode });
            resolve();
          } catch (error) {
            reject(error);
          }
        });

        stream.on('error', reject);
      });

    } catch (error) {
      this.emit('error', { 
        operation: 'execCommandStream', 
        clientId, 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // Monitoring

  async getContainerStats(clientId: string): Promise<ContainerStats> {
    try {
      this.validateClientId(clientId);
      return await this.containerManager.getContainerStats(clientId);
    } catch (error) {
      this.emit('error', { 
        operation: 'getContainerStats', 
        clientId, 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async getContainerStatus(clientId: string): Promise<'running' | 'stopped' | 'error' | 'not_found'> {
    try {
      this.validateClientId(clientId);
      return await this.containerManager.getContainerStatus(clientId);
    } catch (error) {
      this.emit('error', { 
        operation: 'getContainerStatus', 
        clientId, 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async getContainerLogs(clientId: string, options: any = {}): Promise<string> {
    try {
      this.validateClientId(clientId);

      const container = this.containerManager.getDockerContainer(clientId);
      if (!container) {
        throw new Error(`Container não encontrado para cliente: ${clientId}`);
      }

      const logsStream = await container.logs({
        stdout: true,
        stderr: true,
        tail: options.tail || 100,
        timestamps: options.timestamps || false,
        since: options.since || 0
      });

      return logsStream.toString();

    } catch (error) {
      this.emit('error', { 
        operation: 'getContainerLogs', 
        clientId, 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // Resource Management

  async updateContainerResources(clientId: string, resourceType: 'light' | 'medium' | 'heavy'): Promise<void> {
    try {
      this.validateClientId(clientId);

      const containerInfo = this.containerManager.getContainerInfo(clientId);
      if (!containerInfo) {
        throw new Error(`Container não encontrado para cliente: ${clientId}`);
      }

      // Recriar container com novos recursos
      const newConfig = { ...containerInfo.config, resourceType };
      
      await this.destroyContainer(clientId);
      await this.createContainer(clientId, newConfig);

      this.emit('container-resources-updated', { clientId, resourceType });

    } catch (error) {
      this.emit('error', { 
        operation: 'updateContainerResources', 
        clientId, 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async getResourceUsage(clientId: string): Promise<ContainerStats> {
    return this.getContainerStats(clientId);
  }

  // Lifecycle Management

  async cleanupExpiredContainers(): Promise<number> {
    try {
      const cleaned = await this.containerManager.cleanupExpiredContainers();
      this.emit('containers-cleaned', { count: cleaned });
      return cleaned;
    } catch (error) {
      this.emit('error', { 
        operation: 'cleanupExpiredContainers', 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async renewContainer(clientId: string): Promise<void> {
    try {
      this.validateClientId(clientId);
      this.containerManager.renewContainer(clientId);
      this.emit('container-renewed', { clientId });
    } catch (error) {
      this.emit('error', { 
        operation: 'renewContainer', 
        clientId, 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async getManagerStatus(): Promise<{
    activeContainers: number;
    totalCreated: number;
    totalDestroyed: number;
    resourceUsage: any;
  }> {
    const activeContainers = this.containerManager.listActiveContainers();
    
    return {
      activeContainers: activeContainers.length,
      totalCreated: this.stats.totalCreated,
      totalDestroyed: this.stats.totalDestroyed,
      resourceUsage: {
        filesTransferred: this.stats.filesTransferred,
        commandsExecuted: this.stats.commandsExecuted,
        containers: activeContainers.map(container => ({
          clientId: container.clientId,
          status: container.status,
          uptime: Date.now() - container.createdAt.getTime(),
          resourceType: container.resourceType
        }))
      }
    };
  }

  // Public utility methods

  /**
   * Destruir todos os containers e limpar recursos
   */
  async destroy(): Promise<void> {
    try {
      await this.containerManager.destroyAll();
      this.emit('service-destroyed');
    } catch (error) {
      this.emit('error', { 
        operation: 'destroy', 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // Private methods

  private setupEventForwarding(): void {
    // Repassar eventos do ContainerManager
    this.containerManager.on('container-created', (data) => this.emit('container-created', data));
    this.containerManager.on('container-destroyed', (data) => this.emit('container-destroyed', data));
    this.containerManager.on('container-expired', (data) => this.emit('container-expired', data));
    this.containerManager.on('error', (data) => this.emit('error', data));
  }

  private validateClientId(clientId: string): void {
    if (!clientId || typeof clientId !== 'string') {
      throw new Error('ID do cliente inválido');
    }
    
    // Validar formato UUID básico
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(clientId)) {
      throw new Error('ID do cliente deve ser um UUID válido');
    }
  }

  private validateFileBuffer(fileBuffer: Buffer): void {
    if (!Buffer.isBuffer(fileBuffer)) {
      throw new Error('Buffer de arquivo inválido');
    }
    
    if (fileBuffer.length === 0) {
      throw new Error('Arquivo vazio');
    }
    
    if (fileBuffer.length > this.config.maxFileSize) {
      throw new Error(`Arquivo muito grande. Máximo: ${this.config.maxFileSize} bytes`);
    }
  }

  private validateFilePath(filePath: string): void {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Caminho do arquivo inválido');
    }
    
    // Verificar caracteres perigosos
    const dangerousChars = /[<>"|?*\x00-\x1f]/;
    if (dangerousChars.test(filePath)) {
      throw new Error('Caminho do arquivo contém caracteres inválidos');
    }
    
    // Verificar tentativas de path traversal
    if (filePath.includes('..') || filePath.includes('~')) {
      throw new Error('Path traversal não permitido');
    }
  }

  private validateCommand(command: string): void {
    if (!command || typeof command !== 'string') {
      throw new Error('Comando inválido');
    }
    
    // Lista de comandos perigosos
    const dangerousCommands = [
      'rm -rf /',
      'dd if=/dev/zero',
      'mkfs',
      'fdisk',
      'format',
      'shutdown',
      'reboot',
      'halt',
      'init 0',
      'init 6'
    ];
    
    const commandLower = command.toLowerCase();
    for (const dangerous of dangerousCommands) {
      if (commandLower.includes(dangerous)) {
        throw new Error(`Comando perigoso não permitido: ${dangerous}`);
      }
    }
  }

  private parseCommand(command: string): string[] {
    // Dividir comando preservando aspas
    const parts = command.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    return parts.map(part => part.replace(/^"(.*)"$/, '$1'));
  }

  private async processExecStream(stream: any, timeout: number): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      let output = '';
      let timeoutHandle: NodeJS.Timeout;

      const cleanup = () => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
      };

      // Configurar timeout
      timeoutHandle = setTimeout(() => {
        cleanup();
        reject(new Error(`Timeout de ${timeout}ms excedido`));
      }, timeout);

      stream.on('data', (chunk: Buffer) => {
        output += chunk.toString();
      });

      stream.on('end', () => {
        cleanup();
        resolve(output);
      });

      stream.on('error', (error: Error) => {
        cleanup();
        reject(error);
      });
    });
  }

  private async prepareClientWorkspace(clientId: string): Promise<void> {
    const workspacePath = path.join(this.config.workspaceBasePath, clientId);
    
    try {
      await fs.mkdir(workspacePath, { recursive: true });
      await fs.mkdir(path.join(workspacePath, 'uploads'), { recursive: true });
      await fs.mkdir(path.join(workspacePath, 'results'), { recursive: true });
    } catch (error) {
      throw new Error(`Erro ao criar workspace: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async cleanupClientWorkspace(clientId: string): Promise<void> {
    const workspacePath = path.join(this.config.workspaceBasePath, clientId);
    
    try {
      await fs.rm(workspacePath, { recursive: true, force: true });
    } catch (error) {
      // Workspace pode não existir ou já ter sido removido
    }
  }
}