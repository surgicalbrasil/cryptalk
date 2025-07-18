# Multi-stage build para otimização
FROM node:18-alpine AS builder

# Instalar dependências de build
RUN apk add --no-cache python3 make g++

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
    && rm -rf /var/cache/apk/*

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Diretório de trabalho
WORKDIR /app

# Copiar dependências do builder
COPY --from=builder /app/node_modules ./node_modules

# Copiar código da aplicação
COPY --chown=nodejs:nodejs . .

# Criar diretórios necessários
RUN mkdir -p uploads/pending uploads/processing uploads/completed uploads/failed logs && \
    chown -R nodejs:nodejs uploads logs

# Configurar permissões
RUN chmod +x health-check.js

# Usuário não-root
USER nodejs

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node health-check.js

# Usar dumb-init para gerenciar sinais
ENTRYPOINT ["dumb-init", "--"]

# Comando padrão
CMD ["node", "orchestrator.js"]