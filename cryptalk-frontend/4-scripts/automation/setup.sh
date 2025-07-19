#!/bin/bash

# CrypTalk Frontend Setup Script
# Este script configura o ambiente de desenvolvimento

set -e

echo "🔧 Configurando ambiente de desenvolvimento do CrypTalk..."

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script na raiz do projeto"
    exit 1
fi

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Erro: Node.js não está instalado"
    echo "💡 Instale o Node.js versão 18 ou superior: https://nodejs.org/"
    exit 1
fi

# Verificar versão do Node.js
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Erro: Node.js versão $NODE_VERSION não é suportada"
    echo "💡 Instale o Node.js versão 18 ou superior"
    exit 1
fi

echo "✅ Node.js versão $(node --version) detectado"

# Verificar se o npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ Erro: npm não está instalado"
    exit 1
fi

echo "✅ npm versão $(npm --version) detectado"

# Criar arquivo .env se não existir
if [ ! -f ".env" ]; then
    echo "📝 Criando arquivo .env..."
    cp .env.example .env
    echo "✅ Arquivo .env criado"
    echo "⚠️  Configure as variáveis de ambiente no arquivo .env antes de continuar"
else
    echo "✅ Arquivo .env já existe"
fi

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Criar diretórios necessários
echo "📁 Criando diretórios necessários..."
mkdir -p uploads/pending uploads/processing uploads/completed uploads/failed
mkdir -p logs
mkdir -p nginx/logs

# Verificar se a instalação foi bem-sucedida
if [ ! -d "node_modules" ]; then
    echo "❌ Erro: Instalação de dependências falhou"
    exit 1
fi

echo "✅ Configuração concluída com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "1. Configure as variáveis de ambiente no arquivo .env"
echo "2. Execute 'npm run dev' para iniciar o servidor de desenvolvimento"
echo "3. Execute 'npm run build' para criar a build de produção"
echo ""
echo "🌐 O servidor de desenvolvimento estará disponível em: http://localhost:5173"