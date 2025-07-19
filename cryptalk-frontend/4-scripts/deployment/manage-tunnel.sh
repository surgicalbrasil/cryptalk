#!/bin/bash

# Script para gerenciar o Cloudflare Tunnel
# Uso: ./manage-tunnel.sh [start|stop|status|restart|logs]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/server"
CLOUDFLARED_BIN="$SCRIPT_DIR/cloudflared"
TUNNEL_LOG="$SCRIPT_DIR/tunnel.log"
SERVER_LOG="$SCRIPT_DIR/server.log"

start_server() {
    echo "Iniciando servidor backend..."
    cd "$SERVER_DIR" || exit 1
    
    # Verificar se o servidor já está rodando
    if pgrep -f "simple-server.js" > /dev/null; then
        echo "Servidor já está rodando na porta 3001"
    else
        nohup node simple-server.js > "$SERVER_LOG" 2>&1 &
        echo "Servidor iniciado. PID: $!"
        sleep 2
    fi
}

start_tunnel() {
    echo "Iniciando Cloudflare Tunnel..."
    cd "$SCRIPT_DIR" || exit 1
    
    # Verificar se o tunnel já está rodando
    if pgrep -f "cloudflared tunnel" > /dev/null; then
        echo "Tunnel já está rodando"
        return 0
    fi
    
    # Iniciar tunnel
    nohup "$CLOUDFLARED_BIN" tunnel --url http://localhost:3001 > "$TUNNEL_LOG" 2>&1 &
    echo "Tunnel iniciado. PID: $!"
    sleep 5
    
    # Extrair URL do tunnel
    if [ -f "$TUNNEL_LOG" ]; then
        URL=$(grep -o "https://[a-zA-Z0-9.-]*\.trycloudflare\.com" "$TUNNEL_LOG" | head -1)
        if [ -n "$URL" ]; then
            echo "=================================="
            echo "TUNNEL DISPONÍVEL EM: $URL"
            echo "=================================="
            echo "Teste: curl $URL/api/health"
        fi
    fi
}

stop_services() {
    echo "Parando serviços..."
    
    # Parar cloudflared
    if pgrep -f "cloudflared tunnel" > /dev/null; then
        pkill -f "cloudflared tunnel"
        echo "Cloudflared parado"
    fi
    
    # Parar servidor
    if pgrep -f "simple-server.js" > /dev/null; then
        pkill -f "simple-server.js"
        echo "Servidor parado"
    fi
}

show_status() {
    echo "Status dos serviços:"
    echo "=================="
    
    # Status do servidor
    if pgrep -f "simple-server.js" > /dev/null; then
        echo "✓ Servidor: RODANDO (PID: $(pgrep -f 'simple-server.js'))"
        echo "  - Porta: 3001"
        echo "  - Health: http://localhost:3001/api/health"
    else
        echo "✗ Servidor: PARADO"
    fi
    
    # Status do tunnel
    if pgrep -f "cloudflared tunnel" > /dev/null; then
        echo "✓ Tunnel: RODANDO (PID: $(pgrep -f 'cloudflared tunnel'))"
        
        # Extrair URL do tunnel
        if [ -f "$TUNNEL_LOG" ]; then
            URL=$(grep -o "https://[a-zA-Z0-9.-]*\.trycloudflare\.com" "$TUNNEL_LOG" | head -1)
            if [ -n "$URL" ]; then
                echo "  - URL: $URL"
                echo "  - Health: $URL/api/health"
            fi
        fi
    else
        echo "✗ Tunnel: PARADO"
    fi
}

show_logs() {
    echo "Logs do Servidor:"
    echo "================"
    if [ -f "$SERVER_LOG" ]; then
        tail -20 "$SERVER_LOG"
    else
        echo "Nenhum log do servidor encontrado"
    fi
    
    echo ""
    echo "Logs do Tunnel:"
    echo "=============="
    if [ -f "$TUNNEL_LOG" ]; then
        tail -20 "$TUNNEL_LOG"
    else
        echo "Nenhum log do tunnel encontrado"
    fi
}

case "$1" in
    start)
        start_server
        start_tunnel
        ;;
    stop)
        stop_services
        ;;
    status)
        show_status
        ;;
    restart)
        stop_services
        sleep 2
        start_server
        start_tunnel
        ;;
    logs)
        show_logs
        ;;
    *)
        echo "Uso: $0 {start|stop|status|restart|logs}"
        echo ""
        echo "Comandos:"
        echo "  start   - Inicia servidor e tunnel"
        echo "  stop    - Para servidor e tunnel"
        echo "  status  - Mostra status dos serviços"
        echo "  restart - Reinicia servidor e tunnel"
        echo "  logs    - Mostra logs recentes"
        exit 1
        ;;
esac