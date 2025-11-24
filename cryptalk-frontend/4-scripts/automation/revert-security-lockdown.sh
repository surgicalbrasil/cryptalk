#!/bin/bash
# Revert Security Lockdown - CrypTalk
# Reverte todas as mudanças de segurança para estado original

echo "🔄 REVERTENDO LOCKDOWN DE SEGURANÇA..."

SUDO_PASS="12345678"

echo "🔥 Desabilitando firewall..."
echo "$SUDO_PASS" | sudo -S ufw disable

echo "🧹 Resetando todas as regras..."
echo "$SUDO_PASS" | sudo -S ufw --force reset

echo "📂 Restaurando política padrão do sistema..."
echo "$SUDO_PASS" | sudo -S ufw default allow incoming
echo "$SUDO_PASS" | sudo -S ufw default allow outgoing

echo ""
echo "✅ LOCKDOWN REVERTIDO COMPLETAMENTE!"
echo "=================================="
echo ""
echo "🔓 ESTADO ATUAL:"
echo "• Todas as portas liberadas novamente"
echo "• Firewall desabilitado"
echo "• Sistema como estava antes"
echo ""
echo "⚠️  ATENÇÃO:"
echo "• Sistema volta a ser vulnerável"
echo "• Todas as portas ficam expostas"
echo "• Use apenas para troubleshooting"
echo ""
echo "🔄 Para reativar segurança:"
echo "./emergency-security-lockdown.sh"

echo ""
echo "📊 STATUS FINAL:"
echo "================"
echo "Firewall: $(echo "$SUDO_PASS" | sudo -S ufw status | head -1)"
echo "Portas ativas: $(ss -tlnp | grep LISTEN | wc -l) serviços rodando"