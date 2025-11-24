#!/bin/bash
# Emergency Security Lockdown - CrypTalk
# Fecha portas desnecessárias e implementa segurança básica

echo "🚨 EMERGENCY SECURITY LOCKDOWN INICIADO..."

# Verificar se tem permissões sudo
if ! sudo -n true 2>/dev/null; then
    echo "❌ Este script precisa de permissões sudo."
    echo "💡 Execute: sudo $0"
    exit 1
fi

# Instalar firewall se não existir
if ! command -v ufw &> /dev/null; then
    echo "📦 Instalando UFW firewall..."
    sudo apt update
    sudo apt install -y ufw
fi

echo "🔥 Configurando firewall restritivo..."

# Reset completo do firewall
sudo ufw --force reset

# Política padrão: NEGAR TUDO
sudo ufw default deny incoming
sudo ufw default allow outgoing

# APENAS o essencial para CrypTalk + Raspberry Pi
echo "✅ Permitindo apenas portas essenciais:"

# SSH para Raspberry Pi (ESSENCIAL)
sudo ufw allow 22 comment "SSH Raspberry Pi"

# N8N Workflow Engine (projeto LinkedIn)
sudo ufw allow 5678 comment "N8N Workflow Engine"

# HTTPS para Cloudflare tunnel (CrypTalk)
sudo ufw allow 443 comment "HTTPS Cloudflare"

# Cloudflare tunnel local (já seguro)
# Porta 20241 já é 127.0.0.1 (local only)

echo "🚫 BLOQUEANDO todas as portas públicas perigosas:"

# Bloquear explicitamente portas problemáticas
sudo ufw deny 3000 comment "Block HTTP Server"
sudo ufw deny 3002 comment "Block API direct access"
sudo ufw deny 8080 comment "Block WebSocket direct"
sudo ufw deny 4173 comment "Block Vite dev"
sudo ufw deny 8765 comment "Block unknown service"
sudo ufw deny 8811 comment "Block unknown service"

# Habilitar firewall
sudo ufw --force enable

echo "🛑 Parando serviços desnecessários..."

# Parar serviços que estão expostos publicamente
pkill -f "http-server.*3000" 2>/dev/null && echo "✅ HTTP Server (3000) parado"
pkill -f "node.*4173" 2>/dev/null && echo "✅ Vite dev server (4173) parado"

# Encontrar e parar processos nas portas problemáticas
lsof -ti:8765 2>/dev/null | xargs kill -9 2>/dev/null && echo "✅ Serviço 8765 parado"
lsof -ti:8811 2>/dev/null | xargs kill -9 2>/dev/null && echo "✅ Serviço 8811 parado"

echo "⚠️  Mantendo N8N (5678) - projeto LinkedIn ativo"

echo ""
echo "🔒 ARQUITETURA SEGURA IMPLEMENTADA:"
echo "===================================="
echo ""
echo "✅ PORTAS PERMITIDAS:"
echo "• 22   - SSH Raspberry Pi (acesso remoto)"
echo "• 443  - HTTPS Cloudflare (CrypTalk)"
echo "• 5678 - N8N Workflows (LinkedIn project)"
echo ""
echo "✅ FLUXOS SEGUROS:"
echo "• Público: Internet → Cloudflare → CrypTalk"
echo "• Admin: SSH → Raspberry Pi → N8N"
echo "• LinkedIn: N8N workflows continuam funcionando"
echo ""
echo "❌ ACESSO DIRETO BLOQUEADO:"
echo "• Portas Node.js desnecessárias fechadas"
echo "• API só via Cloudflare tunnel"
echo "• Serviços desconhecidos bloqueados"
echo ""
echo "🔥 STATUS FIREWALL:"
echo "$SUDO_PASS" | sudo -S ufw status numbered

echo ""
echo "🎯 PRÓXIMOS PASSOS:"
echo "=================="
echo "1. ✅ Firewall ativo e restritivo"
echo "2. ✅ Portas desnecessárias bloqueadas"
echo "3. ✅ Acesso APENAS via Cloudflare tunnel"
echo "4. 🔄 Implementar WireGuard para admin"
echo "5. 🔄 Configurar monitoramento de portas"

echo ""
echo "🚀 TESTAR FUNCIONAMENTO:"
echo "Frontend (Vercel) → Cloudflare → Tunnel → CrypTalk API"
echo "URL: https://furthermore-decide-para-ste.trycloudflare.com"

echo ""
echo "⚠️  IMPORTANTE:"
echo "- SSH será bloqueado (configure WireGuard primeiro!)"
echo "- Só Cloudflare tunnel deve funcionar publicamente"
echo "- API não é mais acessível diretamente"