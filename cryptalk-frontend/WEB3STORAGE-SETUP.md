# Configuração Web3Storage para CrypTalk

## 🔑 Sua DID
```
did:key:z6MkpTMTCcMMKgRFPAvoAtgf9Sip8uk2KoF7LU2JTvqLDmjQ
```

## 📋 Passo a Passo para Configuração

### 1. Preparar sua conta Web3Storage

Como você já tem uma DID, precisamos configurar o cliente para usar ela. O Web3Storage usa o protocolo W3UP que funciona com DIDs.

### 2. Instalar o CLI do W3UP (se ainda não tiver)

```bash
npm install -g @web3-storage/w3cli
```

### 3. Configurar sua DID

```bash
# Fazer login com sua DID existente
w3 login your-email@example.com

# Verificar sua DID
w3 whoami
```

### 4. Criar um Agent Key para a aplicação

Para a aplicação acessar sua conta, precisamos criar uma chave de agente:

```bash
# Criar um novo agente
w3 key create

# Isso retornará algo como:
# Agent DID: did:key:z6Mk...
# Private Key: MgCY...
```

### 5. Delegar permissões para o agente

```bash
# Delegar capacidades para o agente
w3 delegation create did:key:AGENT_DID_HERE --can 'store/*' --can 'upload/*'
```

## 🔧 Configuração no Código

Vou criar um arquivo de configuração seguro para suas credenciais: