# Correções do Dockerfile - Claude Service

## Problemas Identificados e Soluções

### 1. Problema do Grupo Docker (GID Conflict)
**Problema**: O Dockerfile original tentava criar um grupo docker com GID que já estava em uso.
**Solução**: Mudança para GID 998 que está disponível no sistema.

```dockerfile
# Antes (problemático)
RUN addgroup -g 999 -S docker && \
    adduser nodejs docker

# Depois (corrigido)
RUN addgroup -g 998 -S docker && \
    adduser nodejs docker
```

### 2. Gerenciamento de Permissões de Usuário
**Problema**: Permissões inconsistentes e complexidade desnecessária na criação de usuários.
**Solução**: Simplificação do processo de criação de usuários e grupos.

```dockerfile
# Criar usuário não-root com UID/GID específicos
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Criar grupo docker com GID disponível
RUN addgroup -g 998 -S docker && \
    adduser nodejs docker
```

### 3. Problemas de Build
**Problema**: Script RUN complexo com múltiplas condições falhando.
**Solução**: Simplificação do script de entrada e remoção de lógica complexa.

```dockerfile
# Script simples de entrypoint
RUN echo '#!/bin/sh' > /usr/local/bin/docker-entrypoint.sh && \
    echo 'exec dumb-init -- "$@"' >> /usr/local/bin/docker-entrypoint.sh && \
    chmod +x /usr/local/bin/docker-entrypoint.sh
```

### 4. Configuração de Permissões
**Problema**: Permissões incorretas em diretórios e arquivos.
**Solução**: Configuração adequada de ownership e permissões.

```dockerfile
# Criar diretórios necessários com permissões corretas
RUN mkdir -p uploads/pending uploads/processing uploads/completed uploads/failed logs data && \
    chown -R nodejs:nodejs /app && \
    chmod -R 755 uploads logs data

# Configurar permissões executáveis
RUN chmod +x health-check.js orchestrator.js claude-analyzer.js || true
```

## Versões Disponíveis

### 1. Dockerfile (Principal - Corrigido)
- Corrige todos os problemas identificados
- Mantém funcionalidade básica
- Entrypoint simples com dumb-init

### 2. Dockerfile.simple
- Versão mais simples e robusta
- Remove complexidade desnecessária
- Recomendado para produção

### 3. Dockerfile.production
- Versão avançada com gerenciamento dinâmico do Docker socket
- Funcionalidades extras para ambientes de produção
- Ajuste automático de permissões

## Testes Realizados

### Builds Bem-sucedidos ✅
- Dockerfile principal: ✅
- Dockerfile.simple: ✅
- Dockerfile.production: ✅

### Funcionalidades Testadas ✅
- Usuário correto (nodejs): ✅
- Grupos do usuário: ✅
- Permissões de arquivos: ✅
- Acesso ao Docker socket: ✅
- Health check: ✅
- Node.js funcional: ✅

### Comandos de Teste

```bash
# Build das imagens
docker build -t claude-service:main -f Dockerfile .
docker build -t claude-service:simple -f Dockerfile.simple .
docker build -t claude-service:production -f Dockerfile.production .

# Teste básico
docker run --rm claude-service:main whoami
docker run --rm claude-service:main groups

# Teste com Docker socket
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock:ro claude-service:main ls -la /var/run/docker.sock

# Teste de permissões
docker run --rm claude-service:main ls -la /app/

# Health check
docker run --rm claude-service:main node health-check.js
```

## Recomendações

1. **Para desenvolvimento**: Use `Dockerfile.simple`
2. **Para produção**: Use `Dockerfile` (principal corrigido)
3. **Para ambientes complexos**: Use `Dockerfile.production`

## Correções Aplicadas

1. ✅ Resolvido problema do grupo docker (GID conflict)
2. ✅ Ajustadas permissões de usuário
3. ✅ Garantido que o build funciona
4. ✅ Testada a imagem construída
5. ✅ Criados múltiplas versões para diferentes cenários

Todas as versões estão funcionando corretamente e prontas para uso.