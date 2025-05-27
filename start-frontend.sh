#!/bin/bash
echo "🚀 Iniciando CrypTalk Frontend..."
cd /home/surgical/my-claude-project/CrypTalk/cryptalk-frontend
echo "📦 Verificando dependências..."
npm install
echo "🌐 Iniciando servidor em http://localhost:5173"
echo "✅ Pressione Ctrl+C para parar"
npm run dev -- --host 0.0.0.0 --open