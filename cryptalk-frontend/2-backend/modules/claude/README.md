# Claude AI Module

Módulo modular para integração com Claude AI, projetado com zero acoplamento e arquitetura event-driven.

## Características

- **Zero Acoplamento**: Não depende de outros módulos
- **Event-Driven**: Comunicação baseada em eventos
- **TypeScript Strict**: Tipagem completa e rigorosa
- **Session Management**: Gerenciamento isolado de sessões
- **Analysis Engine**: Engine dedicada para análise de documentos
- **Progress Tracking**: Acompanhamento em tempo real
- **Multi-Format Output**: Suporte a JSON, Markdown e HTML

## Estrutura

```
claude/
├── ClaudeService.ts      # Implementação principal
├── SessionManager.ts     # Gerenciamento de sessões
├── AnalysisEngine.ts     # Engine de análise
├── index.ts             # Exportações do módulo
└── README.md            # Esta documentação
```

## Uso Básico

### Importação

```typescript
import { 
  createClaudeService, 
  validateClaudeEnvironment 
} from './modules/claude';
```

### Configuração

```typescript
// Validar ambiente primeiro
const envValidation = await validateClaudeEnvironment({
  claudeCommand: 'claude',
  apiKey: process.env.ANTHROPIC_API_KEY,
  workingDirectory: '/home/user'
});

if (!envValidation.isValid) {
  console.error('Issues:', envValidation.issues);
  return;
}

// Criar serviço
const claudeService = createClaudeService({
  sessionTimeout: 30 * 60 * 1000,    // 30 minutos
  analysisTimeout: 5 * 60 * 1000,    // 5 minutos
  maxConcurrentAnalyses: 3,
  claudeCommand: 'claude',
  apiKey: process.env.ANTHROPIC_API_KEY,
  workingDirectory: '/home/user',
  tempDirectory: '/tmp'
});
```

### Análise de Documento

```typescript
// Criar sessão
const session = await claudeService.createSession('client-123', {
  documentType: 'pitch-deck',
  sessionTimeout: 45 * 60 * 1000  // 45 minutos
});

// Iniciar análise
const analysis = await claudeService.analyzeDocument({
  clientId: 'client-123',
  filePath: '/path/to/document.pdf',
  documentType: 'pitch-deck',
  options: {
    depth: 'comprehensive',
    format: 'json',
    language: 'pt-BR'
  }
});

// Acompanhar progresso
claudeService.on('analysis_progress', (data) => {
  console.log(`Progress: ${data.progress}%`);
});

// Aguardar conclusão
claudeService.on('analysis_completed', (data) => {
  console.log('Analysis completed:', data.result);
});
```

### Conversa Interativa

```typescript
// Enviar mensagem
const response = await claudeService.sendMessage(
  'client-123',
  'Quais são os principais pontos fortes do pitch deck?',
  {
    documentSummary: 'Pitch deck de startup de fintech...',
    userPreferences: { language: 'pt-BR' }
  }
);

console.log('Response:', response.content);

// Obter histórico
const history = await claudeService.getConversationHistory('client-123', 10);
```

## Eventos

O módulo emite os seguintes eventos:

### Eventos de Sessão
- `session_created`: Nova sessão criada
- `session_expired`: Sessão expirada
- `session_ended`: Sessão encerrada
- `session_renewed`: Sessão renovada

### Eventos de Análise
- `analysis_started`: Análise iniciada
- `analysis_progress`: Progresso da análise
- `analysis_completed`: Análise concluída
- `analysis_error`: Erro na análise

### Eventos de Erro
- `error`: Erro geral no serviço

### Exemplo de Listeners

```typescript
// Progresso de análise
claudeService.on('analysis_progress', (data) => {
  console.log(`Analysis ${data.analysisId}: ${data.progress}%`);
  if (data.chunk) {
    console.log('Output chunk:', data.chunk);
  }
});

// Sessão expirada
claudeService.on('session_expired', (clientId) => {
  console.log(`Session expired for client: ${clientId}`);
  // Notificar cliente para fazer novo upload
});

// Erros
claudeService.on('error', (error) => {
  console.error('Claude service error:', error);
});
```

## Tipos de Documento Suportados

- `pitch-deck`: Apresentações de negócios
- `patent`: Documentos de patente
- `financial`: Documentos financeiros
- `tech-doc`: Documentação técnica
- `legal-doc`: Documentos legais

