# CrypTalk - Correções de Erros Comuns

## 🐛 Erros Resolvidos e Como Evitá-los

### 1. Erro de Sintaxe em Chat-backup.tsx

**Problema**: Código duplicado entre linhas 550-584
```typescript
// ERRADO - código duplicado
const handleSendMessage = () => { ... }
const handleSendMessage = () => { ... } // Duplicado!
```

**Solução**: Remover código duplicado
**Prevenção**: Usar linter (ESLint) configurado

### 2. Erro em Login.tsx

**Problema**: Código fora do componente
```typescript
// ERRADO
const Login = () => { ... }
export default Login;
someCode(); // Código fora!
```

**Solução**: Mover código para dentro do componente
**Prevenção**: Sempre verificar fechamento de chaves

### 3. Dependência Faltando: react-icons

**Problema**: `Module not found: react-icons`
**Solução**: 
```bash
npm install react-icons
```
**Prevenção**: Sempre instalar dependências após clonar

### 4. Web3Storage Authentication

**Problema**: "space/blob/add invocation failed"
**Causa**: Clientes tentando usar Web3Storage sem conta

**Solução Implementada**:
1. Backend proxy server (`simple-upload-server.js`)
2. Upload via w3 CLI no servidor
3. Clientes usam `BackendUploadService`

**Como evitar**: Sempre usar o backend para uploads

### 5. Erro de Tipo TypeScript

**Problema**: `'error' is of type 'unknown'`
```typescript
// ERRADO
catch (error) {
  console.log(error.message); // Error!
}
```

**Solução**:
```typescript
// CORRETO
catch (error) {
  console.log(error instanceof Error ? error.message : String(error));
}
```

### 6. Servidor Não Inicia

**Problema**: "Port 5173 is in use"
**Solução**:
```bash
# Matar processo anterior
pkill -f vite
# Ou usar outra porta
npm run dev -- --port 5174
```

### 7. Upload Falha Silenciosamente

**Verificar**:
1. Backend server rodando? (`ps aux | grep simple-upload`)
2. w3 configurado? (`w3 whoami`)
3. Space correto? (`w3 space ls`)

### 8. Chat On-Chain Bloqueado

**Problema**: "Acesso ao chat on-chain bloqueado"
**Verificar**:
1. Status no `AccessControlService`
2. Painel admin → Controle de Acesso
3. Desbloquear cliente se necessário

## 🔧 Checklist de Debug

Ao encontrar erro:
1. [ ] Verificar console do navegador
2. [ ] Verificar terminal do servidor
3. [ ] Verificar logs: `tail -f dev-server.log`
4. [ ] Backend rodando: `curl http://localhost:3001/health`
5. [ ] TypeScript errors: `npm run type-check`

## 💡 Comandos de Emergência

```bash
# Reset completo
pkill -f node
pkill -f vite
rm -rf node_modules
npm install
npm run dev

# Verificar portas em uso
lsof -i :5173
lsof -i :3001

# Limpar cache
rm -rf .vite
npm cache clean --force
```

## 📝 Logs Importantes

Sempre verificar:
- Browser Console (F12)
- `dev-server.log`
- `upload-server.log` (se criado)
- Terminal onde rodou `npm run dev`

---

Mantenha este documento atualizado com novos erros encontrados!