#!/bin/bash
# Fix WireGuard Setup

echo "🔧 Corrigindo configuração WireGuard..."

SUDO_PASS="12345678"

# Copiar chaves
echo "$SUDO_PASS" | sudo -S cp /tmp/server_private.key /etc/wireguard/
echo "$SUDO_PASS" | sudo -S cp /tmp/server_public.key /etc/wireguard/
echo "$SUDO_PASS" | sudo -S cp /tmp/admin_private.key /etc/wireguard/
echo "$SUDO_PASS" | sudo -S cp /tmp/admin_public.key /etc/wireguard/

# Permissões corretas
echo "$SUDO_PASS" | sudo -S chmod 600 /etc/wireguard/server_private.key
echo "$SUDO_PASS" | sudo -S chmod 600 /etc/wireguard/admin_private.key
echo "$SUDO_PASS" | sudo -S chmod 644 /etc/wireguard/server_public.key
echo "$SUDO_PASS" | sudo -S chmod 644 /etc/wireguard/admin_public.key

# Ler chaves
SERVER_PRIVATE=$(cat /tmp/server_private.key)
SERVER_PUBLIC=$(cat /tmp/server_public.key)
ADMIN_PRIVATE=$(cat /tmp/admin_private.key)
ADMIN_PUBLIC=$(cat /tmp/admin_public.key)
PUBLIC_IP=$(curl -s ipinfo.io/ip)

echo "📝 Recriando configuração do servidor..."

# Configuração do servidor
echo "$SUDO_PASS" | sudo -S tee /etc/wireguard/wg0.conf > /dev/null <<EOF
[Interface]
PrivateKey = $SERVER_PRIVATE
Address = 10.200.200.1/24
ListenPort = 51820
SaveConfig = false

PostUp = iptables -A FORWARD -i %i -j ACCEPT; iptables -A FORWARD -o %i -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i %i -j ACCEPT; iptables -D FORWARD -o %i -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

[Peer]
PublicKey = $ADMIN_PUBLIC
AllowedIPs = 10.200.200.2/32
EOF

echo "📝 Recriando configuração do cliente..."

# Configuração do cliente
echo "$SUDO_PASS" | sudo -S tee /etc/wireguard/cryptalk-admin.conf > /dev/null <<EOF
[Interface]
PrivateKey = $ADMIN_PRIVATE
Address = 10.200.200.2/24
DNS = 1.1.1.1

[Peer]
PublicKey = $SERVER_PUBLIC
Endpoint = $PUBLIC_IP:51820
AllowedIPs = 10.200.200.0/24
PersistentKeepalive = 25
EOF

# Habilitar IP forwarding
echo "$SUDO_PASS" | sudo -S sysctl -w net.ipv4.ip_forward=1 > /dev/null

# Reiniciar WireGuard
echo "🔄 Reiniciando WireGuard..."
echo "$SUDO_PASS" | sudo -S systemctl stop wg-quick@wg0 2>/dev/null
echo "$SUDO_PASS" | sudo -S systemctl start wg-quick@wg0

# Verificar status
if echo "$SUDO_PASS" | sudo -S systemctl is-active wg-quick@wg0 >/dev/null 2>&1; then
    echo "✅ WireGuard iniciado com sucesso!"
else
    echo "❌ Erro ao iniciar WireGuard. Verificando logs..."
    echo "$SUDO_PASS" | sudo -S journalctl -u wg-quick@wg0 -n 10
fi

echo ""
echo "📋 CONFIGURAÇÃO DO CLIENTE:"
echo "=========================="
echo "$SUDO_PASS" | sudo -S cat /etc/wireguard/cryptalk-admin.conf

echo ""
echo "🔍 Status WireGuard:"
echo "$SUDO_PASS" | sudo -S wg show

echo ""
echo "✅ Configuração corrigida!"