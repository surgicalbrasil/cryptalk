# 🔐 Segurança e Criptografia no CrypTalk

## Como Funciona a Criptografia

### 1. **Criptografia de Arquivos**
- Cada arquivo é criptografado com uma **chave única AES-256**
- A chave é gerada aleatoriamente para cada upload
- O arquivo criptografado é armazenado no Web3Storage/IPFS

### 2. **Onde Ficam as Chaves?**

#### Opção 1: Armazenamento Local (Atual)
- As chaves ficam no navegador do usuário (localStorage)
- Problema: Se perder o navegador, perde acesso aos arquivos

#### Opção 2: Derivação do MetaMask (Recomendado)
- Deriva chaves da assinatura do MetaMask
- O usuário pode recuperar as chaves com sua carteira
- Mais seguro e recuperável

#### Opção 3: Servidor de Chaves
- Um servidor seguro armazena as chaves criptografadas
- Requer autenticação para acessar
- Centralizado mas prático

#### Opção 4: Smart Contract
- Armazenar chaves criptografadas on-chain
- Custo de gas para cada operação
- Permanente e descentralizado

## Fluxo Recomendado

```
1. Usuário faz upload de arquivo
2. Sistema gera chave aleatória AES-256
3. Arquivo é criptografado com esta chave
4. Chave é criptografada com a chave pública do destinatário
5. Metadados salvos:
   - CID do arquivo criptografado
   - Chave criptografada
   - Hash da chave para verificação
   - Timestamp
6. Apenas o destinatário pode descriptografar
```

## Implementação Atual vs Segura

### ❌ Atual (INSEGURO)
```javascript
const secretKey = this.userDID; // DID é público!
```

### ✅ Seguro
```javascript
const { key, metadata } = CryptoService.generateFileEncryptionKey(userDID);
// Salvar metadata de forma segura
// Compartilhar chave apenas com destinatário autorizado
```

## Recuperação de Chaves

### Para o Usuário Recuperar Seus Arquivos:

1. **Backup de Chaves**
   - Exportar chaves criptografadas
   - Salvar em local seguro
   - QR Code ou arquivo JSON

2. **Recuperação via MetaMask**
   - Assinar mensagem com MetaMask
   - Derivar chaves da assinatura
   - Acessar arquivos antigos

3. **Compartilhamento Seguro**
   - Criptografar chave com chave pública do destinatário
   - Apenas destinatário pode abrir
   - Rastreabilidade de acesso

## Próximos Passos

1. **Implementar CryptoService melhorado**
2. **Criar sistema de backup de chaves**
3. **Adicionar recuperação via MetaMask**
4. **Interface para gerenciar chaves**
5. **Auditoria de segurança**

## Aviso Importante

⚠️ **A implementação atual usa o DID como chave, o que NÃO é seguro!**

Recomenda-se implementar um dos métodos seguros acima antes de usar em produção.