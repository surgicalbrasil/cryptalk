# WebSocket Module

Módulo WebSocket/Events completamente modular e desacoplado para comunicação em tempo real.

## Características

- **Zero Hardcoded Ports**: Configuração totalmente externa via DI
- **EventBus Central**: Sistema pub/sub para desacoplamento inter-módulos
- **Message Queue**: Filas confiáveis para delivery garantido
- **Notification System**: Notificações estruturadas e tipadas
- **Health Monitoring**: Heartbeat, reconnection logic e métricas
- **TypeScript Strict**: Tipagem completa com interfaces bem definidas

## Arquitetura

```
WebSocketModule
├── EventBus          # Sistema de eventos central
├── MessageQueue      # Filas de mensagens por cliente
├── NotificationService # Notificações estruturadas
└── WebSocketService  # Servidor WebSocket principal
```

## Componentes

### EventBus
Sistema de eventos central que implementa pattern pub/sub:
- Suporte a wildcards e patterns
- Histórico de eventos
- Métricas em tempo real
- Tópicos organizados
- Cleanup automático

### MessageQueue
Sistema de filas para cada cliente:
- FIFO queue por cliente
- Batch operations
- Persistência opcional
- Retry logic
- Métricas de fila

### NotificationService
Serviço de notificações tipadas:
- Templates configuráveis
- Histórico por cliente
- Batching opcional
- Progress updates
- Sistema de alertas

### WebSocketService
Servidor WebSocket principal:
- Gerenciamento de conexões
- Heartbeat automático
- Broadcasting inteligente
- Métricas de conexão
- Health monitoring

## Uso

### Básico

```typescript
import { createWebSocketModule, createDefaultConfig } from './websocket';

// Criar módulo
const wsModule = createWebSocketModule(createDefaultConfig());

// Iniciar servidor
await wsModule.start({
  port: 8080,
  host: '0.0.0.0',
  heartbeatInterval: 30000,
  reconnectAttempts: 3,
  reconnectDelay: 1000,
  messageQueueSize: 1000
});

// Usar serviços
const { webSocketService, eventBus, notificationService } = wsModule;
```

### Avançado

```typescript
import { 
  createWebSocketModule, 
  WebSocketModuleConfig,
  validateConfig 
} from './websocket';

const config: WebSocketModuleConfig = {
  websocket: {
    port: Number(process.env.WS_PORT) || 8080,
    host: process.env.WS_HOST || '0.0.0.0',
    heartbeatInterval: 30000,
    compression: true,
    cors: {
      origin: ['http://localhost:3000'],
      credentials: true
    }
  },
  eventBus: {
    maxHistorySize: 5000
  },
  messageQueue: {
    maxSize: 2000,
    persistToDisk: true,
    retryAttempts: 5
  },
  notifications: {
    enableBatching: true,
    batchInterval: 500,
    maxBatchSize: 20
  }
};

// Validar configuração
const validation = validateConfig(config);
if (!validation.valid) {
  throw new Error(`Invalid config: ${validation.errors.join(', ')}`);
}

// Criar e iniciar módulo
const wsModule = createWebSocketModule(config);
await wsModule.start(config.websocket!);
```

## API

### WebSocketService

```typescript
// Registrar cliente
await webSocketService.registerClient(clientId, ws, metadata);

// Enviar mensagem
await webSocketService.sendToClient(clientId, {
  id: 'msg_123',
  type: 'event',
  event: 'user_update',
  data: { userId: 123, status: 'online' },
  timestamp: new Date()
});

// Broadcast
await webSocketService.broadcastToAll(message, {
  excludeClient: 'client_1',
  filter: (client) => client.metadata.role === 'admin'
});

// Health check
const health = await webSocketService.getConnectionHealth(clientId);
```

### EventBus

```typescript
// Publicar evento
await eventBus.publish('user:login', { userId: 123 });

// Subscrever
const subId = eventBus.subscribe('user:*', (event, data) => {
  console.log(`Event ${event}:`, data);
});

// Tópicos
await eventBus.createTopic('notifications');
await eventBus.publishToTopic('notifications', 'new_message', data);

// Métricas
const metrics = await eventBus.getMetrics();
```

