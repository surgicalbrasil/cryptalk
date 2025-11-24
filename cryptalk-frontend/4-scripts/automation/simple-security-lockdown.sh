#!/bin/bash
# Simple Security Lockdown - SEM instalar firewall
# Só para serviços desnecessários e usa iptables existente

echo "🔒 LOCKDOWN SIMPLES - SEM INSTALAÇÕES..."

# Verificar se tem permissões sudo
if ! sudo -n true 2>/dev/null; then
    echo "❌ Este script precisa de permissões sudo."
    echo "💡 Execute: sudo $0"
    exit 1
fi

echo "🛑 Parando serviços desnecessários..."

# Parar serviços que estão expostos publicamente  
pkill -f "http-server.*3000" 2>/dev/null && echo "✅ HTTP Server (3000) parado"
pkill -f "node.*4173" 2>/dev/null && echo "✅ Vite dev server (4173) parado"

# Parar processos em portas problemáticas
lsof -ti:8765 2>/dev/null | xargs kill -9 2>/dev/null && echo "✅ Serviço 8765 parado"
lsof -ti:8811 2>/dev/null | xargs kill -9 2>/dev/null && echo "✅ Serviço 8811 parado"

echo "⚠️  Mantendo ativos:"
echo "• SSH (22) - acesso Raspberry Pi"
echo "• N8N (5678) - projeto LinkedIn"  
echo "• Cloudflare tunnel (local) - CrypTalk"

# Verificar se iptables existe para regras básicas
if command -v iptables &> /dev/null; then
    echo ""
    echo "🔥 Aplicando regras básicas com iptables..."
    
    # Bloquear acesso externo às portas problemáticas
    sudo iptables -A INPUT -p tcp --dport 3000 -j DROP 2>/dev/null && echo "✅ Porta 3000 bloqueada"
    sudo iptables -A INPUT -p tcp --dport 3002 -j DROP 2>/dev/null && echo "✅ Porta 3002 bloqueada"
    sudo iptables -A INPUT -p tcp --dport 8080 -j DROP 2>/dev/null && echo "✅ Porta 8080 bloqueada"
    sudo iptables -A INPUT -p tcp --dport 4173 -j DROP 2>/dev/null && echo "✅ Porta 4173 bloqueada"
    
    echo "🔥 Regras iptables aplicadas"
else
    echo "⚠️  iptables não encontrado - só serviços parados"
fi

echo ""
echo "🔒 SEGURANÇA SIMPLES APLICADA:"
echo "=============================="
echo ""
echo "✅ SERVIÇOS PARADOS:"
echo "• HTTP Server (3000)"
echo "• Vite dev (4173)" 
echo "• Serviços desconhecidos (8765, 8811)"
echo ""
echo "✅ MANTIDOS ATIVOS:"
echo "• SSH (22) - Raspberry Pi"
echo "• N8N (5678) - LinkedIn project"
echo "• Cloudflare tunnel - CrypTalk"
echo ""
echo "🎯 RESULTADO:"
echo "• Portas desnecessárias fechadas"
echo "• Projetos importantes funcionando"
echo "• SEM instalações adicionais"

echo ""
echo "📊 STATUS ATUAL:"
echo "=================" 
echo "Serviços ativos: $(ss -tlnp | grep LISTEN | wc -l)"
ss -tlnp | grep LISTEN | head -5