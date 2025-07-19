#!/bin/bash

# Script de inicialização rápida da arquitetura híbrida
# ====================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Função para logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️ $1${NC}"
}

info() {
    echo -e "${CYAN}[$(date +'%Y-%m-%d %H:%M:%S')] ℹ️ $1${NC}"
}

# Arte ASCII
cat << 'EOF'
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║   ████████ ██████  ██    ██ ███████ ████████  █████  ██      ██  ██      ║
║   ██       ██   ██  ██  ██  ██         ██    ██   ██ ██      ██  ██      ║
║   ██       ██████    ████   ███████    ██    ███████ ██      ██████      ║
║   ██       ██   ██    ██         ██    ██    ██   ██ ██      ██  ██      ║
║   ████████ ██   ██    ██    ███████    ██    ██   ██ ███████ ██  ██      ║
║                                                                          ║
║                     🌐 ARQUITETURA HÍBRIDA 🌐                           ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
EOF

echo
echo -e "${PURPLE}🚀 Bem-vindo ao CrysTalk - Configuração Híbrida!${NC}"
echo -e "${CYAN}📋 Este script irá configurar a arquitetura híbrida completa${NC}"
echo

# Verificar se está rodando no WSL
if [[ ! -f /proc/version ]] || ! grep -q "Microsoft" /proc/version; then
    error "Este script deve ser executado no WSL (Windows Subsystem for Linux)"
    exit 1
fi

# Menu de opções
echo "═══════════════════════════════════════════════════════════════════════════"
echo "🎯 Escolha o tipo de configuração:"
echo "═══════════════════════════════════════════════════════════════════════════"
echo "1. 🚀 Configuração Completa (Recomendado)"
echo "2. 🔧 Configuração Básica (Apenas dependencies)"
echo "3. 🌐 Configuração do Tunnel"
echo "4. 📦 Build e Deploy do Frontend"
echo "5. ℹ️ Verificar Status do Sistema"
echo "6. 🧹 Limpeza e Reset"
echo "═══════════════════════════════════════════════════════════════════════════"
echo

read -p "Digite sua opção (1-6): " choice

case $choice in
    1)
        echo -e "${GREEN}🚀 Iniciando configuração completa...${NC}"
        SETUP_TYPE="complete"
        ;;
    2)
        echo -e "${YELLOW}🔧 Configuração básica selecionada${NC}"
        SETUP_TYPE="basic"
        ;;
    3)
        echo -e "${BLUE}🌐 Configuração do tunnel selecionada${NC}"
        SETUP_TYPE="tunnel"
        ;;
    4)
        echo -e "${PURPLE}📦 Build e deploy selecionado${NC}"
        SETUP_TYPE="deploy"
        ;;
    5)
        echo -e "${CYAN}ℹ️ Verificando status do sistema...${NC}"
        SETUP_TYPE="status"
        ;;
    6)
        echo -e "${RED}🧹 Limpeza e reset selecionado${NC}"
        SETUP_TYPE="clean"
        ;;
    *)
        error "Opção inválida. Usando configuração completa."
        SETUP_TYPE="complete"
        ;;
esac

echo

# Função para verificar dependências
check_dependencies() {
    log "🔍 Verificando dependências..."
    
    # Node.js
    if command -v node &> /dev/null; then
        success "Node.js: $(node --version)"
    else
        error "Node.js não encontrado. Instale Node.js 18+ primeiro."
        exit 1
    fi
    
    # npm
    if command -v npm &> /dev/null; then
        success "npm: $(npm --version)"
    else
        error "npm não encontrado"
        exit 1
    fi
    
    # curl
    if command -v curl &> /dev/null; then
        success "curl: $(curl --version | head -1)"
    else
        warning "curl não encontrado. Instalando..."
        sudo apt-get update && sudo apt-get install -y curl
    fi
    
    # wget
    if command -v wget &> /dev/null; then
        success "wget: $(wget --version | head -1)"
    else
        warning "wget não encontrado. Instalando..."
        sudo apt-get update && sudo apt-get install -y wget
    fi
}

