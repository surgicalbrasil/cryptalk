# Módulo Docker - Completamente Modular

Este módulo Docker foi completamente refatorado para ser verdadeiramente modular, seguindo os princípios de **zero acoplamento** e **responsabilidade única**.

## 🎯 Características Principais

### ✅ Zero Acoplamento
- **Sem dependências HTTP/Express**: Não há imports ou referências ao Express
- **Sem dependências WebSocket**: Não há acoplamento com WebSocket
- **Event-driven**: Comunicação baseada apenas em EventEmitter
- **Interface clara**: Implementa `IDockerService` de forma completa

### 🏗️ Arquitetura Modular

```
modules/docker/
├── DockerService.ts       # Serviço principal (orquestração)
├── ContainerManager.ts    # Gerenciamento de containers 
├── index.ts              # Exportações e factories
├── example-usage.ts      # Exemplos de uso
└── README.md            # Esta documentação
```

### 🔧 Configuração por Dependency Injection
```typescript
const dockerService = createDockerService({
  containerManager: {
    maxConcurrentContainers: 10,
    defaultImage: 'custom-env:latest'
  },
  workspaceBasePath: '/custom/path',
  maxFileSize: 100 * 1024 * 1024
});
```

## 📦 Instalação e Uso

### Importar o Módulo
```typescript
import { 
  createDockerService, 
  DockerService,
  DEFAULT_DOCKER_CONFIG 
} from './modules/docker';
```

### Uso Básico
```typescript
const dockerService = createDockerService();

// Configurar event listeners
dockerService.on('container-created', (data) => {
  console.log(`Container criado: ${data.clientId}`);
});

dockerService.on('error', (data) => {
  console.error(`Erro: ${data.error}`);
});

// Criar container
const containerInfo = await dockerService.createContainer('client-123', {
  resourceType: 'medium'
});

// Executar comando
const result = await dockerService.execCommand('client-123', 'echo "Hello"');

// Copiar arquivo
const fileBuffer = Buffer.from('conteudo');
await dockerService.copyFileToContainer('client-123', fileBuffer, '/app/file.txt');

// Cleanup
await dockerService.destroyContainer('client-123');
```

## 🎛️ API Completa

### Container Lifecycle
- `createContainer(clientId, config?)` - Criar container
- `destroyContainer(clientId, force?)` - Destruir container
- `restartContainer(clientId)` - Reiniciar container

### File Operations
- `copyFileToContainer(clientId, buffer, path)` - Copiar arquivo para container
- `copyFileFromContainer(clientId, path)` - Copiar arquivo do container
- `listContainerFiles(clientId, directory)` - Listar arquivos

### Execution
- `execCommand(clientId, command, options?)` - Executar comando
- `execCommandStream(clientId, command, onData)` - Executar com streaming

### Monitoring
- `getContainerStats(clientId)` - Obter estatísticas
- `getContainerStatus(clientId)` - Obter status
- `getContainerLogs(clientId, options?)` - Obter logs

### Resource Management
- `updateContainerResources(clientId, type)` - Atualizar recursos
- `cleanupExpiredContainers()` - Limpar containers expirados
- `renewContainer(clientId)` - Renovar timeout

## 📊 Sistema de Eventos

### Eventos Disponíveis
```typescript
dockerService.on('container-created', (data) => {
  // { clientId, containerInfo }
});

dockerService.on('container-destroyed', (data) => {
  // { clientId, forced }
});

dockerService.on('file-copied-to-container', (data) => {
  // { clientId, filePath, size }
});

dockerService.on('command-executed', (data) => {
  // { clientId, command, exitCode }
});

dockerService.on('error', (data) => {
  // { operation, clientId?, error }
});
```

## 🔒 Segurança Integrada

### Validações Automáticas
- **Client ID**: Validação de formato UUID
- **File Paths**: Proteção contra path traversal
- **Commands**: Bloqueio de comandos perigosos
- **File Size**: Limite de tamanho configurável

### Configuração de Segurança
```typescript
const securityConfig = {
  securityOpts: ['no-new-privileges:true'],
  capDrop: ['ALL'],
  capAdd: ['CHOWN', 'SETUID', 'SETGID'],
  readonlyRootfs: false,
  tmpfs: {
    '/tmp': 'size=200m,noexec,nosuid,nodev'
  }
};
```

## 🎨 Configurações de Recursos

