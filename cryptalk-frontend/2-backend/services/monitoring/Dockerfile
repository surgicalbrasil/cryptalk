FROM node:18-alpine

# Instalar dependências do sistema necessárias
RUN apk add --no-cache \
    curl \
    docker-cli \
    procps \
    coreutils \
    grep \
    sed \
    ca-certificates

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Criar diretórios necessários
RUN mkdir -p /app/logs /app/config /app/data && \
    chown -R nodejs:nodejs /app

# Diretório de trabalho
WORKDIR /app

# Copiar package.json primeiro para otimizar cache do Docker
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production && \
    npm cache clean --force

# Copiar código do projeto
COPY --chown=nodejs:nodejs . .

# Garantir que os scripts sejam executáveis
RUN chmod +x /app/*.js

# Mudar para usuário não-root
USER nodejs

# Expor portas
EXPOSE 3003 9090

# Variables de ambiente padrão
ENV NODE_ENV=production
ENV LOG_LEVEL=info
ENV MONITORING_PORT=3003

# Health check mais robusto
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3003/health || exit 1

# Comando de inicialização
CMD ["node", "monitoring-service.js"]