# Função para instalar dependências do projeto
install_project_dependencies() {
    log "📦 Instalando dependências do projeto..."
    
    if [ ! -d "node_modules" ]; then
        npm install
        success "Dependências instaladas!"
    else
        info "Dependências já instaladas. Verificando atualizações..."
        npm update
        success "Dependências atualizadas!"
    fi
}

# Função para configurar tunnel
setup_tunnel() {
    log "🌐 Configurando Cloudflare Tunnel..."
    
    # Verificar se cloudflared está instalado
    if ! command -v cloudflared &> /dev/null; then
        log "📥 Instalando cloudflared..."
        
        # Baixar e instalar cloudflared
        wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
        sudo dpkg -i cloudflared-linux-amd64.deb
        rm cloudflared-linux-amd64.deb
        
        success "cloudflared instalado!"
    else
        success "cloudflared já está instalado: $(cloudflared --version)"
    fi
    
    # Criar diretório de configuração
    mkdir -p ~/.cloudflared
    
    # Copiar configuração
    if [ -f "tunnel-config.yml" ]; then
        cp tunnel-config.yml ~/.cloudflared/config.yml
        success "Configuração do tunnel copiada!"
    else
        warning "Arquivo de configuração do tunnel não encontrado"
    fi
    
    echo
    echo "═══════════════════════════════════════════════════════════════════════════"
    echo "🎯 CONFIGURAÇÃO DO TUNNEL:"
    echo "═══════════════════════════════════════════════════════════════════════════"
    echo "1. Para tunnel temporário (mais fácil):"
    echo "   cloudflared tunnel --url http://localhost:3001"
    echo
    echo "2. Para tunnel permanente (mais estável):"
    echo "   cloudflared tunnel login"
    echo "   cloudflared tunnel create cryptalk-backend"
    echo "   cloudflared tunnel run cryptalk-backend"
    echo "═══════════════════════════════════════════════════════════════════════════"
}

# Função para build e deploy
build_and_deploy() {
    log "📦 Fazendo build do projeto..."
    
    # Build de produção
    npm run build:prod
    success "Build concluído!"
    
    echo
    echo "═══════════════════════════════════════════════════════════════════════════"
    echo "🌐 OPÇÕES DE DEPLOY:"
    echo "═══════════════════════════════════════════════════════════════════════════"
    echo "1. Vercel"
    echo "2. Netlify"
    echo "3. GitHub Pages"
    echo "4. Pular deploy"
    echo "═══════════════════════════════════════════════════════════════════════════"
    
    read -p "Escolha a plataforma de deploy (1-4): " deploy_choice
    
    case $deploy_choice in
        1)
            log "🚀 Fazendo deploy para Vercel..."
            if ! command -v vercel &> /dev/null; then
                npm install -g vercel
            fi
            vercel --prod --yes
            success "Deploy para Vercel concluído!"
            ;;
        2)
            log "🌊 Fazendo deploy para Netlify..."
            if ! command -v netlify &> /dev/null; then
                npm install -g netlify-cli
            fi
            netlify deploy --prod --dir=dist
            success "Deploy para Netlify concluído!"
            ;;
        3)
            log "📄 Fazendo deploy para GitHub Pages..."
            if ! command -v gh-pages &> /dev/null; then
                npm install -g gh-pages
            fi
            gh-pages -d dist
            success "Deploy para GitHub Pages concluído!"
            ;;
        4)
            info "Deploy pulado."
            ;;
        *)
            warning "Opção inválida. Deploy pulado."
            ;;
    esac
}

