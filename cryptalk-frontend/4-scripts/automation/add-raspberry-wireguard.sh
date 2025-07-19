#!/bin/bash
# Adicionar Raspberry Pi ao WireGuard

echo "🔧 Adicionando Raspberry Pi ao WireGuard..."

SUDO_PASS="12345678"

# Gerar chaves para Raspberry Pi
echo "🔑 Gerando chaves para Raspberry Pi..."
cd /tmp
wg genkey | tee raspberry_private.key | wg pubkey > raspberry_public.key

RASPBERRY_PRIVATE=$(cat raspberry_private.key)
RASPBERRY_PUBLIC=$(cat raspberry_public.key)
SERVER_PUBLIC=$(echo "$SUDO_PASS" | sudo -S cat /etc/wireguard/server_public.key)

# Adicionar Raspberry como peer no servidor
echo "📝 Adicionando Raspberry Pi como peer..."

echo "$SUDO_PASS" | sudo -S tee -a /etc/wireguard/wg0.conf > /dev/null <<EOF

[Peer]
# Raspberry Pi N8N
PublicKey = $RASPBERRY_PUBLIC
AllowedIPs = 10.200.200.3/32
EOF

# Criar configuração para o Raspberry Pi
echo "📄 Criando configuração para Raspberry Pi..."

cat > raspberry-wireguard.conf <<EOF
[Interface]
PrivateKey = $RASPBERRY_PRIVATE
Address = 10.200.200.3/24
DNS = 1.1.1.1

[Peer]
PublicKey = $SERVER_PUBLIC
Endpoint = 186.204.222.37:51820
AllowedIPs = 10.200.200.0/24
PersistentKeepalive = 25
EOF

# Recarregar WireGuard
echo "🔄 Recarregando WireGuard..."
echo "$SUDO_PASS" | sudo -S systemctl reload wg-quick@wg0

echo ""
echo "✅ RASPBERRY PI ADICIONADO AO WIREGUARD!"
echo "========================================"
echo ""
echo "📋 CONFIGURAÇÃO PARA O RASPBERRY PI:"
echo "===================================="
cat raspberry-wireguard.conf
echo ""
echo "🎯 PRÓXIMOS PASSOS:"
echo "==================="
echo "1. Copie a configuração acima"
echo "2. No Raspberry Pi, instale WireGuard:"
echo "   sudo apt install wireguard"
echo "3. Crie o arquivo de configuração:"
echo "   sudo nano /etc/wireguard/wg0.conf"
echo "4. Cole a configuração"
echo "5. Inicie WireGuard:"
echo "   sudo wg-quick up wg0"
echo "6. Enable auto-start:"
echo "   sudo systemctl enable wg-quick@wg0"
echo ""
echo "📝 NOVA CONFIGURAÇÃO PARA N8N:"
echo "=============================="
echo "Host: 10.200.200.1"
echo "Port: 22"
echo "Username: nirmata"
echo "Private Key: (mesma chave SSH)"
echo ""
echo "🔍 Status atual do WireGuard:"
echo "$SUDO_PASS" | sudo -S wg show