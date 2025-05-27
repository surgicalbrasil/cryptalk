#!/bin/bash

echo "================================================"
echo "🚀 CrypTalk - Configuração Manual do Espaço"
echo "================================================"
echo ""
echo "Para completar a configuração, siga estes passos:"
echo ""
echo "1. Execute este comando em outro terminal:"
echo "   w3 space create cryptalk-storage --no-recovery"
echo ""
echo "2. Escolha o método de billing:"
echo "   - Via Email: Você receberá um email"
echo "   - Via GitHub: Login com GitHub"
echo ""
echo "3. Depois de criar, liste seus espaços:"
echo "   w3 space ls"
echo ""
echo "4. Copie o DID do espaço (did:key:...)"
echo ""
echo "5. Cole o DID aqui e pressione ENTER:"
read -p "VITE_W3S_SPACE_DID=" SPACE_DID

if [ -z "$SPACE_DID" ]; then
    echo "❌ DID não fornecido"
    exit 1
fi

echo ""
echo "6. Digite seu email (usado no billing):"
read -p "VITE_W3S_EMAIL=" EMAIL

# Update .env.local
sed -i "s/VITE_W3S_SPACE_DID=/VITE_W3S_SPACE_DID=$SPACE_DID/" .env.local

if [ ! -z "$EMAIL" ]; then
    sed -i "s/VITE_W3S_EMAIL=/VITE_W3S_EMAIL=$EMAIL/" .env.local
fi

echo ""
echo "✅ Configuração salva em .env.local!"
echo ""
echo "Próximos passos:"
echo "1. Reinicie o servidor: npm run dev"
echo "2. Acesse: http://localhost:5173/test-upload"
echo "3. Faça upload de um arquivo para testar"
echo ""
echo "Para verificar seus uploads:"
echo "- w3 ls"
echo "- https://console.web3.storage/"