## Formatos de Saída

- `json`: Estruturado com summary, insights, recommendations
- `markdown`: Formatação markdown para documentação
- `html`: HTML para exibição web

## Configuração Avançada

### Session Manager Standalone

```typescript
import { createSessionManager } from './modules/claude';

const sessionManager = createSessionManager({
  sessionTimeout: 45 * 60 * 1000,  // 45 minutos
  maxMessageHistory: 100,
  cleanupInterval: 10 * 60 * 1000, // 10 minutos
  maxSessions: 500
});
```

### Analysis Engine Standalone

```typescript
import { createAnalysisEngine } from './modules/claude';

const analysisEngine = createAnalysisEngine({
  claudeCommand: 'claude',
  apiKey: process.env.ANTHROPIC_API_KEY,
  analysisTimeout: 10 * 60 * 1000,  // 10 minutos
  maxFileSize: 100 * 1024 * 1024,   // 100MB
  allowedExtensions: ['.pdf', '.docx', '.txt']
});
```

## Monitoramento

### Métricas

```typescript
const metrics = await claudeService.getMetrics();
console.log({
  activeSessions: metrics.activeSessions,
  totalAnalyses: metrics.totalAnalyses,
  averageResponseTime: metrics.averageResponseTime,
  errorRate: metrics.errorRate
});
```

### Status de Saúde

```typescript
const health = await claudeService.getHealthStatus();
console.log({
  status: health.status,  // 'healthy' | 'degraded' | 'unhealthy'
  details: health.details
});
```

### Capacidades

```typescript
const capabilities = await claudeService.getCapabilities();
console.log({
  supportedFormats: capabilities.supportedFormats,
  maxFileSize: capabilities.maxFileSize,
  features: capabilities.features
});
```

## Tratamento de Erros

```typescript
try {
  const analysis = await claudeService.analyzeDocument(request);
} catch (error) {
  if (error.message.includes('Session not found')) {
    // Recriar sessão
    await claudeService.createSession(clientId);
  } else if (error.message.includes('File too large')) {
    // Tratar arquivo muito grande
    console.error('File exceeds maximum size limit');
  } else {
    // Erro genérico
    console.error('Analysis failed:', error.message);
  }
}
```

## Shutdown Graceful

```typescript
// Finalizar serviço adequadamente
process.on('SIGINT', async () => {
  console.log('Shutting down Claude service...');
  await claudeService.shutdown();
  process.exit(0);
});
```

## Templates Personalizados

O módulo inclui templates padrão para cada tipo de documento, mas você pode criar templates customizados:

```typescript
// Carregar template customizado
const customTemplate = await fs.readFile('./templates/custom-pitch.md', 'utf8');

// Usar no analysis engine
await analysisEngine.cacheTemplate('custom-pitch', customTemplate);
```

## Variáveis de Ambiente

```bash
# API Key do Claude (obrigatória)
ANTHROPIC_API_KEY=your-api-key
# ou
CLAUDE_API_KEY=your-api-key

# Comando Claude CLI (opcional, padrão: 'claude')
CLAUDE_COMMAND=claude

# Diretório de trabalho (opcional, padrão: process.cwd())
CLAUDE_WORKING_DIR=/home/user/workspace

# Diretório temporário (opcional, padrão: '/tmp')
CLAUDE_TEMP_DIR=/tmp/claude
```

## Requisitos

- Node.js 16+
- TypeScript 4.5+
- Claude CLI instalado e configurado
- Chave de API do Anthropic/Claude

## Limitações

- Máximo de 3 análises simultâneas por padrão
- Timeout de 5 minutos por análise
- Arquivos até 50MB por padrão
- Sessões expiram em 30 minutos por padrão

## Troubleshooting

### Claude CLI não encontrado
```bash
# Verificar instalação
which claude

# Instalar se necessário
npm install -g @anthropic-ai/claude-cli
```

### API Key inválida
- Verificar se a chave está correta
- Verificar se tem créditos disponíveis
- Verificar permissões da API key

### Timeout de análise
- Aumentar `analysisTimeout` na configuração
- Verificar tamanho do arquivo
- Verificar complexidade do documento

### Memória insuficiente
- Reduzir `maxConcurrentAnalyses`
- Reduzir `maxSessions`
- Implementar cleanup mais frequente