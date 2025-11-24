# Upload Module

Módulo completamente modular e desacoplado para gerenciamento de upload e arquivos no sistema CrypTalk.

## Características Principais

- **Zero Acoplamento**: Não depende de frameworks HTTP (Express, Fastify, etc.)
- **Event-Driven**: Comunicação baseada em EventEmitter
- **TypeScript Strict**: Tipagem completa e rigorosa
- **Validação Robusta**: Validação de segurança e estrutura de arquivos
- **Storage Flexível**: Suporte a memory, disk e hybrid storage
- **Upload Resumível**: Suporte a uploads em chunks
- **Batch Processing**: Processamento em lote de múltiplos arquivos
- **Container Integration**: Integração com containers Docker

## Arquitetura

```
modules/upload/
├── FileValidator.ts     # Validação robusta e modular
├── FileService.ts       # Implementação principal
├── UploadManager.ts     # Gerenciamento avançado de uploads
├── index.ts            # Exportações e factory functions
└── README.md           # Esta documentação
```

## Componentes

### FileValidator
Responsável pela validação de arquivos, incluindo:
- Validação de estrutura e integridade
- Verificação de assinaturas (magic numbers)
- Scan básico de malware
- Análise de conteúdo
- Verificação de regras por tipo de documento

### FileService
Implementação principal do serviço de arquivos:
- Processamento de uploads
- Gerenciamento de metadados
- Operações CRUD de arquivos
- Storage flexível (memory/disk/hybrid)
- Estatísticas e monitoramento

### UploadManager
Gerenciamento avançado de uploads:
- Upload resumível (chunked)
- Processamento em lote
- Integração com containers
- Sessões de upload
- Operações assíncronas

## Uso Básico

```typescript
import { initializeUploadModule } from './modules/upload';

// Inicializar módulo completo
const uploadModule = initializeUploadModule({
  fileService: {
    uploadPath: '/app/uploads',
    maxFileSize: 50 * 1024 * 1024, // 50MB
    storage: {
      type: 'hybrid',
      memoryLimit: 100 * 1024 * 1024 // 100MB
    }
  }
});

// Upload básico
const metadata = await uploadModule.processUpload(
  fileBuffer,
  'documento.pdf',
  'financial',
  'client-123'
);

// Upload resumível
const sessionId = await uploadModule.startResumableUpload(
  'large-file.pdf',
  fileSize,
  'pitch-deck',
  'client-123'
);

// Processar chunk
await uploadModule.resumeUpload(sessionId, chunkBuffer, offset);

// Processamento em lote
const results = await uploadModule.processBatch([
  { buffer: file1Buffer, name: 'doc1.pdf', type: 'legal' },
  { buffer: file2Buffer, name: 'doc2.xlsx', type: 'financial' }
], 'client-123');

// Limpeza
uploadModule.destroy();
```

## Uso Individual dos Serviços

```typescript
import { createFileService, createUploadManager, createFileValidator } from './modules/upload';

// Apenas validação
const validator = createFileValidator({
  enableMalwareScanning: true,
  strictMimeTypeValidation: true
});

const validation = await validator.validateFileStructure(buffer, 'technical');

// Apenas storage
const fileService = createFileService({
  storage: { type: 'disk', diskPath: '/data/files' }
});

const metadata = await fileService.processUpload(buffer, 'file.pdf', 'legal', 'client-1');

// Gerenciamento avançado
const uploadManager = createUploadManager({
  chunkedUpload: { enabled: true, chunkSize: 2 * 1024 * 1024 },
  batchProcessing: { maxBatchSize: 20 }
});
```

## Configurações

### FileServiceConfig
```typescript
interface FileServiceConfig {
  uploadPath: string;                    // Caminho de upload
  tempPath: string;                      // Caminho temporário
  maxFileSize: number;                   // Tamanho máximo (bytes)
  maxConcurrentUploads: number;          // Uploads simultâneos
  cleanupInterval: number;               // Intervalo de limpeza (ms)
  maxFileAge: number;                    // Idade máxima (ms)
  enableFileCompression: boolean;        // Compressão
  enableFileEncryption: boolean;         // Criptografia
  storage: {
    type: 'memory' | 'disk' | 'hybrid';
    memoryLimit: number;                 // Limite de memória
    diskPath: string;                    // Caminho no disco
  };
}
```

