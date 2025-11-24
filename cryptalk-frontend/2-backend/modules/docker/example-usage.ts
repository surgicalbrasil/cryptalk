/**
 * Exemplo de uso do módulo Docker refatorado
 * Demonstra como usar o módulo de forma completamente desacoplada
 */

import { createDockerService, DockerServiceEvents, DEFAULT_DOCKER_CONFIG } from './index';

// Exemplo 1: Uso básico com configuração padrão
async function basicUsage() {
  const dockerService = createDockerService();
  
  // Configurar listeners para eventos
  dockerService.on('container-created', (data) => {
    console.log(`Container criado: ${data.clientId}`);
  });
  
  dockerService.on('error', (data) => {
    console.error(`Erro em ${data.operation}:`, data.error);
  });
  
  try {
    const clientId = 'client-123-456-789';
    
    // Criar container
    const containerInfo = await dockerService.createContainer(clientId, {
      resourceType: 'medium',
      env: {
        'CUSTOM_VAR': 'value'
      }
    });
    
    console.log('Container criado:', containerInfo);
    
    // Executar comando
    const result = await dockerService.execCommand(clientId, 'echo "Hello World"');
    console.log('Resultado:', result);
    
    // Copiar arquivo para container
    const fileContent = Buffer.from('Conteúdo do arquivo de teste');
    await dockerService.copyFileToContainer(clientId, fileContent, '/app/workspace/test.txt');
    
    // Listar arquivos
    const files = await dockerService.listContainerFiles(clientId, '/app/workspace');
    console.log('Arquivos no container:', files);
    
    // Obter estatísticas
    const stats = await dockerService.getContainerStats(clientId);
    console.log('Estatísticas:', stats);
    
    // Destruir container
    await dockerService.destroyContainer(clientId);
    
  } catch (error) {
    console.error('Erro no exemplo básico:', error);
  }
}

// Exemplo 2: Uso com configuração customizada
async function customConfigUsage() {
  const customConfig = {
    ...DEFAULT_DOCKER_CONFIG,
    containerManager: {
      ...DEFAULT_DOCKER_CONFIG.containerManager,
      maxConcurrentContainers: 5,
      defaultImage: 'custom-analysis-env:v2.0'
    },
    maxFileSize: 100 * 1024 * 1024, // 100MB
    execTimeout: 60000 // 60 segundos
  };
  
  const dockerService = createDockerService(customConfig);
  
  // Event listeners tipados
  dockerService.on('file-copied-to-container', (data) => {
    console.log(`Arquivo copiado para ${data.clientId}: ${data.filePath} (${data.size} bytes)`);
  });
  
  dockerService.on('command-executed', (data) => {
    console.log(`Comando executado em ${data.clientId}: ${data.command} (exit code: ${data.exitCode})`);
  });
  
  try {
    const clientId = 'analysis-client-001';
    
    // Criar container com recursos pesados
    await dockerService.createContainer(clientId, {
      resourceType: 'heavy',
      volumes: [
        { host: '/data/shared', container: '/app/shared', mode: 'ro' }
      ]
    });
    
    // Executar análise com streaming
    await dockerService.execCommandStream(
      clientId,
      'python /app/analysis/heavy_computation.py',
      (data) => {
        // Processar saída em tempo real
        console.log('Output:', data);
      }
    );
    
  } catch (error) {
    console.error('Erro no exemplo customizado:', error);
  } finally {
    await dockerService.destroy();
  }
}

// Exemplo 3: Gerenciamento de múltiplos containers
async function multipleContainersUsage() {
  const dockerService = createDockerService();
  
  const clients = ['client-1', 'client-2', 'client-3'];
  
  try {
    // Criar múltiplos containers
    const containers = await Promise.all(
      clients.map(clientId => 
        dockerService.createContainer(clientId, {
          resourceType: clientId === 'client-1' ? 'heavy' : 'medium'
        })
      )
    );
    
    console.log(`${containers.length} containers criados`);
    
    // Executar comandos em paralelo
    const results = await Promise.all(
      clients.map(clientId =>
        dockerService.execCommand(clientId, `echo "Processando em ${clientId}"`)
      )
    );
    
    console.log('Resultados:', results);
    
    // Obter status do manager
    const status = await dockerService.getManagerStatus();
    console.log('Status do manager:', status);
    
    // Cleanup de containers expirados
    const cleaned = await dockerService.cleanupExpiredContainers();
    console.log(`${cleaned} containers limpos`);
    
  } catch (error) {
    console.error('Erro no exemplo de múltiplos containers:', error);
  } finally {
    await dockerService.destroy();
  }
}

