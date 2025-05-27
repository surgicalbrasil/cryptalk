#!/bin/bash

echo "================================================"
echo "🔍 Verificando Status do CrypTalk Web3Storage"
echo "================================================"
echo ""

# Check space info
echo "📦 Informações do Espaço:"
w3 space info

echo ""
echo "📧 Email configurado: surgical.brasil@gmail.com"
echo ""

# Check if space is provisioned
PROVIDERS=$(w3 space info | grep "Providers:" | awk '{print $2}')

if [ "$PROVIDERS" != "none" ]; then
    echo "✅ Espaço provisionado com sucesso!"
    echo ""
    echo "🎉 Tudo pronto! Agora você pode:"
    echo "   1. Acessar http://localhost:5173/test-upload"
    echo "   2. Fazer upload de arquivos criptografados"
    echo "   3. Ver seus arquivos com: w3 ls"
    echo ""
    echo "🧪 Ou executar o teste rápido:"
    echo "   node test-upload.js"
else
    echo "⏳ Aguardando confirmação do email..."
    echo ""
    echo "📬 Verifique sua caixa de entrada:"
    echo "   - Procure por um email de web3.storage"
    echo "   - Clique no link de confirmação"
    echo "   - Depois execute este script novamente"
fi

echo ""
echo "================================================"