### Tipos Predefinidos
```typescript
// Light: 256MB RAM, 25% CPU
// Medium: 512MB RAM, 50% CPU  
// Heavy: 1GB RAM, 100% CPU

await dockerService.createContainer('client', {
  resourceType: 'heavy'
});
```

### Configuração Customizada
```typescript
const customConfig = {
  containerManager: {
    resourceConfigs: {
      custom: {
        memory: 2 * 1024 * 1024 * 1024, // 2GB
        cpuQuota: 150000 // 150% CPU
      }
    }
  }
};
```

## 🔄 Gerenciamento de Lifecycle

### Cleanup Automático
- Containers expirados são removidos automaticamente
- Volumes temporários são limpos
- Timeouts configuráveis por container

### Renovação de Containers
```typescript
// Renovar timeout do container
await dockerService.renewContainer('client-123');

// Atualizar recursos sem perder estado
await dockerService.updateContainerResources('client-123', 'heavy');
```

## 🧪 Tratamento de Erros

### Error Handling Robusto
```typescript
dockerService.on('error', async (data) => {
  console.error(`Erro em ${data.operation}:`, data.error);
  
  if (data.clientId) {
    // Tentar recuperação automática
    const status = await dockerService.getContainerStatus(data.clientId);
    if (status === 'error') {
      await dockerService.restartContainer(data.clientId);
    }
  }
});
```

### Retry Logic
- Destruição forçada em caso de falha
- Recriação automática de containers com problema
- Logs detalhados para debugging

## 📈 Monitoramento

### Estatísticas em Tempo Real
```typescript
const stats = await dockerService.getContainerStats('client-123');
// {
//   cpuUsage: 45.2,
//   memoryUsage: 67.8,
//   networkIO: { rx: 1024, tx: 2048 },
//   diskIO: { read: 4096, write: 8192 }
// }
```

### Status do Manager
```typescript
const status = await dockerService.getManagerStatus();
// {
//   activeContainers: 5,
//   totalCreated: 25,
//   totalDestroyed: 20,
//   resourceUsage: {...}
// }
```

## 🔧 Configuração Avançada

### Factory Patterns
```typescript
// Configuração mínima
const minimal = createMinimalConfig('my-image:latest');

// Configuração completa
const full = createDockerService({
  containerManager: { ... },
  workspaceBasePath: '/custom',
  maxFileSize: 200 * 1024 * 1024,
  execTimeout: 60000
});
```

### Validação de Configuração
```typescript
if (validateDockerConfig(config)) {
  const service = createDockerService(config);
} else {
  throw new Error('Configuração inválida');
}
```

## 🚀 Integração com Sistemas Externos

O módulo foi projetado para integração fácil com qualquer sistema:

### Exemplo: Serviço de Análise de Documentos
```typescript
class DocumentAnalysisService {
  private dockerService = createDockerService();
  
  async analyzeDocument(clientId: string, document: Buffer): Promise<string> {
    await this.dockerService.createContainer(clientId);
    await this.dockerService.copyFileToContainer(clientId, document, '/app/doc.pdf');
    return await this.dockerService.execCommand(clientId, 'analyze /app/doc.pdf');
  }
}
```

## 🎯 Benefícios da Refatoração

### ✅ Antes vs Depois

| Antes | Depois |
|-------|--------|
| Acoplado com Express | Zero acoplamento HTTP |
| Acoplado com WebSocket | Apenas EventEmitter |
| Código monolítico | Modular e reutilizável |
| Configuração hardcoded | DI e configuração flexível |
| Error handling básico | Error handling robusto |
| Sem TypeScript strict | TypeScript strict |
| Sem testes unitários | Testável isoladamente |

### 🔄 Compatibilidade
- **Interface preservada**: Implementa `IDockerService` completamente
- **Event-driven**: Fácil integração com qualquer sistema
- **Zero breaking changes**: Substitui o código atual sem modificações

## 📝 Próximos Passos

1. **Testes Unitários**: Criar suite completa de testes
2. **Docker Compose**: Integração com multi-container setups
3. **Health Checks**: Monitoramento avançado de saúde
4. **Metrics**: Integração com Prometheus/Grafana
5. **Container Pools**: Pre-warm containers para performance

---

**Módulo Docker Refatorado - Zero Acoplamento ✅ Máxima Modularidade ✅**