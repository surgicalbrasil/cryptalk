/**
 * Teste do Módulo Docker - Validação de Modularização
 * 
 * Este teste valida:
 * 1. Criação/Destruição de Containers - Lifecycle completo
 * 2. Event System - Eventos são emitidos corretamente
 * 3. Error Handling - Tratamento de erros robusto
 * 4. Configuration - Configuração via DI funciona
 * 5. Isolation - Módulo funciona independentemente
 */

import { DockerService, DockerServiceConfig } from './DockerService';
import { ContainerManager } from './ContainerManager';
import { ContainerConfig, ContainerInfo } from '../../core/interfaces/IDockerService';
import { EventEmitter } from 'events';

// Mock do dockerode
jest.mock('dockerode');

describe('Docker Module - Modularization Test', () => {
  let dockerService: DockerService;
  let config: DockerServiceConfig;
  let mockDocker: any;
  let mockContainer: any;
  let events: { [key: string]: any[] };

  beforeEach(() => {
    // Reset dos mocks
    jest.clearAllMocks();
    events = {};

    // Configuração do mock container
    mockContainer = {
      id: 'mock-container-id',
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
      restart: jest.fn().mockResolvedValue(undefined),
      inspect: jest.fn().mockResolvedValue({
        State: { Running: true, Status: 'running' }
      }),
      stats: jest.fn().mockResolvedValue({
        cpu_stats: {
          cpu_usage: { total_usage: 1000 },
          system_cpu_usage: 10000
        },
        precpu_stats: {
          cpu_usage: { total_usage: 500 },
          system_cpu_usage: 5000
        },
        memory_stats: {
          usage: 50 * 1024 * 1024,
          limit: 100 * 1024 * 1024
        },
        networks: {
          eth0: { rx_bytes: 1000, tx_bytes: 2000 }
        },
        blkio_stats: {
          io_service_bytes_recursive: [
            { value: 1000 },
            { value: 2000 }
          ]
        }
      }),
      exec: jest.fn().mockResolvedValue({
        start: jest.fn().mockResolvedValue(mockCreateStream()),
        inspect: jest.fn().mockResolvedValue({ ExitCode: 0 })
      }),
      logs: jest.fn().mockResolvedValue('container logs'),
      putArchive: jest.fn().mockResolvedValue(undefined),
      getArchive: jest.fn().mockResolvedValue(mockCreateTarStream())
    };

    // Configuração do mock Docker
    mockDocker = {
      createContainer: jest.fn().mockResolvedValue(mockContainer),
      createVolume: jest.fn().mockResolvedValue(undefined),
      getVolume: jest.fn().mockReturnValue({
        remove: jest.fn().mockResolvedValue(undefined)
      })
    };

    // Mock do dockerode constructor
    const Docker = require('dockerode');
    Docker.mockImplementation(() => mockDocker);

    // Configuração do serviço
    config = {
      containerManager: {
        maxConcurrentContainers: 10,
        maxContainerAge: 300000, // 5 minutos
        cleanupInterval: 60000, // 1 minuto
        defaultImage: 'node:18-alpine',
        defaultNetworkMode: 'bridge',
        resourceConfigs: {
          light: {
            memory: 256 * 1024 * 1024,
            memorySwap: 512 * 1024 * 1024,
            cpuQuota: 50000,
            pidsLimit: 100
          },
          medium: {
            memory: 512 * 1024 * 1024,
            memorySwap: 1024 * 1024 * 1024,
            cpuQuota: 100000,
            pidsLimit: 200
          },
          heavy: {
            memory: 1024 * 1024 * 1024,
            memorySwap: 2048 * 1024 * 1024,
            cpuQuota: 200000,
            pidsLimit: 500
          }
        },
        securityConfig: {
          securityOpts: ['no-new-privileges'],
          capDrop: ['ALL'],
          capAdd: ['CHOWN', 'SETUID', 'SETGID'],
          readonlyRootfs: false,
          tmpfs: { '/tmp': 'rw,noexec,nosuid,size=100m' },
          ulimits: [{ name: 'nofile', hard: 1024, soft: 1024 }]
        }
      },
      workspaceBasePath: '/tmp/test-workspaces',
      allowedFileTypes: ['.js', '.ts', '.json', '.txt'],
      maxFileSize: 10 * 1024 * 1024, // 10MB
      execTimeout: 30000 // 30 segundos
    };

    dockerService = new DockerService(config);

    // Capturar eventos
    dockerService.on('container-created', (data) => {
      if (!events['container-created']) events['container-created'] = [];
      events['container-created'].push(data);
    });

    dockerService.on('container-destroyed', (data) => {
      if (!events['container-destroyed']) events['container-destroyed'] = [];
      events['container-destroyed'].push(data);
    });

    dockerService.on('error', (data) => {
      if (!events['error']) events['error'] = [];
      events['error'].push(data);
    });

    dockerService.on('file-copied-to-container', (data) => {
      if (!events['file-copied-to-container']) events['file-copied-to-container'] = [];
      events['file-copied-to-container'].push(data);
    });

    dockerService.on('command-executed', (data) => {
      if (!events['command-executed']) events['command-executed'] = [];
      events['command-executed'].push(data);
    });
  });

  afterEach(async () => {
    // Limpar recursos
    await dockerService.destroy();
  });

  describe('1. Container Lifecycle Management', () => {
    it('deve criar um container com configuração padrão', async () => {
      const clientId = '550e8400-e29b-41d4-a716-446655440000';
      
      const containerInfo = await dockerService.createContainer(clientId);

      expect(containerInfo).toMatchObject({
        containerId: 'mock-container-id',
        clientId,
        status: 'running',
        resourceType: 'medium'
      });

      expect(mockDocker.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          Image: 'node:18-alpine',
          name: `claude-client-${clientId}`,
          Labels: expect.objectContaining({
            'com.cryptalk.client-id': clientId,
            'com.cryptalk.resource-type': 'medium',
            'com.cryptalk.managed': 'true'
          })
        })
      );

      expect(mockContainer.start).toHaveBeenCalled();
      expect(events['container-created']).toHaveLength(1);
      expect(events['container-created'][0]).toMatchObject({ clientId });
    });

    it('deve criar um container com configuração customizada', async () => {
      const clientId = '550e8400-e29b-41d4-a716-446655440001';
      const customConfig: ContainerConfig = {
        image: 'python:3.9-alpine',
        resourceType: 'heavy',
        env: { CUSTOM_VAR: 'value' },
        workDir: '/custom/work'
      };

      const containerInfo = await dockerService.createContainer(clientId, customConfig);

      expect(containerInfo.resourceType).toBe('heavy');
      expect(containerInfo.config).toEqual(customConfig);

      expect(mockDocker.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          Image: 'python:3.9-alpine',
          WorkingDir: '/custom/work',
          Env: expect.arrayContaining([
            `CLIENT_ID=${clientId}`,
            'CUSTOM_VAR=value'
          ])
        })
      );
    });

    it('deve destruir um container existente', async () => {
      const clientId = '550e8400-e29b-41d4-a716-446655440002';
      
      await dockerService.createContainer(clientId);
      await dockerService.destroyContainer(clientId);

      expect(mockContainer.stop).toHaveBeenCalledWith({ t: 10 });
      expect(mockContainer.remove).toHaveBeenCalledWith({ force: false });
      expect(events['container-destroyed']).toHaveLength(1);
      expect(events['container-destroyed'][0]).toMatchObject({ 
        clientId, 
        forced: false 
      });
    });

    it('deve forçar destruição quando normal falha', async () => {
      const clientId = '550e8400-e29b-41d4-a716-446655440003';
      
      // Simular falha na parada normal
      mockContainer.stop.mockRejectedValueOnce(new Error('Container stuck'));
      
      await dockerService.createContainer(clientId);
      await dockerService.destroyContainer(clientId, true);

      expect(mockContainer.stop).toHaveBeenCalledWith({ t: 5 });
      expect(mockContainer.remove).toHaveBeenCalledWith({ force: true });
    });

    it('deve reiniciar um container', async () => {
      const clientId = '550e8400-e29b-41d4-a716-446655440004';
      
      await dockerService.createContainer(clientId);
      await dockerService.restartContainer(clientId);

      expect(mockContainer.restart).toHaveBeenCalled();
    });
  });

  describe('2. Event System', () => {
    it('deve emitir eventos de ciclo de vida corretamente', async () => {
      const clientId = '550e8400-e29b-41d4-a716-446655440005';
      
      await dockerService.createContainer(clientId);
      expect(events['container-created']).toHaveLength(1);
      expect(events['container-created'][0]).toMatchObject({
        clientId,
        containerInfo: expect.objectContaining({
          clientId,
          status: 'running'
        })
      });

      await dockerService.destroyContainer(clientId);
      expect(events['container-destroyed']).toHaveLength(1);
    });

    it('deve emitir eventos de erro com contexto adequado', async () => {
      const clientId = 'invalid-uuid';
      
      await expect(dockerService.createContainer(clientId)).rejects.toThrow();
      
      expect(events['error']).toHaveLength(1);
      expect(events['error'][0]).toMatchObject({
        operation: 'createContainer',
        clientId,
        error: expect.any(String)
      });
    });

    it('deve emitir eventos de operações de arquivo', async () => {
      const clientId = '550e8400-e29b-41d4-a716-446655440006';
      const fileBuffer = Buffer.from('test content');
      
      await dockerService.createContainer(clientId);
      await dockerService.copyFileToContainer(clientId, fileBuffer, '/app/test.txt');

      expect(events['file-copied-to-container']).toHaveLength(1);
      expect(events['file-copied-to-container'][0]).toMatchObject({
        clientId,
        filePath: '/app/test.txt',
        size: fileBuffer.length
      });
    });

    it('deve emitir eventos de execução de comandos', async () => {
      const clientId = '550e8400-e29b-41d4-a716-446655440007';
      
      await dockerService.createContainer(clientId);
      await dockerService.execCommand(clientId, 'echo "test"');

      expect(events['command-executed']).toHaveLength(1);
      expect(events['command-executed'][0]).toMatchObject({
        clientId,
        command: 'echo "test"',
        exitCode: 0
      });
    });
  });

  describe('3. Error Handling', () => {
    it('deve validar UUID do cliente', async () => {
      const invalidIds = ['', 'not-a-uuid', '123', null, undefined];
      
      for (const id of invalidIds) {
        await expect(
          dockerService.createContainer(id as any)
        ).rejects.toThrow(/ID do cliente/);
      }
    });

    it('deve validar buffer de arquivo', async () => {
      const clientId = '550e8400-e29b-41d4-a716-446655440008';
      await dockerService.createContainer(clientId);

      // Buffer inválido
      await expect(
        dockerService.copyFileToContainer(clientId, 'not-a-buffer' as any, '/test.txt')
      ).rejects.toThrow('Buffer de arquivo inválido');

      // Buffer vazio
      await expect(
        dockerService.copyFileToContainer(clientId, Buffer.alloc(0), '/test.txt')
      ).rejects.toThrow('Arquivo vazio');

      // Arquivo muito grande
      const largeBuffer = Buffer.alloc(config.maxFileSize + 1);
      await expect(
        dockerService.copyFileToContainer(clientId, largeBuffer, '/test.txt')
      ).rejects.toThrow(/Arquivo muito grande/);
    });

    it('deve validar caminho de arquivo', async () => {
      const clientId = '550e8400-e29b-41d4-a716-446655440009';
      const validBuffer = Buffer.from('test');
      await dockerService.createContainer(clientId);

      // Caminhos perigosos
      const dangerousPaths = [
        '../etc/passwd',
        '../../root/.ssh/id_rsa',
        '~/sensitive',
        '/etc/passwd',
        'test\x00file.txt'
      ];

      for (const path of dangerousPaths) {
        await expect(
          dockerService.copyFileToContainer(clientId, validBuffer, path)
        ).rejects.toThrow();
      }
    });

    it('deve validar comandos perigosos', async () => {
      const clientId = '550e8400-e29b-41d4-a716-446655440010';
      await dockerService.createContainer(clientId);

      const dangerousCommands = [
        'rm -rf /',
        'dd if=/dev/zero of=/dev/sda',
        'mkfs.ext4 /dev/sda',
        'shutdown -h now'
      ];

      for (const cmd of dangerousCommands) {
        await expect(
          dockerService.execCommand(clientId, cmd)
        ).rejects.toThrow(/Comando perigoso/);
      }
    });

    it('deve tratar container não encontrado', async () => {
      const clientId = '550e8400-e29b-41d4-a716-446655440011';
      
      await expect(
        dockerService.execCommand(clientId, 'echo test')
      ).rejects.toThrow(/Container não encontrado/);
    });

    it('deve tratar falha na execução de comando', async () => {
      const clientId = '550e8400-e29b-41d4-a716-446655440012';
      await dockerService.createContainer(clientId);

      // Simular comando que falha
      const failExec = {
        start: jest.fn().mockResolvedValue(mockCreateStream()),
        inspect: jest.fn().mockResolvedValue({ ExitCode: 1 })
      };
      mockContainer.exec.mockResolvedValueOnce(failExec);

      await expect(
        dockerService.execCommand(clientId, 'false')
      ).rejects.toThrow(/Comando falhou com código 1/);
    });
  });

  describe('4. Configuration via Dependency Injection', () => {
    it('deve respeitar limites de configuração', async () => {
      const clientId = '550e8400-e29b-41d4-a716-446655440013';
      
      // Criar com tipo de recurso específico
      await dockerService.createContainer(clientId, { resourceType: 'light' });

      expect(mockDocker.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          HostConfig: expect.objectContaining({
            Memory: config.containerManager.resourceConfigs.light.memory,
            CpuQuota: config.containerManager.resourceConfigs.light.cpuQuota
          })
        })
      );
    });

    it('deve aplicar configurações de segurança', async () => {
      const clientId = '550e8400-e29b-41d4-a716-446655440014';
      
      await dockerService.createContainer(clientId);

      expect(mockDocker.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          HostConfig: expect.objectContaining({
            SecurityOpt: config.containerManager.securityConfig.securityOpts,
            CapDrop: config.containerManager.securityConfig.capDrop,
            CapAdd: config.containerManager.securityConfig.capAdd
          })
        })
      );
    });

    it('deve usar configurações de workspace', async () => {
      const clientId = '550e8400-e29b-41d4-a716-446655440015';
      const fs = require('fs').promises;
      
      // Mock do fs
      fs.mkdir = jest.fn().mockResolvedValue(undefined);
      
      await dockerService.createContainer(clientId);

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining(config.workspaceBasePath),
        { recursive: true }
      );
    });
  });

  describe('5. Module Isolation', () => {
    it('deve funcionar sem dependências externas além do Docker', async () => {
      // Verificar que o módulo não depende de HTTP/WebSocket
      expect(dockerService).not.toHaveProperty('httpServer');
      expect(dockerService).not.toHaveProperty('wsServer');
      expect(dockerService).not.toHaveProperty('express');
      expect(dockerService).not.toHaveProperty('socket');
    });

    it('deve comunicar apenas através de EventEmitter', async () => {
      // Verificar que DockerService é um EventEmitter
      expect(dockerService).toBeInstanceOf(EventEmitter);
      
      // Verificar métodos de eventos
      expect(typeof dockerService.on).toBe('function');
      expect(typeof dockerService.emit).toBe('function');
      expect(typeof dockerService.removeListener).toBe('function');
    });

    it('deve gerenciar estado internamente sem vazamentos', async () => {
      const clientIds = [
        '550e8400-e29b-41d4-a716-446655440016',
        '550e8400-e29b-41d4-a716-446655440017',
        '550e8400-e29b-41d4-a716-446655440018'
      ];

      // Criar múltiplos containers
      for (const id of clientIds) {
        await dockerService.createContainer(id);
      }

      // Verificar status do gerenciador
      const status = await dockerService.getManagerStatus();
      expect(status.activeContainers).toBe(3);
      expect(status.totalCreated).toBe(3);

      // Destruir todos
      await dockerService.destroy();
      
      // Verificar que todos foram limpos
      const finalStatus = await dockerService.getManagerStatus();
      expect(finalStatus.activeContainers).toBe(0);
      expect(finalStatus.totalDestroyed).toBeGreaterThanOrEqual(3);
    });

    it('deve manter isolamento entre diferentes instâncias', async () => {
      // Criar segunda instância
      const dockerService2 = new DockerService(config);
      
      const clientId1 = '550e8400-e29b-41d4-a716-446655440019';
      const clientId2 = '550e8400-e29b-41d4-a716-446655440020';
      
      // Criar containers em instâncias diferentes
      await dockerService.createContainer(clientId1);
      await dockerService2.createContainer(clientId2);
      
      // Verificar isolamento
      const status1 = await dockerService.getManagerStatus();
      const status2 = await dockerService2.getManagerStatus();
      
      // Cada instância deve ter seus próprios contadores
      expect(status1.totalCreated).toBeGreaterThanOrEqual(1);
      expect(status2.totalCreated).toBe(1);
      
      // Limpar
      await dockerService2.destroy();
    });
  });

  describe('Advanced Features', () => {
    it('deve executar comandos com stream', async () => {
      const clientId = '550e8400-e29b-41d4-a716-446655440021';
      await dockerService.createContainer(clientId);

      const output: string[] = [];
      await dockerService.execCommandStream(
        clientId, 
        'echo "line1"; echo "line2"',
        (data) => output.push(data)
      );

      expect(output).toHaveLength(2);
    });

    it('deve obter estatísticas do container', async () => {
      const clientId = '550e8400-e29b-41d4-a716-446655440022';
      await dockerService.createContainer(clientId);

      const stats = await dockerService.getContainerStats(clientId);

      expect(stats).toMatchObject({
        cpuUsage: expect.any(Number),
        memoryUsage: expect.any(Number),
        networkIO: {
          rx: expect.any(Number),
          tx: expect.any(Number)
        },
        diskIO: {
          read: expect.any(Number),
          write: expect.any(Number)
        }
      });
    });

    it('deve listar arquivos no container', async () => {
      const clientId = '550e8400-e29b-41d4-a716-446655440023';
      await dockerService.createContainer(clientId);

      // Mock do execCommand
      const execSpy = jest.spyOn(dockerService, 'execCommand');
      execSpy.mockResolvedValueOnce('/app/file1.txt\n/app/file2.txt\n');

      const files = await dockerService.listContainerFiles(clientId, '/app');

      expect(files).toEqual(['/app/file1.txt', '/app/file2.txt']);
    });

    it('deve atualizar recursos do container', async () => {
      const clientId = '550e8400-e29b-41d4-a716-446655440024';
      await dockerService.createContainer(clientId, { resourceType: 'light' });

      await dockerService.updateContainerResources(clientId, 'heavy');

      // Deve ter destruído e recriado
      expect(mockContainer.stop).toHaveBeenCalled();
      expect(mockDocker.createContainer).toHaveBeenCalledTimes(2);
      expect(mockDocker.createContainer).toHaveBeenLastCalledWith(
        expect.objectContaining({
          Labels: expect.objectContaining({
            'com.cryptalk.resource-type': 'heavy'
          })
        })
      );
    });

    it('deve renovar timeout do container', async () => {
      const clientId = '550e8400-e29b-41d4-a716-446655440025';
      await dockerService.createContainer(clientId);

      // Não deve lançar erro
      await expect(
        dockerService.renewContainer(clientId)
      ).resolves.not.toThrow();
    });

    it('deve limpar containers expirados', async () => {
      // Avançar tempo para simular expiração
      jest.useFakeTimers();
      
      const clientId = '550e8400-e29b-41d4-a716-446655440026';
      await dockerService.createContainer(clientId);

      // Avançar além do tempo de expiração
      jest.advanceTimersByTime(config.containerManager.maxContainerAge + 1000);

      const cleaned = await dockerService.cleanupExpiredContainers();
      expect(cleaned).toBeGreaterThan(0);

      jest.useRealTimers();
    });
  });
});