# Função para verificar status
check_status() {
    echo "═══════════════════════════════════════════════════════════════════════════"
    echo "📊 STATUS DO SISTEMA:"
    echo "═══════════════════════════════════════════════════════════════════════════"
    
    # Verificar Node.js
    if command -v node &> /dev/null; then
        echo -e "✅ Node.js: ${GREEN}$(node --version)${NC}"
    else
        echo -e "❌ Node.js: ${RED}Não instalado${NC}"
    fi
    
    # Verificar npm
    if command -v npm &> /dev/null; then
        echo -e "✅ npm: ${GREEN}$(npm --version)${NC}"
    else
        echo -e "❌ npm: ${RED}Não instalado${NC}"
    fi
    
    # Verificar cloudflared
    if command -v cloudflared &> /dev/null; then
        echo -e "✅ cloudflared: ${GREEN}$(cloudflared --version)${NC}"
    else
        echo -e "❌ cloudflared: ${RED}Não instalado${NC}"
    fi
    
    # Verificar dependências do projeto
    if [ -d "node_modules" ]; then
        echo -e "✅ Dependências: ${GREEN}Instaladas${NC}"
    else
        echo -e "❌ Dependências: ${RED}Não instaladas${NC}"
    fi
    
    # Verificar build
    if [ -d "dist" ]; then
        echo -e "✅ Build: ${GREEN}Disponível${NC}"
    else
        echo -e "❌ Build: ${RED}Não encontrado${NC}"
    fi
    
    # Verificar processos ativos
    if pgrep -f "node.*server" > /dev/null; then
        echo -e "✅ Backend: ${GREEN}Rodando${NC}"
    else
        echo -e "❌ Backend: ${RED}Parado${NC}"
    fi
    
    if pgrep -f "cloudflared" > /dev/null; then
        echo -e "✅ Tunnel: ${GREEN}Ativo${NC}"
    else
        echo -e "❌ Tunnel: ${RED}Inativo${NC}"
    fi
    
    echo "═══════════════════════════════════════════════════════════════════════════"
}

# Função para limpeza
clean_system() {
    log "🧹 Limpando sistema..."
    
    # Parar processos
    pkill -f "node.*server" 2>/dev/null || true
    pkill -f "cloudflared" 2>/dev/null || true
    
    # Remover arquivos temporários
    rm -rf node_modules dist .deployment-info /tmp/backend.log /tmp/tunnel.log
    
    # Limpar cache npm
    npm cache clean --force
    
    success "Sistema limpo!"
}

# Executar configuração baseada na escolha
case $SETUP_TYPE in
    "complete")
        check_dependencies
        install_project_dependencies
        setup_tunnel
        build_and_deploy
        check_status
        ;;
    "basic")
        check_dependencies
        install_project_dependencies
        ;;
    "tunnel")
        setup_tunnel
        ;;
    "deploy")
        build_and_deploy
        ;;
    "status")
        check_status
        ;;
    "clean")
        clean_system
        ;;
esac

echo
echo "═══════════════════════════════════════════════════════════════════════════"
echo "🎉 CONFIGURAÇÃO CONCLUÍDA!"
echo "═══════════════════════════════════════════════════════════════════════════"
echo
echo "📋 PRÓXIMOS PASSOS:"
echo "• Iniciar backend: npm run server:hybrid"
echo "• Iniciar tunnel: npm run tunnel:start"
echo "• Verificar logs: tail -f /tmp/backend.log"
echo "• Testar API: curl http://localhost:3001/api/health"
echo
echo "🔗 COMANDOS ÚTEIS:"
echo "• Status: npm run tunnel:status"
echo "• Build: npm run build:prod"
echo "• Deploy: npm run deploy:frontend"
echo "• Logs: tail -f /tmp/tunnel.log"
echo
echo "📖 DOCUMENTAÇÃO:"
echo "• Arquitetura: cat ARQUITETURA_HIBRIDA.md"
echo "• Scripts: ls -la scripts/"
echo
echo "═══════════════════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ Sistema pronto para uso! Boa sorte! 🚀${NC}"
echo "═══════════════════════════════════════════════════════════════════════════"