# Cloudflare Tunnel - CrysTalk Backend

## Configuração Atual

- **URL Pública**: https://furthermore-decide-para-ste.trycloudflare.com
- **Backend Local**: http://localhost:3001
- **Status**: ✅ ATIVO

## Endpoints Disponíveis

### Health Check
- **Local**: http://localhost:3001/api/health
- **Público**: https://furthermore-decide-para-ste.trycloudflare.com/api/health

### Configuração do Tunnel

O tunnel está configurado para:
- Receber requisições do frontend público
- Encaminhar para o backend local na porta 3001
- Suportar WebSocket connections
- Logging habilitado

## Gerenciamento do Tunnel

Use o script de gerenciamento:

```bash
# Verificar status
./manage-tunnel.sh status

# Iniciar serviços
./manage-tunnel.sh start

# Parar serviços
./manage-tunnel.sh stop

# Reiniciar serviços
./manage-tunnel.sh restart

# Ver logs
./manage-tunnel.sh logs
```

## Arquivos Importantes

- `cloudflared` - Binário do Cloudflare Tunnel
- `tunnel-config.yml` - Configuração do tunnel
- `manage-tunnel.sh` - Script de gerenciamento
- `tunnel.log` - Logs do tunnel
- `server.log` - Logs do servidor

## Processos Ativos

- **Servidor Node.js**: PID 71764 (porta 3001)
- **Cloudflare Tunnel**: PID 74272

## Teste de Conectividade

```bash
# Teste local
curl http://localhost:3001/api/health

# Teste público
curl https://furthermore-decide-para-ste.trycloudflare.com/api/health
```

## Configurações de Segurança

- Tunnel configurado apenas para localhost
- Sem autenticação externa necessária
- Logs de acesso habilitados
- Protocolo HTTPS forçado

## Monitoramento

- Logs disponíveis em `tunnel.log`
- Métricas em http://localhost:20241/metrics
- Health check disponível

## Notas Importantes

⚠️ **Tunnel Temporário**: Este é um tunnel temporário do trycloudflare.com. Para produção, crie um tunnel nomeado com conta Cloudflare.

⚠️ **Uptime**: Tunnels temporários não têm garantia de uptime e podem ser desconectados a qualquer momento.

⚠️ **Configuração**: Para tunnel permanente, configure uma conta Cloudflare e crie um tunnel nomeado.