### NotificationService

```typescript
// Notificação simples
await notificationService.sendNotification(clientId, {
  type: 'success',
  title: 'Upload Complete',
  message: 'Your file has been uploaded successfully'
});

// Progress update
await notificationService.sendProgressUpdate(clientId, {
  taskId: 'upload_123',
  progress: 75,
  status: 'Processing...'
});

// Alerta crítico
await notificationService.sendAlert(clientId, {
  level: 'critical',
  source: 'Security',
  message: 'Multiple failed login attempts detected'
});
```

### MessageQueue

```typescript
// Adicionar mensagem
await messageQueue.enqueue(clientId, message);

// Processar fila
const message = await messageQueue.dequeue(clientId);

// Batch operations
const messages = await messageQueue.dequeueBatch(clientId, 10);
await messageQueue.enqueueBatch(clientId, messages);

// Estatísticas
const stats = messageQueue.getQueueStats(clientId);
```

## Eventos

O módulo publica eventos importantes no EventBus:

### WebSocket Events
- `websocket:server_started` - Servidor iniciado
- `websocket:server_stopped` - Servidor parado
- `websocket:client_connected` - Cliente conectado
- `websocket:client_disconnected` - Cliente desconectado
- `websocket:message_sent` - Mensagem enviada
- `websocket:message_received` - Mensagem recebida
- `websocket:broadcast_sent` - Broadcast enviado
- `websocket:error` - Erro no WebSocket

### Client Events
- `client:connected` - Cliente conectado
- `client:disconnected` - Cliente desconectado

### Message Events
- `message:sent` - Mensagem enviada
- `message:received` - Mensagem recebida

### Notification Events
- `notification:sent` - Notificação enviada
- `notification:read` - Notificação lida
- `notification:history_cleared` - Histórico limpo

### Progress Events
- `progress:updated` - Progresso atualizado

### Alert Events
- `alert:sent` - Alerta enviado

## Configuração via Environment

```bash
# WebSocket
WS_PORT=8080
WS_HOST=0.0.0.0
WS_HEARTBEAT_INTERVAL=30000

# EventBus
EVENT_BUS_HISTORY_SIZE=1000

# MessageQueue
MESSAGE_QUEUE_SIZE=1000
MESSAGE_QUEUE_PERSIST=false

# Notifications
NOTIFICATION_BATCH_ENABLED=false
NOTIFICATION_AUTO_CLOSE=5000
```

## Monitoramento

### Métricas WebSocket
```typescript
const status = webSocketService.getStatus();
// {
//   running: true,
//   activeConnections: 42,
//   totalConnections: 156,
//   uptime: 3600000
// }
```

### Métricas EventBus
```typescript
const metrics = await eventBus.getMetrics();
// {
//   totalEvents: 1234,
//   activeSubscriptions: 56,
//   eventsPerSecond: 12.5,
//   topEvents: [
//     { event: 'user:login', count: 89 },
//     { event: 'message:sent', count: 67 }
//   ]
// }
```

### Health Check
```typescript
const health = await webSocketService.getConnectionHealth(clientId);
// {
//   isAlive: true,
//   latency: 42,
//   lastActivity: Date,
//   messagesSent: 123,
//   messagesReceived: 89
// }
```

## Shutdown Graceful

```typescript
// Parar servidor
await wsModule.stop();

// Destruir completamente
await wsModule.destroy();
```

## Segurança

- Validação de input em todas as interfaces
- Rate limiting via configuração externa
- CORS configurável
- Sanitização de dados
- Cleanup automático de recursos
- Timeouts configuráveis

## Performance

- Connection pooling automático
- Message batching opcional
- Compression configurável
- Heartbeat otimizado
- Cleanup periódico
- Métricas em tempo real

## Error Handling

- Try/catch em todas as operações
- Logging estruturado
- Fallback para filas em caso de erro
- Reconnection automática
- Circuit breaker pattern
- Error propagation via EventBus