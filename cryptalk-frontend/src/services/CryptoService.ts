import CryptoJS from 'crypto-js';

/**
 * Serviço de criptografia segura para CrypTalk
 */
export class CryptoService {
  /**
   * Gera uma chave aleatória segura
   */
  static generateSecureKey(): string {
    // Gera 256 bits de entropia aleatória
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Deriva uma chave a partir de senha e salt
   */
  static deriveKey(password: string, salt: string): string {
    // PBKDF2 com 10000 iterações
    return CryptoJS.PBKDF2(password, salt, {
      keySize: 256 / 32,
      iterations: 10000
    }).toString();
  }

  /**
   * Criptografa conteúdo com AES-256
   */
  static encrypt(content: string, key: string): {
    encrypted: string;
    iv: string;
    salt: string;
  } {
    // Gera IV aleatório
    const iv = CryptoJS.lib.WordArray.random(128 / 8);
    
    // Gera salt aleatório
    const salt = CryptoJS.lib.WordArray.random(128 / 8);
    
    // Criptografa
    const encrypted = CryptoJS.AES.encrypt(content, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    return {
      encrypted: encrypted.toString(),
      iv: iv.toString(CryptoJS.enc.Base64),
      salt: salt.toString(CryptoJS.enc.Base64)
    };
  }

  /**
   * Descriptografa conteúdo
   */
  static decrypt(encryptedData: {
    encrypted: string;
    iv: string;
    salt: string;
  }, key: string): string {
    const decrypted = CryptoJS.AES.decrypt(encryptedData.encrypted, key, {
      iv: CryptoJS.enc.Base64.parse(encryptedData.iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    return decrypted.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Gera um par de chaves para criptografia de arquivo
   * Retorna a chave e metadados para recuperação
   */
  static generateFileEncryptionKey(userDID: string, recipientDID?: string): {
    key: string;
    metadata: {
      algorithm: string;
      createdAt: string;
      createdBy: string;
      sharedWith?: string;
      keyId: string;
    }
  } {
    const key = this.generateSecureKey();
    const keyId = CryptoJS.SHA256(key + Date.now()).toString().substring(0, 16);

    return {
      key,
      metadata: {
        algorithm: 'AES-256-CBC',
        createdAt: new Date().toISOString(),
        createdBy: userDID,
        sharedWith: recipientDID,
        keyId
      }
    };
  }
}

export default CryptoService;