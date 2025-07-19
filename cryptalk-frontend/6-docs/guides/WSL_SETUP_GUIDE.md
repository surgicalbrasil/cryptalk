# Guia de Configuração do CrysTalk para WSL

## 🎯 Configuração Concluída com Sucesso!

O sistema CrysTalk foi configurado e otimizado para funcionar perfeitamente no ambiente WSL (Windows Subsystem for Linux). Todos os ajustes necessários foram aplicados.

## 📋 Resumo da Configuração

### ✅ Componentes Verificados e Configurados:

1. **Claude Code**: v1.0.30 - Funcionando corretamente
2. **Node.js**: v18.19.1 - Versão compatível
3. **npm**: 9.2.0 - Configurado para WSL
4. **Docker**: 28.3.0 - Disponível para containers
5. **WSL**: Ubuntu - Ambiente otimizado

### 🔧 Configurações Aplicadas:

- **Variáveis de ambiente WSL** configuradas em `.env`
- **Rede WSL** configurada para bridge mode
- **Timeouts** ajustados para o ambiente WSL
- **Logs** configurados para `/tmp/cryptalk-wsl.log`
- **Permissões** de arquivos ajustadas
- **Estrutura de diretórios** criada

## 🚀 Como Usar o Sistema

### 1. Iniciar o Sistema Completo:
```bash
./start-wsl.sh
```

Este script irá:
- Iniciar o servidor backend na porta 3000
- Iniciar o WebSocket na porta 8080
- Iniciar o frontend em modo desenvolvimento na porta 5173

### 2. Acessar o Sistema:
- **Frontend**: http://localhost:5173
- **API**: http://localhost:3000
- **WebSocket**: ws://localhost:8080

### 3. Testar o Sistema:
```bash
./test-wsl.sh
```

### 4. Diagnóstico Completo:
```bash
./diagnose-wsl.sh
```

## 🛠️ Scripts Disponíveis

### `/start-wsl.sh`
Script principal para iniciar todo o sistema no WSL.

### `/test-wsl.sh`
Script de teste que verifica:
- Dependências instaladas
- Servidor respondendo
- WebSocket funcionando
- Claude Code operacional

### `/diagnose-wsl.sh`
Script de diagnóstico completo que mostra:
- Informações do sistema WSL
- Versões de software
- Configurações de rede
- Portas em uso
- Processos ativos
- Logs recentes

## 📁 Estrutura de Diretórios WSL

```
cryptalk-frontend/
├── server/
│   ├── client-containers/    # Containers isolados por cliente
│   ├── server-fixed.js       # Servidor principal otimizado
│   ├── claude-executor.js    # Executor Claude Code
│   └── templates/           # Templates de análise
├── uploads/                 # Arquivos enviados
├── temp-files/             # Arquivos temporários
├── logs/                   # Logs do sistema
├── dist/                   # Build do frontend
├── scripts/                # Scripts de configuração
├── .env                    # Configurações (incluindo WSL)
├── .env.wsl               # Configurações específicas WSL
├── start-wsl.sh           # Script de inicialização
├── test-wsl.sh            # Script de testes
└── diagnose-wsl.sh        # Script de diagnóstico
```

## 🔧 Configurações Específicas WSL

### Variáveis de Ambiente WSL:
```env
WSL_ENABLED=true
WSL_DISTRO_NAME=Ubuntu
WSL_HOST_IP=172.25.64.1
WSL_NETWORK_MODE=bridge
```

### Configurações de Rede:
```env
SERVER_HOST=0.0.0.0
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
TRUST_PROXY=true
```

### Timeouts Ajustados:
```env
REQUEST_TIMEOUT=30000
WEBSOCKET_TIMEOUT=300000
CLAUDE_TIMEOUT=300000
```

## 📊 Monitoramento

### Logs do Sistema:
```bash
# Logs do servidor
tail -f /tmp/server.log

# Logs detalhados WSL
tail -f /tmp/cryptalk-wsl.log
```

### Verificar Status:
```bash
# Verificar saúde da API
curl http://localhost:3000/api/health

# Verificar portas em uso
ss -tulpn | grep -E "(3000|5173|8080)"
```

## 🔍 Solução de Problemas

### Problema: Porta já em uso
```bash
# Verificar que processo está usando a porta
ss -tulpn | grep :8080

# Parar processos se necessário
pkill -f "server-fixed.js"
pkill -f "vite"
```

### Problema: Claude Code não responde
```bash
# Verificar instalação
claude --version

# Verificar MCP servers
claude mcp list

# Testar Claude Code
echo "teste" | claude --print
```

### Problema: Permissões de arquivo
```bash
# Corrigir permissões
chmod +x scripts/*.sh
chmod 755 server/client-containers
```

## 📋 Checklist de Verificação

- [ ] WSL está rodando Ubuntu
- [ ] Claude Code v1.0.30 instalado
- [ ] Node.js v18.19.1 funcionando
- [ ] Dependências npm instaladas
- [ ] Estrutura de diretórios criada
- [ ] Configurações WSL aplicadas
- [ ] Scripts executáveis criados
- [ ] Sistema testado e funcionando

## 🎉 Sistema Pronto!

O CrysTalk está completamente configurado e otimizado para WSL. O sistema oferece:

- **Análise de documentos** com Claude Code
- **Interface web** responsiva
- **Comunicação WebSocket** em tempo real
- **Upload de arquivos** seguro
- **Containers isolados** por cliente
- **Logs detalhados** para debugging
- **Limpeza automática** de arquivos temporários

Para iniciar o sistema, execute:
```bash
./start-wsl.sh
```

E acesse http://localhost:5173 no seu navegador!

## 📞 Suporte

Se encontrar problemas:
1. Execute `./diagnose-wsl.sh` para diagnóstico completo
2. Verifique os logs em `/tmp/server.log`
3. Teste componentes individuais com `./test-wsl.sh`

O sistema está pronto para uso produtivo no ambiente WSL!