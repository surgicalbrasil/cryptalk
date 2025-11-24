#!/bin/bash
# Backup Current State - Antes do Lockdown
# Salva estado atual para restauração se necessário

echo "💾 FAZENDO BACKUP DO ESTADO ATUAL..."

BACKUP_DIR="/tmp/cryptalk-security-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📂 Backup em: $BACKUP_DIR"

# Salvar processos ativos
echo "📊 Salvando processos ativos..."
ps aux > "$BACKUP_DIR/processes.txt"
ss -tlnp > "$BACKUP_DIR/ports.txt"

# Salvar configurações de rede
echo "🌐 Salvando configurações de rede..."
if command -v ufw &> /dev/null; then
    sudo ufw status numbered > "$BACKUP_DIR/ufw-status.txt"
fi

if command -v iptables &> /dev/null; then
    sudo iptables -L > "$BACKUP_DIR/iptables-rules.txt"
fi

# Salvar variáveis de ambiente importantes
echo "⚙️ Salvando configurações..."
env | grep -E "(PORT|HOST|TUNNEL|API)" > "$BACKUP_DIR/environment.txt"

# Criar script de restauração
cat > "$BACKUP_DIR/restore.sh" << 'EOF'
#!/bin/bash
echo "🔄 Restaurando estado anterior..."
echo "📂 Backup criado em: $(basename $(dirname $0))"
echo ""
echo "📊 PROCESSOS QUE ESTAVAM RODANDO:"
cat processes.txt | grep -E "(node|python|http)" | head -10
echo ""
echo "🌐 PORTAS QUE ESTAVAM ABERTAS:"
cat ports.txt
echo ""
echo "⚠️  Para restaurar manualmente, consulte os arquivos neste diretório"
EOF

chmod +x "$BACKUP_DIR/restore.sh"

echo ""
echo "✅ BACKUP CONCLUÍDO!"
echo "=================="
echo "📁 Local: $BACKUP_DIR"
echo "📋 Arquivos:"
echo "  • processes.txt    - Processos ativos"
echo "  • ports.txt        - Portas abertas"
echo "  • ufw-status.txt   - Status firewall"
echo "  • environment.txt  - Variáveis ambiente"
echo "  • restore.sh       - Script informativo"
echo ""
echo "🔄 Para ver backup:"
echo "ls -la $BACKUP_DIR"