### UploadManagerConfig
Extends FileServiceConfig plus:
```typescript
interface UploadManagerConfig {
  chunkedUpload: {
    enabled: boolean;
    chunkSize: number;                   // Tamanho do chunk
    maxChunks: number;                   // Máximo de chunks
    chunkTimeout: number;                // Timeout do chunk
  };
  batchProcessing: {
    enabled: boolean;
    maxBatchSize: number;                // Tamanho máximo do lote
    maxConcurrentBatches: number;        // Lotes simultâneos
    batchTimeout: number;                // Timeout do lote
  };
  containerIntegration: {
    enabled: boolean;
    defaultContainerPath: string;       // Caminho no container
    transferTimeout: number;             // Timeout de transferência
  };
}
```

## Tipos de Documento Suportados

- **pitch-deck**: PDF, PPT, PPTX (até 50MB)
- **financial**: PDF, XLS, XLSX, CSV (até 25MB)
- **legal**: PDF, DOC, DOCX (até 20MB)
- **technical**: PDF, MD, DOC, DOCX (até 30MB)
- **patent**: PDF, DOC, DOCX (até 15MB)

## Eventos

O módulo emite eventos para monitoramento e integração:

```typescript
uploadManager.on('file_uploaded', (data) => {
  console.log('Arquivo enviado:', data.fileId);
});

uploadManager.on('chunk_uploaded', (data) => {
  console.log('Progresso:', data.progress + '%');
});

uploadManager.on('security_warning', (data) => {
  console.warn('Alerta de segurança:', data);
});

uploadManager.on('batch_completed', (data) => {
  console.log('Lote processado:', data.successCount, 'sucessos');
});
```

## Validação e Segurança

- Verificação de magic numbers (assinaturas de arquivo)
- Validação de MIME types
- Verificação de tamanho por tipo de documento
- Scan básico de malware (heurísticas)
- Verificação de integridade com hash
- Detecção de arquivos criptografados/protegidos
- Validação de estrutura específica por tipo

## Storage Backends

### Memory Storage
- Arquivos armazenados em Buffer na memória
- Acesso rápido, limitado pela RAM
- Ideal para arquivos pequenos

### Disk Storage
- Arquivos salvos no sistema de arquivos
- Maior capacidade, acesso mais lento
- Persistente entre reinicializações

### Hybrid Storage
- Combina memory + disk
- Arquivos pequenos em memória
- Arquivos grandes no disco
- Balanceamento automático

## Integração com Containers

O módulo pode transferir arquivos para containers Docker:

```typescript
// Transferir arquivo para container
await uploadManager.transferToContainer(
  fileId,
  'container-id',
  '/app/uploads/file.pdf'
);

// Event emitido para integração
uploadManager.on('container_transfer_requested', (data) => {
  // Integrar com Docker API
  dockerManager.copyFileToContainer(
    data.containerId,
    data.containerPath,
    data.fileBuffer
  );
});
```

## Monitoramento

### Estatísticas
```typescript
const stats = await uploadManager.getStats();
// {
//   totalUploads: 150,
//   totalSize: 1073741824,
//   uploadsByType: { 'financial': 50, 'legal': 100 },
//   failures: 5,
//   averageSize: 7158278,
//   totalSizeMB: 1024,
//   lastCleanup: Date
// }
```

### Health Check
```typescript
import { checkModuleHealth } from './modules/upload';

const health = await checkModuleHealth();
// {
//   status: 'healthy',
//   components: {
//     fileService: 'healthy',
//     uploadManager: 'healthy',
//     fileValidator: 'healthy'
//   },
//   issues: [],
//   timestamp: Date
// }
```

## Migração do Código Antigo

Para migrar do `file-manager.js` antigo:

1. **Substituir multer**: O módulo não usa multer, recebe Buffers diretamente
2. **Event-based**: Usar eventos em vez de middleware Express
3. **Configuração**: Migrar configurações para os novos formatos
4. **Validação**: A validação agora é mais robusta e modular

### Exemplo de Migração

Antes (file-manager.js):
```javascript
const fileManager = new FileManager();
app.post('/upload', fileManager.getUploadMiddleware(), (req, res) => {
  // Processamento acoplado ao Express
});
```

Depois (novo módulo):
```typescript
const uploadModule = initializeUploadModule();

// Em seu handler HTTP (Express, Fastify, etc.)
async function handleUpload(fileBuffer, fileName, docType, clientId) {
  const metadata = await uploadModule.processUpload(
    fileBuffer, fileName, docType, clientId
  );
  return metadata;
}
```

## Benefícios da Refatoração

1. **Modularidade**: Cada componente tem responsabilidade única
2. **Testabilidade**: Fácil de testar unitariamente
3. **Reutilização**: Pode ser usado em diferentes contextos
4. **Manutenibilidade**: Código mais limpo e organizado
5. **Extensibilidade**: Fácil adicionar novas funcionalidades
6. **Performance**: Storage híbrido e otimizações
7. **Monitoramento**: Eventos detalhados para observabilidade