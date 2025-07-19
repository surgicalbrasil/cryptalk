/**
 * Exemplo de uso do módulo Docker modularizado
 * 
 * Este exemplo demonstra como o módulo pode ser usado de forma
 * completamente isolada em qualquer aplicação.
 */

import { 
  createDockerService, 
  DEFAULT_CONFIG, 
  DockerService,
  ContainerConfig 
} from './index';

// Exemplo 1: Uso básico
async function exemploBasico() {
  console.log('=== Exemplo Básico ===');
  
  // Criar serviço com configuração padrão
  const dockerService = createDockerService(DEFAULT_CONFIG);
  
  // Registrar listeners para eventos
  dockerService.on('container-created', (data) => {
    console.log(`Container criado: ${data.clientId}`);
  });
  
  dockerService.on('container-destroyed', (data) => {
    console.log(`Container destruído: ${data.clientId}`);
  });
  
  dockerService.on('error', (data) => {
    console.error(`Erro: ${data.error}`);
  });
  
  const clientId = '550e8400-e29b-41d4-a716-446655440000';
  
  try {
    // Criar container
    const containerInfo = await dockerService.createContainer(clientId);
    console.log('Container criado:', containerInfo);
    
    // Executar comando simples
    const result = await dockerService.execCommand(clientId, 'echo "Hello World"');
    console.log('Resultado do comando:', result);
    
    // Obter status
    const status = await dockerService.getContainerStatus(clientId);
    console.log('Status do container:', status);
    
    // Copiar arquivo para container
    const fileContent = Buffer.from('console.log("Hello from file!");');
    await dockerService.copyFileToContainer(clientId, fileContent, '/app/hello.js');
    console.log('Arquivo copiado para container');
    
    // Executar arquivo
    const output = await dockerService.execCommand(clientId, 'node /app/hello.js');
    console.log('Output do arquivo:', output);
    
  } finally {
    // Limpar recursos
    await dockerService.destroyContainer(clientId);
    await dockerService.destroy();
  }
}

// Exemplo 2: Configuração customizada
async function exemploConfiguracaoCustomizada() {
  console.log('\n=== Exemplo Configuração Customizada ===');
  
  // Configuração customizada
  const customConfig = {
    ...DEFAULT_CONFIG,
    containerManager: {
      ...DEFAULT_CONFIG.containerManager,
      maxConcurrentContainers: 5,
      defaultImage: 'python:3.9-alpine'
    },
    execTimeout: 60000 // 1 minuto
  };
  
  const dockerService = createDockerService(customConfig);
  const clientId = '550e8400-e29b-41d4-a716-446655440001';
  
  try {
    // Container com configuração específica
    const containerConfig: ContainerConfig = {
      resourceType: 'heavy',
      env: {
        PYTHON_ENV: 'development',
        DEBUG: 'true'
      }
    };
    
    const containerInfo = await dockerService.createContainer(clientId, containerConfig);
    console.log('Container Python criado:', containerInfo);
    
    // Executar código Python
    const pythonCode = 'print("Hello from Python in Docker!")';
    const result = await dockerService.execCommand(clientId, `python -c "${pythonCode}"`);
    console.log('Output Python:', result);
    
  } finally {
    await dockerService.destroyContainer(clientId);
    await dockerService.destroy();
  }
}

// Exemplo 3: Múltiplos containers e gerenciamento
async function exemploMultiplosContainers() {
  console.log('\n=== Exemplo Múltiplos Containers ===');
  
  const dockerService = createDockerService(DEFAULT_CONFIG);
  
  // Event logging
  const logs: string[] = [];
  dockerService.on('container-created', (data) => logs.push(`CREATED: ${data.clientId}`));
  dockerService.on('container-destroyed', (data) => logs.push(`DESTROYED: ${data.clientId}`));
  
  const clientIds = [
    '550e8400-e29b-41d4-a716-446655440010',
    '550e8400-e29b-41d4-a716-446655440011',
    '550e8400-e29b-41d4-a716-446655440012'
  ];
  
  try {
    // Criar múltiplos containers
    const containers = await Promise.all(
      clientIds.map(id => dockerService.createContainer(id, {
        resourceType: 'light'
      }))
    );
    
    console.log(`Criados ${containers.length} containers`);
    
    // Obter status do gerenciador
    const managerStatus = await dockerService.getManagerStatus();
    console.log('Status do gerenciador:', {
      activeContainers: managerStatus.activeContainers,
      totalCreated: managerStatus.totalCreated
    });
    
    // Executar comandos em paralelo
    const results = await Promise.all(
      clientIds.map(id => 
        dockerService.execCommand(id, `echo "Container ${id.slice(-4)} running"`)
      )
    );
    
    console.log('Resultados dos comandos:', results);
    
    // Destruir em lote
    await Promise.all(
      clientIds.map(id => dockerService.destroyContainer(id))
    );
    
    console.log('Todos os containers destruídos');
    console.log('Log de eventos:', logs);
    
  } finally {
    await dockerService.destroy();
  }
}

// Exemplo 4: Error handling robusto
async function exemploErrorHandling() {
  console.log('\n=== Exemplo Error Handling ===');
  
  const dockerService = createDockerService(DEFAULT_CONFIG);
  
  // Registrar handler de erro
  dockerService.on('error', (data) => {
    console.log(`Erro capturado: ${data.operation} - ${data.error}`);
  });
  
  try {
    // Tentar criar container com ID inválido
    try {
      await dockerService.createContainer('invalid-uuid');
    } catch (error) {
      console.log('Erro esperado capturado:', (error as Error).message);
    }
    
    // Criar container válido
    const clientId = '550e8400-e29b-41d4-a716-446655440020';
    await dockerService.createContainer(clientId);
    
    // Tentar comando perigoso
    try {
      await dockerService.execCommand(clientId, 'rm -rf /');
    } catch (error) {
      console.log('Comando perigoso bloqueado:', (error as Error).message);
    }
    
    // Tentar arquivo muito grande
    try {
      const largeBuffer = Buffer.alloc(DEFAULT_CONFIG.maxFileSize + 1);
      await dockerService.copyFileToContainer(clientId, largeBuffer, '/test.txt');
    } catch (error) {
      console.log('Arquivo grande bloqueado:', (error as Error).message);
    }
    
    console.log('Error handling funcionando corretamente');
    
  } finally {
    await dockerService.destroy();
  }
}

// Executar exemplos
async function main() {
  console.log('Demonstração do Módulo Docker Modularizado\n');
  
  try {
    await exemploBasico();
    await exemploConfiguracaoCustomizada();
    await exemploMultiplosContainers();
    await exemploErrorHandling();
    
    console.log('\n✅ Todos os exemplos executados com sucesso!');
    console.log('O módulo Docker está verdadeiramente modularizado.');
    
  } catch (error) {
    console.error('❌ Erro na execução:', error);
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

export {
  exemploBasico,
  exemploConfiguracaoCustomizada,
  exemploMultiplosContainers,
  exemploErrorHandling
};