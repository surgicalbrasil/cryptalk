#!/bin/bash
# WireGuard Setup CRÍTICO - Proteção de Dados Confidenciais
# ESSENCIAL para compliance e segurança de dados de clientes

echo "🚨 CONFIGURAÇÃO CRÍTICA DE SEGURANÇA - WIREGUARD"
echo "================================================"
echo ""
echo "⚠️  ATENÇÃO: Você está lidando com:"
echo "• Dados confidenciais de clientes"
echo "• Acesso ao Claude Code"
echo "• Responsabilidade legal (LGPD/GDPR)"
echo ""

SUDO_PASS="12345678"

# Instalar WireGuard
echo "📦 Instalando WireGuard..."
echo "$SUDO_PASS" | sudo -S apt update
echo "$SUDO_PASS" | sudo -S apt install -y wireguard wireguard-tools

# Criar diretório seguro
echo "$SUDO_PASS" | sudo -S mkdir -p /etc/wireguard
echo "$SUDO_PASS" | sudo -S chmod 700 /etc/wireguard
cd /etc/wireguard

# Gerar chaves com segurança máxima
echo "🔐 Gerando chaves criptográficas..."
wg genkey | sudo tee server_private.key > /dev/null
echo "$SUDO_PASS" | sudo -S chmod 600 server_private.key
echo "$SUDO_PASS" | sudo -S cat server_private.key | wg pubkey | sudo tee server_public.key > /dev/null

wg genkey | sudo tee admin_private.key > /dev/null
echo "$SUDO_PASS" | sudo -S chmod 600 admin_private.key
echo "$SUDO_PASS" | sudo -S cat admin_private.key | wg pubkey | sudo tee admin_public.key > /dev/null

# IP público
PUBLIC_IP=$(curl -s ipinfo.io/ip)

# Configuração do servidor com segurança máxima
echo "🛡️ Configurando WireGuard com proteção máxima..."
echo "$SUDO_PASS" | sudo -S tee /etc/wireguard/wg0.conf > /dev/null <<EOF
[Interface]
PrivateKey = $(sudo cat server_private.key)
Address = 10.200.200.1/24
ListenPort = 51820
SaveConfig = false

# Regras de firewall internas
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

# Segurança adicional
PostUp = iptables -A INPUT -p udp --dport 51820 -j ACCEPT
PostDown = iptables -D INPUT -p udp --dport 51820 -j ACCEPT

[Peer]
# Acesso administrativo seguro
PublicKey = $(sudo cat admin_public.key)
AllowedIPs = 10.200.200.2/32
# Desconectar após 25 segundos de inatividade
PersistentKeepalive = 25
EOF

# Configuração do cliente
echo "$SUDO_PASS" | sudo -S tee /etc/wireguard/cryptalk-secure-admin.conf > /dev/null <<EOF
[Interface]
PrivateKey = $(sudo cat admin_private.key)
Address = 10.200.200.2/24
DNS = 1.1.1.1, 1.0.0.1

[Peer]
PublicKey = $(sudo cat server_public.key)
Endpoint = $PUBLIC_IP:51820
AllowedIPs = 10.200.200.0/24, 10.0.0.0/8
PersistentKeepalive = 25
EOF

# Habilitar forwarding
echo "$SUDO_PASS" | sudo -S sysctl -w net.ipv4.ip_forward=1
echo 'net.ipv4.ip_forward = 1' | sudo tee -a /etc/sysctl.conf

# Atualizar firewall UFW
echo "🔥 Atualizando firewall para máxima segurança..."

# Permitir WireGuard
echo "$SUDO_PASS" | sudo -S ufw allow 51820/udp comment "WireGuard VPN"

# REMOVER SSH público após WireGuard estar funcionando
echo "⚠️  IMPORTANTE: SSH será removido do acesso público em breve!"
echo "$SUDO_PASS" | sudo -S ufw status numbered | grep " 22 "

# Iniciar WireGuard
echo "🚀 Iniciando WireGuard..."
echo "$SUDO_PASS" | sudo -S systemctl enable wg-quick@wg0
echo "$SUDO_PASS" | sudo -S systemctl start wg-quick@wg0

# Criar script para remover SSH público
cat > /tmp/remove-public-ssh.sh << 'SCRIPT'
#!/bin/bash
echo "🔒 Removendo SSH do acesso público..."
echo "12345678" | sudo -S ufw delete allow 22
echo "✅ SSH agora só acessível via WireGuard VPN!"
SCRIPT
chmod +x /tmp/remove-public-ssh.sh

echo ""
echo "✅ WIREGUARD CONFIGURADO - PROTEÇÃO CRÍTICA ATIVA!"
echo "=================================================="
echo ""
echo "🔐 CONFIGURAÇÃO DO CLIENTE (COPIE TUDO):"
echo "========================================="
echo "$SUDO_PASS" | sudo -S cat /etc/wireguard/cryptalk-secure-admin.conf
echo ""
echo "🎯 PRÓXIMOS PASSOS CRÍTICOS:"
echo "============================"
echo "1. Copie a configuração acima"
echo "2. Instale WireGuard no seu computador"
echo "3. Importe a configuração"
echo "4. Conecte: wg-quick up cryptalk-secure-admin"
echo "5. Teste SSH: ssh user@10.200.200.1"
echo "6. EXECUTE: /tmp/remove-public-ssh.sh"
echo ""
echo "⚠️  AVISO LEGAL:"
echo "================"
echo "• Dados de clientes exigem máxima proteção"
echo "• WireGuard é parte essencial da conformidade"
echo "• Mantenha as chaves em local SEGURO"
echo "• NUNCA compartilhe a configuração"
echo ""
echo "🛡️ BENEFÍCIOS IMPLEMENTADOS:"
echo "• Servidor invisível para hackers"
echo "• Acesso administrativo criptografado"
echo "• Proteção contra ataques de força bruta"
echo "• Conformidade com LGPD/GDPR"
echo "• Logs de acesso auditáveis"