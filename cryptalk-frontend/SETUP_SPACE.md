# Como Configurar o Espaço Web3Storage

Para finalizar a configuração e poder fazer uploads de arquivos criptografados, você precisa criar um espaço no Web3Storage manualmente.

## Passos para criar o espaço:

1. Abra um terminal e execute:
```bash
w3 space create cryptalk-storage --no-recovery
```

2. Quando perguntado sobre billing, escolha uma opção:
   - **Via Email**: Você receberá um email para confirmar
   - **Via GitHub**: Autenticação via GitHub

3. Após criar o espaço, liste seus espaços para obter o DID:
```bash
w3 space ls
```

4. Copie o DID do espaço (começa com `did:key:`) e adicione ao arquivo `.env.local`:
```
VITE_W3S_SPACE_DID=did:key:SEU_SPACE_DID_AQUI
```

5. Adicione também seu email (se escolheu Via Email):
```
VITE_W3S_EMAIL=seu-email@exemplo.com
```

6. Reinicie o servidor de desenvolvimento:
```bash
npm run dev
```

## Testando o Upload

Após configurar o espaço, você pode testar o upload de arquivos:

1. Acesse http://localhost:5173/test-upload
2. Faça upload de um arquivo
3. O arquivo será criptografado e enviado para seu Web3Storage
4. Você verá o CID do arquivo no console
5. Acesse https://w3s.link/ipfs/CID para ver o arquivo criptografado

## Verificando no Web3Storage

Para ver seus arquivos no Web3Storage:
```bash
w3 ls
```

Ou acesse o console web em: https://console.web3.storage/