#!/bin/bash

echo "🔧 Corrigindo configuração do espaço Web3Storage"
echo ""

# 1. Mostrar agent atual
echo "1. Agent atual:"
AGENT_DID=$(w3 whoami | grep -oE 'did:key:[a-zA-Z0-9]+' | head -1)
echo "   $AGENT_DID"
echo ""

# 2. Criar novo espaço
echo "2. Criando novo espaço 'cryptalk-production'..."
w3 space create cryptalk-production --no-recovery 2>/dev/null || echo "   Espaço já existe"
echo ""

# 3. Listar espaços
echo "3. Espaços disponíveis:"
w3 space ls
echo ""

# 4. Obter o DID do novo espaço
SPACE_DID=$(w3 space ls | grep cryptalk-production | awk '{print $2}')
if [ -z "$SPACE_DID" ]; then
    echo "❌ Erro: Não foi possível encontrar o espaço cryptalk-production"
    exit 1
fi

echo "4. Space DID encontrado: $SPACE_DID"
echo ""

# 5. Usar o espaço
echo "5. Selecionando espaço..."
w3 space use $SPACE_DID
echo ""

# 6. Verificar se está provisionado
echo "6. Verificando provisionamento..."
w3 space info
echo ""

# 7. Atualizar .env.local
echo "7. Atualizando .env.local..."
sed -i "s|VITE_W3S_SPACE_DID=.*|VITE_W3S_SPACE_DID=$SPACE_DID|" .env.local
echo "   ✅ VITE_W3S_SPACE_DID=$SPACE_DID"
echo ""

# 8. Mostrar próximos passos
echo "✅ Configuração concluída!"
echo ""
echo "Próximos passos:"
echo "1. Reinicie o servidor: npm run dev"
echo "2. Acesse: http://localhost:5173/test-upload"
echo "3. Faça upload do arquivo documento-teste.txt"
echo ""
echo "Para verificar uploads:"
echo "   w3 ls"