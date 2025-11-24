# Multi-stage build para otimização
FROM node:18-alpine AS builder

# Instalar dependências de build
RUN apk add --no-cache python3 make g++ git

# Diretório de trabalho
WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production && npm cache clean --force

# Estágio de produção
FROM node:18-alpine

# Instalar dependências do sistema
RUN apk add --no-cache \
    dumb-init \
    curl \
    docker-cli \
    shadow \
    && rm -rf /var/cache/apk/*

# Criar usuário não-root com UID/GID específicos
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Criar grupo docker com GID disponível
RUN addgroup -g 998 -S docker && \
    adduser nodejs docker

# Diretório de trabalho
WORKDIR /app

# Copiar dependências do builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copiar código da aplicação
COPY --chown=nodejs:nodejs . .

# Criar diretórios necessários com permissões corretas
RUN mkdir -p uploads/pending uploads/processing uploads/completed uploads/failed logs data && \
    chown -R nodejs:nodejs /app && \
    chmod -R 755 uploads logs data

# Configurar permissões executáveis
RUN chmod +x health-check.js orchestrator.js claude-analyzer.js || true

# Script simples de entrypoint
RUN echo '#!/bin/sh' > /usr/local/bin/docker-entrypoint.sh && \
    echo 'exec dumb-init -- "$@"' >> /usr/local/bin/docker-entrypoint.sh && \
    chmod +x /usr/local/bin/docker-entrypoint.sh

# Usuário não-root
USER nodejs

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node health-check.js || exit 1

# Usar script customizado como entrypoint
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# Comando padrão
CMD ["node", "orchestrator.js"]