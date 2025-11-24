#!/bin/bash
# Setup WireGuard Security para CrypTalk
# Integra WireGuard com a arquitetura existente

echo "🔐 Configurando WireGuard para CrypTalk..."

# Verificar se já existe WireGuard
if command -v wg &> /dev/null; then
    echo "✅ WireGuard já instalado"
else
    echo "📦 Instalando WireGuard..."
    sudo apt update
    sudo apt install -y wireguard wireguard-tools
fi

# Criar diretório de configuração
sudo mkdir -p /etc/wireguard
cd /etc/wireguard

# Gerar chaves se não existirem
if [ ! -f server_private.key ]; then
    echo "🔑 Gerando chaves WireGuard..."
    wg genkey | sudo tee server_private.key
    sudo cat server_private.key | wg pubkey | sudo tee server_public.key
    wg genkey | sudo tee admin_private.key  
    sudo cat admin_private.key | wg pubkey | sudo tee admin_public.key
fi

# Obter IP público
PUBLIC_IP=$(curl -s ipinfo.io/ip)

# Configuração do servidor WireGuard
echo "⚙️ Configurando servidor WireGuard..."
sudo tee /etc/wireguard/wg0.conf > /dev/null <<EOF
[Interface]
PrivateKey = $(sudo cat server_private.key)
Address = 10.200.200.1/24
ListenPort = 51820
SaveConfig = true

# Habilitar forwarding para containers
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE; iptables -A FORWARD -i wg0 -o docker0 -j ACCEPT
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE; iptables -D FORWARD -i wg0 -o docker0 -j ACCEPT

[Peer]
# Admin access
PublicKey = $(sudo cat admin_public.key)
AllowedIPs = 10.200.200.2/32
EOF

# Configuração do cliente admin
echo "📱 Gerando configuração do cliente admin..."
sudo tee /etc/wireguard/cryptalk-admin.conf > /dev/null <<EOF
[Interface]
PrivateKey = $(sudo cat admin_private.key)
Address = 10.200.200.2/24
DNS = 1.1.1.1

[Peer]
PublicKey = $(sudo cat server_public.key)
Endpoint = $PUBLIC_IP:51820
AllowedIPs = 10.200.200.0/24
PersistentKeepalive = 25
EOF

# Habilitar IP forwarding
echo "🌐 Habilitando IP forwarding..."
echo 'net.ipv4.ip_forward = 1' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Configurar firewall para CrypTalk
echo "🔥 Configurando firewall para CrypTalk..."

# Resetar regras
sudo ufw --force reset

# Políticas padrão
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Portas públicas (via Cloudflare tunnel)
sudo ufw allow 443 comment "HTTPS via Cloudflare"
sudo ufw allow 51820/udp comment "WireGuard VPN"

# Acesso admin via WireGuard apenas
sudo ufw allow from 10.200.200.0/24 to any port 22 comment "SSH via VPN"
sudo ufw allow from 10.200.200.0/24 to any port 2376 comment "Docker via VPN"
sudo ufw allow from 10.200.200.0/24 to any port 3002 comment "API Gateway via VPN"

# Permitir acesso interno para containers
sudo ufw allow from 172.17.0.0/16 comment "Docker containers"
sudo ufw allow from 172.20.0.0/16 comment "Claude network"

# Habilitar firewall
sudo ufw --force enable

# Iniciar WireGuard
echo "🚀 Iniciando WireGuard..."
sudo systemctl enable wg-quick@wg0
sudo systemctl start wg-quick@wg0

# Verificar status
echo ""
echo "📊 Status WireGuard:"
sudo wg show

echo ""
echo "✅ WireGuard configurado para CrypTalk!"
echo ""
echo "📋 CONFIGURAÇÃO DO CLIENTE ADMIN:"
echo "=================================="
sudo cat /etc/wireguard/cryptalk-admin.conf

echo ""
echo "🔧 COMO USAR:"
echo "============="
echo "1. Copie a configuração acima para seu cliente WireGuard"
echo "2. Conecte: wg-quick up cryptalk-admin"
echo "3. Acesse servidor: ssh admin@10.200.200.1"
echo "4. Gerencie Docker: docker -H 10.200.200.1:2376 ps"
echo ""
echo "🚨 IMPORTANTE:"
echo "- SSH agora só funciona via VPN"
echo "- Docker daemon só acessível via VPN"
echo "- API pública continua funcionando via Cloudflare"