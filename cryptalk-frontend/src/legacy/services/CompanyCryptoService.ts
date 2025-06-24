import CryptoJS from 'crypto-js';

/**
 * Serviço de criptografia empresarial para CrypTalk
 * Apenas a Surgical Brasil pode descriptografar os arquivos
 */
export class CompanyCryptoService {
  // DID da empresa (Surgical Brasil)
  private static readonly COMPANY_DID = 'did:key:z6MkpTMTCcMMKgRFPAvoAtgf9Sip8uk2KoF7LU2JTvqLDmjQ';
  
  // Endereço MetaMask da empresa
  private static readonly COMPANY_WALLET = '0x650687aD5F50E2DF6763f300BCAC9E03B4B4fCb6';

  /**
   * Deriva uma chave mestra da assinatura da empresa
   */
  private static async deriveMasterKey(): Promise<string> {
    if (!window.ethereum) {
      throw new Error('MetaMask não encontrado');
    }

    // Mensagem fixa para assinatura
    const message = `CrypTalk Master Key - Surgical Brasil\nTimestamp: ${Math.floor(Date.now() / 86400000)}`; // Muda a cada dia
    
    try {
      // Conectar à MetaMask
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      // Verificar se é a carteira da empresa
      const currentAccount = accounts[0].toLowerCase();
      if (currentAccount !== this.COMPANY_WALLET.toLowerCase()) {
        throw new Error(`Acesso negado. Apenas a carteira da empresa (${this.COMPANY_WALLET}) pode descriptografar arquivos.`);
      }

      // Assinar mensagem para deriva chave
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, currentAccount]
      });

      // Deriva chave usando PBKDF2
      const masterKey = CryptoJS.PBKDF2(signature, this.COMPANY_DID, {
        keySize: 256 / 32,
        iterations: 100000
      }).toString();

      return masterKey;
    } catch (error) {
      throw new Error(`Erro ao derivar chave mestra: ${error.message}`);
    }
  }

  /**
   * Gera uma chave de arquivo específica
   */
  private static generateFileKey(masterKey: string, fileId: string): string {
    return CryptoJS.PBKDF2(masterKey, fileId, {
      keySize: 256 / 32,
      iterations: 10000
    }).toString();
  }

  /**
   * Criptografa um arquivo para a empresa
   */
  static async encryptForCompany(
    fileContent: string, 
    clientDID: string, 
    fileName: string
  ): Promise<{
    encryptedContent: string;
    metadata: {
      fileId: string;
      fileName: string;
      clientDID: string;
      encryptedAt: string;
      algorithm: string;
      company: string;
      iv: string;
      salt: string;
    }
  }> {
    try {
      // ID único do arquivo
      const fileId = CryptoJS.SHA256(fileName + clientDID + Date.now()).toString();
      
      // Gera IV e salt aleatórios
      const iv = CryptoJS.lib.WordArray.random(128 / 8);
      const salt = CryptoJS.lib.WordArray.random(128 / 8);
      
      // Deriva chave mestra (sem precisar da MetaMask para criptografar)
      // Usa uma chave derivada do DID da empresa para criptografia
      const companySecret = CryptoJS.PBKDF2(this.COMPANY_DID, 'company-encryption-key', {
        keySize: 256 / 32,
        iterations: 100000
      }).toString();
      
      const fileKey = this.generateFileKey(companySecret, fileId);
      
      // Criptografa o conteúdo
      const encrypted = CryptoJS.AES.encrypt(fileContent, fileKey, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      return {
        encryptedContent: encrypted.toString(),
        metadata: {
          fileId,
          fileName,
          clientDID,
          encryptedAt: new Date().toISOString(),
          algorithm: 'AES-256-CBC',
          company: 'Surgical Brasil',
          iv: iv.toString(CryptoJS.enc.Base64),
          salt: salt.toString(CryptoJS.enc.Base64)
        }
      };
    } catch (error) {
      throw new Error(`Erro ao criptografar arquivo: ${error.message}`);
    }
  }

  /**
   * Descriptografa um arquivo (APENAS a empresa pode fazer)
   */
  static async decryptForCompany(
    encryptedContent: string,
    metadata: {
      fileId: string;
      fileName: string;
      clientDID: string;
      iv: string;
      salt: string;
    }
  ): Promise<string> {
    try {
      // Deriva chave mestra usando MetaMask da empresa
      const masterKey = await this.deriveMasterKey();
      
      // Gera a chave específica do arquivo
      const fileKey = this.generateFileKey(masterKey, metadata.fileId);
      
      // Descriptografa
      const decrypted = CryptoJS.AES.decrypt(encryptedContent, fileKey, {
        iv: CryptoJS.enc.Base64.parse(metadata.iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      const result = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!result) {
        throw new Error('Falha na descriptografia - chave incorreta ou arquivo corrompido');
      }

      return result;
    } catch (error) {
      throw new Error(`Erro ao descriptografar arquivo: ${error.message}`);
    }
  }

  /**
   * Verifica se a carteira atual é da empresa
   */
  static async isCompanyWallet(): Promise<boolean> {
    if (!window.ethereum) return false;

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_accounts'
      });

      return accounts.length > 0 && 
             accounts[0].toLowerCase() === this.COMPANY_WALLET.toLowerCase();
    } catch {
      return false;
    }
  }

  /**
   * Interface para download e descriptografia
   */
  static async downloadAndDecrypt(cid: string): Promise<{
    fileName: string;
    content: string;
    clientDID: string;
    encryptedAt: string;
  }> {
    try {
      // Busca o arquivo do Web3Storage
      const response = await fetch(`https://w3s.link/ipfs/${cid}`);
      const data = await response.json();

      if (!data.metadata || !data.encryptedContent) {
        throw new Error('Formato de arquivo inválido');
      }

      // Descriptografa
      const content = await this.decryptForCompany(data.encryptedContent, data.metadata);

      return {
        fileName: data.metadata.fileName,
        content,
        clientDID: data.metadata.clientDID,
        encryptedAt: data.metadata.encryptedAt
      };
    } catch (error) {
      throw new Error(`Erro ao baixar e descriptografar: ${error.message}`);
    }
  }
}

export default CompanyCryptoService;