#!/bin/bash

echo "================================================"
echo "🚀 CrypTalk - Criar Espaço Web3Storage"
echo "================================================"
echo ""
echo "Este script vai ajudá-lo a criar um espaço no Web3Storage"
echo ""

# Check if w3 is installed
if ! command -v w3 &> /dev/null; then
    echo "❌ W3 CLI não está instalado!"
    echo "Execute: npm install -g @web3-storage/w3cli"
    exit 1
fi

echo "✅ W3 CLI encontrado"
echo ""

# Check if logged in
echo "Verificando login..."
DID=$(w3 whoami 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "❌ Você não está logado no Web3Storage"
    echo "Execute: w3 login seu-email@example.com"
    exit 1
fi

echo "✅ Logado como: $DID"
echo ""

# List current spaces
echo "Espaços atuais:"
w3 space ls
echo ""

echo "⚠️  IMPORTANTE: O próximo comando requer interação!"
echo ""
echo "Quando perguntado sobre billing, escolha:"
echo "  - 'Via Email' ou"
echo "  - 'Via GitHub'"
echo ""
echo "Pressione ENTER para continuar..."
read

# Create space
echo "Criando espaço 'cryptalk-storage'..."
w3 space create cryptalk-storage

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Espaço criado com sucesso!"
    echo ""
    echo "Listando espaços para obter o DID:"
    w3 space ls
    echo ""
    echo "================================================"
    echo "📝 PRÓXIMO PASSO:"
    echo "================================================"
    echo ""
    echo "1. Copie o DID do espaço (começa com 'did:key:')"
    echo ""
    echo "2. Edite o arquivo .env.local:"
    echo "   nano .env.local"
    echo ""
    echo "3. Adicione o Space DID na linha:"
    echo "   VITE_W3S_SPACE_DID=did:key:SEU_SPACE_DID_AQUI"
    echo ""
    echo "4. Salve e o servidor reiniciará automaticamente"
    echo ""
    echo "================================================"
else
    echo ""
    echo "❌ Erro ao criar espaço"
    echo ""
    echo "Se você já tem um espaço, execute:"
    echo "  w3 space ls"
    echo ""
    echo "E copie o DID do espaço existente"
fi