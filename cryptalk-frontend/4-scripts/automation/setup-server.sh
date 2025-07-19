#!/bin/bash

# Script para configurar o servidor CrysTalk
echo "🚀 Configurando servidor CrysTalk..."

# Navegar para o diretório do servidor
cd server

# Instalar dependências do servidor
echo "📦 Instalando dependências do servidor..."
npm install

# Voltar para o diretório raiz
cd ..

# Verificar se Claude Code está instalado
if ! command -v claude &> /dev/null; then
    echo "⚠️  Claude Code não encontrado. Instalando..."
    
    # Instalar Claude Code (assumindo que o usuário tem permissões)
    if command -v npm &> /dev/null; then
        npm install -g @anthropic-ai/claude-code
    else
        echo "❌ NPM não encontrado. Instale o Node.js primeiro."
        exit 1
    fi
else
    echo "✅ Claude Code já está instalado"
fi

# Criar diretórios necessários
echo "📁 Criando estrutura de diretórios..."
mkdir -p server/client-containers
mkdir -p server/logs

# Configurar permissões
chmod +x scripts/*.sh

# Criar arquivo de configuração do ambiente
if [ ! -f server/.env ]; then
    echo "⚙️  Criando arquivo de configuração..."
    cat > server/.env << EOF
# Configuração do servidor CrysTalk
PORT=3001
WS_PORT=8080
NODE_ENV=development

# Configuração do Claude Code
CLAUDE_API_KEY=your_api_key_here

# Configuração de limpeza
CLEANUP_INTERVAL=3600000
MAX_CLIENT_AGE=86400000

# Configuração de upload
MAX_FILE_SIZE=52428800
ALLOWED_EXTENSIONS=.pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx

# Configuração de logging
LOG_LEVEL=info
LOG_FILE=logs/server.log
EOF
fi

echo "✅ Configuração do servidor concluída!"
echo ""
echo "Para iniciar o servidor:"
echo "  cd server"
echo "  npm start"
echo ""
echo "Para desenvolvimento:"
echo "  cd server"
echo "  npm run dev"