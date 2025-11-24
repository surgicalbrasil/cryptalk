# Teste do Módulo Docker - Validação de Modularização

Este teste valida que o módulo Docker está verdadeiramente modularizado e funciona de forma isolada.

## O que é testado

1. **Criação/Destruição de Containers**: Lifecycle completo
2. **Event System**: Eventos são emitidos corretamente  
3. **Error Handling**: Tratamento de erros robusto
4. **Configuration**: Configuração via DI funciona
5. **Isolation**: Módulo funciona independentemente

## Como executar os testes

```bash
# Instalar dependências
cd 2-backend/modules/docker
npm install

# Executar testes
npm test

# Executar com watch mode
npm run test:watch

# Executar com coverage
npm test -- --coverage
```

## Estrutura dos Testes

### 1. Container Lifecycle Management
- Criação de containers com configuração padrão e customizada
- Destruição normal e forçada
- Reinicialização de containers
- Validação de labels e configurações

### 2. Event System
- Eventos de ciclo de vida (created, destroyed)
- Eventos de erro com contexto
- Eventos de operações (file copy, command execution)
- Propagação correta de eventos do ContainerManager

### 3. Error Handling
- Validação de UUID
- Validação de buffers de arquivo
- Validação de caminhos (path traversal)
- Bloqueio de comandos perigosos
- Recuperação de erros

### 4. Configuration via DI
- Respeito aos limites de recursos
- Aplicação de configurações de segurança
- Uso correto de workspace paths
- Configurações customizadas

### 5. Module Isolation
- Sem dependências de HTTP/WebSocket
- Comunicação apenas via EventEmitter
- Gerenciamento de estado interno
- Isolamento entre instâncias

## Mock Strategy

O teste usa mocks completos do dockerode para:
- Testar a lógica do módulo sem Docker real
- Simular diferentes cenários de erro
- Validar chamadas e parâmetros
- Controlar o comportamento do Docker

## Resultados Esperados

✅ Todos os testes devem passar
✅ Coverage acima de 80%
✅ Zero dependências externas além de Docker
✅ Comunicação apenas via eventos
✅ Estado interno bem gerenciado

## Integração

O teste final demonstra como usar o módulo de forma completamente isolada:

```typescript
const service = new DockerService(config);

service.on('container-created', handler);
service.on('error', errorHandler);

const info = await service.createContainer(clientId);
await service.execCommand(clientId, 'node app.js');
await service.destroyContainer(clientId);
```

Isso prova que o módulo pode ser usado em qualquer contexto sem modificações.