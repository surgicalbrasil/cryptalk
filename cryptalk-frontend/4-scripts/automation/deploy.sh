#!/bin/bash

# CrypTalk Frontend Deploy Script
# Este script automatiza o processo de deploy

set -e

echo "🚀 Iniciando deploy do CrypTalk Frontend..."

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script na raiz do projeto"
    exit 1
fi

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Erro: Node.js não está instalado"
    exit 1
fi

# Verificar se o npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ Erro: npm não está instalado"
    exit 1
fi

# Limpar instalação anterior
echo "🧹 Limpando instalação anterior..."
rm -rf node_modules
rm -rf dist
rm -f package-lock.json

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Verificar se o arquivo .env existe
if [ ! -f ".env" ]; then
    echo "⚠️  Arquivo .env não encontrado. Copiando .env.example..."
    cp .env.example .env
    echo "✅ Arquivo .env criado. Configure as variáveis de ambiente antes de continuar."
fi

# Executar linting
echo "🔍 Executando linting..."
npm run lint

# Construir projeto
echo "🏗️  Construindo projeto..."
npm run build

# Verificar se a build foi bem-sucedida
if [ ! -d "dist" ]; then
    echo "❌ Erro: Build falhou - diretório dist não foi criado"
    exit 1
fi

echo "✅ Deploy concluído com sucesso!"
echo "📁 Arquivos de produção estão no diretório: dist/"
echo "🌐 Para testar localmente, execute: npm run preview"