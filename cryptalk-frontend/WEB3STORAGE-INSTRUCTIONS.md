# 🚀 Instruções de Configuração Web3Storage

## Passo 1: Instalar W3 CLI

```bash
npm install -g @web3-storage/w3cli
```

## Passo 2: Login com seu email

```bash
w3 login seu-email@example.com
```

Isso abrirá o navegador para confirmar o login.

## Passo 3: Verificar seus espaços

```bash
w3 space ls
```

Resultado esperado:
```
* did:key:z6Mk... my-space
```

Copie o DID do espaço (começa com `did:key:`).

## Passo 4: Criar chave de agente

```bash
w3 key create
```

Resultado esperado:
```
# Agent DID: did:key:z6Mk...
# Private Key: MgCY...
```

⚠️ **IMPORTANTE**: Guarde a Private Key com segurança!

## Passo 5: Configurar o projeto

1. Execute o script de setup:
```bash
cd /home/surgical/my-claude-project/CrypTalk/cryptalk-frontend
./setup-web3storage.sh
```

2. Edite o arquivo `.env.local`:
```bash
nano .env.local
```

3. Preencha com suas informações:
```env
VITE_W3S_DID=did:key:z6MkpTMTCcMMKgRFPAvoAtgf9Sip8uk2KoF7LU2JTvqLDmjQ
VITE_W3S_SPACE_DID=did:key:COLE_SEU_SPACE_DID_AQUI
VITE_W3S_AGENT_KEY=COLE_SUA_PRIVATE_KEY_AQUI
VITE_W3S_EMAIL=seu-email@example.com
```

## Passo 6: Reiniciar o servidor

```bash
# Parar o servidor atual (Ctrl+C)
# Reiniciar
npm run dev
```

## 🎉 Pronto!

Agora quando você fizer upload de arquivos:
- Eles serão realmente armazenados na sua conta Web3Storage
- Usando sua DID: `did:key:z6MkpTMTCcMMKgRFPAvoAtgf9Sip8uk2KoF7LU2JTvqLDmjQ`
- Com criptografia AES
- No protocolo Filecoin

## 🔍 Verificar uploads

Para ver seus arquivos:
```bash
w3 ls
```

## ⚠️ Segurança

- Nunca commite o arquivo `.env.local`
- Mantenha sua AGENT_KEY segura
- O `.gitignore` já está configurado para ignorar `.env.local`