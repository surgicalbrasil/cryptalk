#!/bin/bash

echo "=== Limpeza do Ambiente Claude Service ==="

# Parar e remover containers de teste
echo "Parando containers de teste..."
docker stop claude-service-test-main claude-service-test-simple claude-service-test-production 2>/dev/null || true
docker rm claude-service-test-main claude-service-test-simple claude-service-test-production 2>/dev/null || true

# Remover imagens de teste
echo "Removendo imagens de teste..."
docker rmi claude-service:main claude-service:simple claude-service:production claude-service:test claude-service:prod claude-service:fixed 2>/dev/null || true

# Remover volumes órfãos
echo "Removendo volumes órfãos..."
docker volume prune -f 2>/dev/null || true

# Remover networks órfãs
echo "Removendo networks órfãs..."
docker network prune -f 2>/dev/null || true

echo "✓ Limpeza concluída!"
echo ""
echo "Para testar novamente:"
echo "docker-compose -f docker-compose.test.yml up --build"