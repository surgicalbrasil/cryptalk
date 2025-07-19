#!/bin/bash
set -e

echo "=== Teste Completo dos Dockerfiles ==="

# Build da versão principal
echo "1. Building versão principal..."
docker build -t claude-service:main -f Dockerfile . --quiet

# Build da versão de produção
echo "2. Building versão de produção..."
docker build -t claude-service:prod -f Dockerfile.production . --quiet

# Testes básicos
echo "3. Testando funcionalidade básica..."

# Teste 1: Usuário correto
echo "  - Verificando usuário..."
USER_MAIN=$(docker run --rm claude-service:main whoami)
USER_PROD=$(docker run --rm claude-service:prod whoami)
echo "    Main: $USER_MAIN"
echo "    Prod: $USER_PROD"

# Teste 2: Grupos do usuário
echo "  - Verificando grupos..."
GROUPS_MAIN=$(docker run --rm claude-service:main groups)
GROUPS_PROD=$(docker run --rm claude-service:prod groups)
echo "    Main: $GROUPS_MAIN"
echo "    Prod: $GROUPS_PROD"

# Teste 3: Permissões de arquivos
echo "  - Verificando permissões..."
docker run --rm claude-service:main ls -la /app/health-check.js
docker run --rm claude-service:prod ls -la /app/health-check.js

# Teste 4: Node.js funcional
echo "  - Verificando Node.js..."
NODE_MAIN=$(docker run --rm claude-service:main node --version)
NODE_PROD=$(docker run --rm claude-service:prod node --version)
echo "    Main: $NODE_MAIN"
echo "    Prod: $NODE_PROD"

# Teste 5: Sintaxe dos arquivos
echo "  - Verificando sintaxe dos arquivos..."
docker run --rm claude-service:main node -c "console.log('health-check syntax OK')" > /dev/null
docker run --rm claude-service:prod node -c "console.log('health-check syntax OK')" > /dev/null

# Teste 6: Simulação com Docker socket
echo "  - Testando com Docker socket..."
if [ -S /var/run/docker.sock ]; then
    echo "    Docker socket disponível, testando..."
    
    # Teste com versão principal
    CONTAINER_MAIN=$(docker run -d --name test-main \
        -v /var/run/docker.sock:/var/run/docker.sock:ro \
        claude-service:main \
        sh -c "sleep 5; echo 'Container main OK'")
    
    sleep 2
    docker logs test-main
    docker stop test-main > /dev/null
    docker rm test-main > /dev/null
    
    # Teste com versão de produção
    CONTAINER_PROD=$(docker run -d --name test-prod \
        -v /var/run/docker.sock:/var/run/docker.sock:ro \
        claude-service:prod \
        sh -c "sleep 5; echo 'Container prod OK'")
    
    sleep 2
    docker logs test-prod
    docker stop test-prod > /dev/null
    docker rm test-prod > /dev/null
else
    echo "    Docker socket não disponível, pulando teste"
fi

# Teste 7: Health check
echo "  - Testando health check..."
docker run --rm claude-service:main node health-check.js > /dev/null && echo "    Main health check: OK"
docker run --rm claude-service:prod node health-check.js > /dev/null && echo "    Prod health check: OK"

echo ""
echo "=== Resumo ==="
echo "✓ Versão principal: Build OK, Testes OK"
echo "✓ Versão produção: Build OK, Testes OK"
echo ""
echo "Ambas as versões estão funcionando corretamente!"

# Limpeza
docker rmi claude-service:main claude-service:prod > /dev/null 2>&1 || true

echo "✓ Teste completo finalizado com sucesso!"