// Exemplo 4: Tratamento de erros e recuperação
async function errorHandlingUsage() {
  const dockerService = createDockerService();
  
  // Error handling centralizado
  dockerService.on('error', async (data) => {
    console.error(`Erro em ${data.operation}:`, data.error);
    
    if (data.clientId) {
      // Tentar recuperar container com problema
      try {
        const status = await dockerService.getContainerStatus(data.clientId);
        if (status === 'error') {
          console.log(`Tentando reiniciar container ${data.clientId}`);
          await dockerService.restartContainer(data.clientId);
        }
      } catch (recoveryError) {
        console.error('Falha na recuperação:', recoveryError);
        // Recriar container se necessário
        await dockerService.destroyContainer(data.clientId, true);
        await dockerService.createContainer(data.clientId);
      }
    }
  });
  
  try {
    const clientId = 'resilient-client';
    
    await dockerService.createContainer(clientId);
    
    // Simular comando que pode falhar
    try {
      await dockerService.execCommand(clientId, 'exit 1'); // Comando que falha
    } catch (cmdError) {
      console.log('Comando falhou conforme esperado');
    }
    
    // Container ainda deve estar funcionando
    const status = await dockerService.getContainerStatus(clientId);
    console.log('Status após erro:', status);
    
    // Testar comando válido
    const result = await dockerService.execCommand(clientId, 'echo "Funcionando normalmente"');
    console.log('Comando válido:', result);
    
  } catch (error) {
    console.error('Erro no exemplo de tratamento de erros:', error);
  }
}

// Exemplo 5: Integração com sistema externo (simulado)
class DocumentAnalysisService {
  private dockerService = createDockerService({
    containerManager: {
      ...DEFAULT_DOCKER_CONFIG.containerManager,
      defaultImage: 'document-analyzer:latest'
    }
  });
  
  constructor() {
    this.setupEventHandlers();
  }
  
  private setupEventHandlers() {
    this.dockerService.on('container-created', (data) => {
      this.notifySystem('container_ready', data);
    });
    
    this.dockerService.on('error', (data) => {
      this.notifySystem('error', data);
    });
  }
  
  async analyzeDocument(clientId: string, documentBuffer: Buffer): Promise<string> {
    try {
      // Criar container para análise
      await this.dockerService.createContainer(clientId, {
        resourceType: 'heavy'
      });
      
      // Copiar documento para container
      await this.dockerService.copyFileToContainer(
        clientId, 
        documentBuffer, 
        '/app/input/document.pdf'
      );
      
      // Executar análise
      const analysisResult = await this.dockerService.execCommand(
        clientId,
        'python /app/analyze.py /app/input/document.pdf',
        { timeout: 120000 } // 2 minutos
      );
      
      // Renovar container para próxima análise
      await this.dockerService.renewContainer(clientId);
      
      return analysisResult;
      
    } catch (error) {
      console.error('Erro na análise:', error);
      throw error;
    }
  }
  
  async cleanup(clientId: string): Promise<void> {
    await this.dockerService.destroyContainer(clientId);
  }
  
  async destroy(): Promise<void> {
    await this.dockerService.destroy();
  }
  
  private notifySystem(event: string, data: any): void {
    // Simular notificação para sistema externo
    console.log(`Sistema notificado: ${event}`, data);
  }
}

// Executar exemplos (comentado para evitar execução)
/*
async function runExamples() {
  console.log('=== Exemplo 1: Uso Básico ===');
  await basicUsage();
  
  console.log('\n=== Exemplo 2: Configuração Customizada ===');
  await customConfigUsage();
  
  console.log('\n=== Exemplo 3: Múltiplos Containers ===');
  await multipleContainersUsage();
  
  console.log('\n=== Exemplo 4: Tratamento de Erros ===');
  await errorHandlingUsage();
  
  console.log('\n=== Exemplo 5: Serviço de Análise ===');
  const analysisService = new DocumentAnalysisService();
  try {
    const result = await analysisService.analyzeDocument('doc-client', Buffer.from('PDF content'));
    console.log('Resultado da análise:', result);
  } finally {
    await analysisService.destroy();
  }
}

// Executar se for o módulo principal
if (require.main === module) {
  runExamples().catch(console.error);
}
*/

export {
  basicUsage,
  customConfigUsage,
  multipleContainersUsage,
  errorHandlingUsage,
  DocumentAnalysisService
};