// Funções auxiliares para mocks
function mockCreateStream() {
  const stream = new EventEmitter();
  
  setTimeout(() => {
    stream.emit('data', Buffer.from('output line 1\n'));
    stream.emit('data', Buffer.from('output line 2\n'));
    stream.emit('end');
  }, 10);

  return stream;
}

function mockCreateTarStream() {
  const stream = new EventEmitter();
  const tar = require('tar-stream');
  const pack = tar.pack();

  pack.entry({ name: 'test.txt' }, Buffer.from('file content'));
  pack.finalize();

  setTimeout(() => {
    pack.pipe(stream as any);
  }, 10);

  return stream;
}

// Teste de integração básico
describe('Docker Module - Integration Test', () => {
  it('deve demonstrar uso completo do módulo de forma isolada', async () => {
    const config: DockerServiceConfig = {
      containerManager: {
        maxConcurrentContainers: 5,
        maxContainerAge: 60000,
        cleanupInterval: 30000,
        defaultImage: 'node:18-alpine',
        defaultNetworkMode: 'bridge',
        resourceConfigs: {
          light: { memory: 256 * 1024 * 1024, memorySwap: 512 * 1024 * 1024, cpuQuota: 50000, pidsLimit: 100 },
          medium: { memory: 512 * 1024 * 1024, memorySwap: 1024 * 1024 * 1024, cpuQuota: 100000, pidsLimit: 200 },
          heavy: { memory: 1024 * 1024 * 1024, memorySwap: 2048 * 1024 * 1024, cpuQuota: 200000, pidsLimit: 500 }
        },
        securityConfig: {
          securityOpts: ['no-new-privileges'],
          capDrop: ['ALL'],
          capAdd: ['CHOWN', 'SETUID', 'SETGID'],
          readonlyRootfs: false,
          tmpfs: { '/tmp': 'rw,noexec,nosuid,size=100m' },
          ulimits: [{ name: 'nofile', hard: 1024, soft: 1024 }]
        }
      },
      workspaceBasePath: '/tmp/docker-workspaces',
      allowedFileTypes: ['.js', '.ts', '.json'],
      maxFileSize: 10 * 1024 * 1024,
      execTimeout: 30000
    };

    // Criar serviço
    const service = new DockerService(config);

    // Registrar listeners
    const logs: string[] = [];
    service.on('container-created', (data) => logs.push(`Container criado: ${data.clientId}`));
    service.on('container-destroyed', (data) => logs.push(`Container destruído: ${data.clientId}`));
    service.on('error', (data) => logs.push(`Erro: ${data.error}`));

    // Simular uso
    const clientId = '550e8400-e29b-41d4-a716-446655440100';

    try {
      // 1. Criar container
      const containerInfo = await service.createContainer(clientId, {
        resourceType: 'medium',
        env: { APP_ENV: 'test' }
      });
      
      expect(containerInfo).toBeDefined();
      expect(containerInfo.clientId).toBe(clientId);

      // 2. Executar comando
      // (mockado no teste, mas demonstra a interface)
      
      // 3. Copiar arquivo
      // (mockado no teste, mas demonstra a interface)

      // 4. Obter status
      const status = await service.getContainerStatus(clientId);
      expect(['running', 'stopped', 'error', 'not_found']).toContain(status);

      // 5. Destruir container
      await service.destroyContainer(clientId);

    } finally {
      // Limpar
      await service.destroy();
    }

    // Verificar logs
    expect(logs).toContain(`Container criado: ${clientId}`);
    expect(logs).toContain(`Container destruído: ${clientId}`);
  });
});