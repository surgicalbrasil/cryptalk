/**
 * Admin Service for CrypTalk
 * Manages administrative access and encrypted file viewing
 */

import { CompanyCryptoService } from './CompanyCryptoService';
import web3StorageService from './Web3StorageService';
import AppConfig from '../config/AppConfig';

interface AdminMessage {
  id: string;
  sender: string;
  recipient: string;
  content: string;
  timestamp: string;
  type: 'text' | 'file';
  cid?: string;
  decrypted?: boolean;
  metadata?: {
    fileName?: string;
    fileType?: string;
    fileSize?: number;
  };
}

class AdminService {
  private companyWallet = AppConfig.serviceProvider.walletAddress;
  private companyDID = AppConfig.serviceProvider.did;
  private cryptoService: CompanyCryptoService;

  constructor() {
    this.cryptoService = new CompanyCryptoService();
  }

  /**
   * Check if current user is admin
   */
  isAdmin(walletAddress: string): boolean {
    return walletAddress.toLowerCase() === this.companyWallet.toLowerCase();
  }

  /**
   * Get all messages sent to the company (mock data for testing)
   */
  async getCompanyMessages(): Promise<AdminMessage[]> {
    // In production, this would query blockchain or backend
    // For testing, return mock messages
    const mockMessages: AdminMessage[] = [
      {
        id: '1',
        sender: 'did:key:z6Mkqgr8azLX7omHiisB8AWwrHcQwJ29HiKyYzP9cHb5z3cH',
        recipient: this.companyDID,
        content: 'Olá, gostaria de agendar uma consulta.',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        type: 'text',
        decrypted: false
      },
      {
        id: '2',
        sender: 'did:key:z6Mkqgr8azLX7omHiisB8AWwrHcQwJ29HiKyYzP9cHb5z3cH',
        recipient: this.companyDID,
        content: 'Exame de Sangue - Paciente João Silva',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        type: 'file',
        cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
        decrypted: false,
        metadata: {
          fileName: 'exame_sangue_joao.pdf',
          fileType: 'application/pdf',
          fileSize: 245760
        }
      },
      {
        id: '3',
        sender: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
        recipient: this.companyDID,
        content: 'Resultado de Ressonância Magnética',
        timestamp: new Date(Date.now() - 900000).toISOString(),
        type: 'file',
        cid: 'bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku',
        decrypted: false,
        metadata: {
          fileName: 'ressonancia_maria.pdf',
          fileType: 'application/pdf',
          fileSize: 1572864
        }
      }
    ];

    return mockMessages;
  }

  /**
   * Decrypt a message (only for admin)
   */
  async decryptMessage(message: AdminMessage): Promise<AdminMessage> {
    if (message.type === 'text') {
      // For text messages, simulate decryption
      const decrypted = await this.cryptoService.decryptForCompany(
        message.content,
        message.sender
      );
      
      return {
        ...message,
        content: decrypted,
        decrypted: true
      };
    }
    
    return message;
  }

  /**
   * Get encrypted file details
   */
  async getFileDetails(cid: string): Promise<{
    success: boolean;
    data?: {
      url: string;
      metadata: any;
    };
    error?: string;
  }> {
    try {
      // For testing, return mock URLs
      // In production, this would decrypt and retrieve from Web3Storage
      const mockFileUrl = `https://w3s.link/ipfs/${cid}`;
      
      return {
        success: true,
        data: {
          url: mockFileUrl,
          metadata: {
            encrypted: true,
            requiresDecryption: true
          }
        }
      };
    } catch (error) {
      console.error('Error getting file details:', error);
      return {
        success: false,
        error: 'Failed to retrieve file details'
      };
    }
  }

  /**
   * Decrypt and download file (admin only)
   */
  async decryptFile(cid: string, fileName: string): Promise<{
    success: boolean;
    blob?: Blob;
    error?: string;
  }> {
    try {
      // In production, this would:
      // 1. Download encrypted file from Web3Storage
      // 2. Decrypt using company's private key
      // 3. Return decrypted blob
      
      // For testing, simulate with a text file
      const mockContent = `
Arquivo Descriptografado
========================

Nome: ${fileName}
CID: ${cid}
Data de Descriptografia: ${new Date().toLocaleString('pt-BR')}
Descriptografado por: Surgical Brasil Admin

[CONTEÚDO DO ARQUIVO MÉDICO CONFIDENCIAL]

Este é um arquivo de teste. Em produção, este seria o conteúdo real do arquivo descriptografado.
      `;
      
      const blob = new Blob([mockContent], { type: 'text/plain' });
      
      return {
        success: true,
        blob
      };
    } catch (error) {
      console.error('Error decrypting file:', error);
      return {
        success: false,
        error: 'Failed to decrypt file'
      };
    }
  }

  /**
   * Get admin statistics
   */
  async getAdminStats(): Promise<{
    totalMessages: number;
    encryptedFiles: number;
    pendingDecryption: number;
    recentActivity: Array<{
      type: string;
      description: string;
      timestamp: string;
    }>;
  }> {
    const messages = await this.getCompanyMessages();
    const fileMessages = messages.filter(m => m.type === 'file');
    const pendingDecryption = messages.filter(m => !m.decrypted).length;
    
    return {
      totalMessages: messages.length,
      encryptedFiles: fileMessages.length,
      pendingDecryption,
      recentActivity: [
        {
          type: 'file_received',
          description: 'Novo exame recebido de João Silva',
          timestamp: new Date(Date.now() - 300000).toISOString()
        },
        {
          type: 'message_decrypted',
          description: 'Mensagem descriptografada com sucesso',
          timestamp: new Date(Date.now() - 600000).toISOString()
        },
        {
          type: 'file_downloaded',
          description: 'Arquivo ressonancia_maria.pdf baixado',
          timestamp: new Date(Date.now() - 900000).toISOString()
        }
      ]
    };
  }
}

const adminService = new AdminService();
export default adminService;