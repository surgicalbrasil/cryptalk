import CryptoJS from 'crypto-js';
import CompanyCryptoService from './CompanyCryptoService';
import web3StorageService from './Web3StorageService';
import simpleWeb3Storage from './SimpleWeb3Storage';
import backendUploadService from './BackendUploadService';
import AccessControlService from './AccessControlService';

/**
 * Serviço de chat on-chain seguindo protocolo CrypTalk
 * Foco em criptografia e acesso controlado pela empresa
 */

export interface OnChainMessage {
  id: string;
  content: string;
  sender: string;
  recipient: string;
  timestamp: string; // ISO-8601 format
  messageHash: string; // Hash SHA-256 da mensagem
  type: 'text' | 'file' | 'system';
  encryptionLevel: 'company' | 'end-to-end';
  cid?: string; // Para arquivos armazenados no Web3Storage
  fileMetadata?: {
    originalName: string;
    fileType: string;
    fileSize: number;
    encryptionKey?: string; // Chave criptografada
  };
  onChainProof: {
    blockHash?: string; // Hash do bloco (simulado)
    txHash?: string; // Hash da transação (simulado)
    gasUsed?: number; // Gas usado (simulado)
    confirmed: boolean;
  };
}

export interface SecureSession {
  sessionId: string;
  participants: string[];
  startTime: string;
  lastActivity: string;
  messages: OnChainMessage[];
  encryption: {
    method: 'AES-256-GCM';
    provider: 'CompanyCrypto';
    accessControl: string; // Endereço da empresa
  };
}

class OnChainChatService {
  private currentSession: SecureSession | null = null;
  private userDID: string | null = null;
  private messageListeners: Array<(message: OnChainMessage) => void> = [];
  private uploadListeners: Array<(progress: number) => void> = [];
  
  // Endereço da empresa para controle de acesso
  private readonly COMPANY_WALLET = '0x650687aD5F50E2DF6763f300BCAC9E03B4B4fCb6';

  /**
   * Inicializa o serviço de chat on-chain
   */
  async initialize(userDID: string): Promise<boolean> {
    try {
      this.userDID = userDID;
      
      console.log('🔐 Inicializando chat on-chain seguro...');
      console.log(`👤 Cliente: ${this.truncateDID(userDID)}`);
      console.log(`🏥 Empresa: ${this.COMPANY_WALLET}`);
      
      // Criar sessão segura
      this.currentSession = this.createSecureSession(userDID);
      
      // Simular conexão blockchain
      await this.simulateBlockchainConnection();
      
      console.log('✅ Chat on-chain inicializado com criptografia empresarial');
      return true;
    } catch (error) {
      console.error('❌ Erro ao inicializar chat on-chain:', error);
      return false;
    }
  }

  /**
   * Cria uma sessão segura on-chain
   */
  private createSecureSession(userDID: string): SecureSession {
    const sessionId = this.generateSecureSessionId();
    const now = new Date().toISOString();
    
    const session: SecureSession = {
      sessionId,
      participants: [userDID, 'did:key:z6MkpTMTCcMMKgRFPAvoAtgf9Sip8uk2KoF7LU2JTvqLDmjQ'], // Surgical Brasil
      startTime: now,
      lastActivity: now,
      messages: [],
      encryption: {
        method: 'AES-256-GCM',
        provider: 'CompanyCrypto',
        accessControl: this.COMPANY_WALLET
      }
    };

    // Adicionar mensagem de boas-vindas do sistema
    const welcomeMessage = this.createSystemMessage(
      'Bem-vindo ao Chat Médico Seguro! Aqui você pode enviar documentos confidenciais que serão criptografados e acessíveis apenas pela Surgical Brasil.',
      'did:key:z6MkpTMTCcMMKgRFPAvoAtgf9Sip8uk2KoF7LU2JTvqLDmjQ'
    );
    
    session.messages.push(welcomeMessage);

    return session;
  }

  /**
   * Envia uma mensagem de texto on-chain
   */
  async sendMessage(content: string, recipient: string): Promise<OnChainMessage> {
    if (!this.userDID || !this.currentSession) {
      throw new Error('Serviço não inicializado');
    }

    // Verificar acesso do usuário ao chat on-chain
    const accessControl = AccessControlService.getInstance();
    const walletAddress = this.extractWalletFromDID(this.userDID);
    const hasAccess = await accessControl.checkAccess(walletAddress);
    
    if (!hasAccess) {
      const clientInfo = await accessControl.getClientInfo(walletAddress);
      const reason = clientInfo?.blockReason || 'Acesso negado. Entre em contato com a administração.';
      throw new Error(`Acesso ao chat on-chain bloqueado: ${reason}`);
    }

    try {
      // Criar mensagem com criptografia empresarial
      const message = await this.createSecureMessage(content, this.userDID, recipient, 'text');
      
      // Simular prova on-chain
      await this.generateOnChainProof(message);
      
      // Adicionar à sessão
      this.currentSession.messages.push(message);
      this.currentSession.lastActivity = message.timestamp;

      // Notificar listeners
      this.notifyMessageListeners(message);
      
      // Simular resposta da empresa
      this.simulateCompanyResponse(message);

      console.log('📤 Mensagem on-chain enviada:', {
        id: message.id,
        timestamp: message.timestamp,
        hash: message.messageHash.substring(0, 8) + '...',
        confirmed: message.onChainProof.confirmed
      });

      return message;
    } catch (error) {
      throw new Error(`Erro ao enviar mensagem on-chain: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Envia um arquivo criptografado on-chain
   */
  async sendEncryptedFile(file: File, recipient: string): Promise<OnChainMessage> {
    if (!this.userDID || !this.currentSession) {
      throw new Error('Serviço não inicializado');
    }

    // Verificar acesso do usuário ao chat on-chain
    const accessControl = AccessControlService.getInstance();
    const walletAddress = this.extractWalletFromDID(this.userDID);
    const hasAccess = await accessControl.checkAccess(walletAddress);
    
    if (!hasAccess) {
      const clientInfo = await accessControl.getClientInfo(walletAddress);
      const reason = clientInfo?.blockReason || 'Acesso negado. Entre em contato com a administração.';
      throw new Error(`Acesso ao chat on-chain bloqueado: ${reason}`);
    }

    try {
      console.log('📁 Iniciando upload de arquivo criptografado...');
      console.log(`   Arquivo: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      
      // Notificar progresso inicial
      this.notifyUploadProgress(0);

      // Criptografar arquivo com CompanyCryptoService
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Converter para base64 de forma segura para arquivos grandes
      let base64Content = '';
      const chunkSize = 0x8000; // 32KB chunks
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, i + chunkSize);
        base64Content += String.fromCharCode.apply(null, Array.from(chunk));
      }
      base64Content = btoa(base64Content);
      
      this.notifyUploadProgress(25);

      // Criptografar para a empresa
      const encryptionResult = await CompanyCryptoService.encryptForCompany(
        base64Content,
        this.userDID,
        file.name
      );

      this.notifyUploadProgress(50);

      // Upload para Web3Storage
      const uploadData = {
        metadata: encryptionResult.metadata,
        encryptedContent: encryptionResult.encryptedContent
      };

      const jsonFile = new File(
        [JSON.stringify(uploadData)],
        `encrypted-${encryptionResult.metadata.fileId}.json`,
        { type: 'application/json' }
      );

      this.notifyUploadProgress(75);

      // Fazer upload via Backend Server
      console.log('📤 Fazendo upload via servidor backend...');
      
      // Upload através do servidor da empresa
      const uploadResult = await backendUploadService.uploadEncryptedFile(
        jsonFile,
        this.userDID,
        recipient,
        encryptionResult.metadata
      );
      
      console.log('📦 Resultado do upload:', uploadResult);
      
      if (!uploadResult.success || !uploadResult.cid) {
        console.error('❌ Erro no upload:', uploadResult.error);
        throw new Error(uploadResult.error || 'Falha no upload. Verifique se o servidor de upload está rodando.');
      }

      this.notifyUploadProgress(90);

      // Criar mensagem de arquivo
      const message = await this.createFileMessage(
        file,
        uploadResult.cid,
        this.userDID,
        recipient,
        encryptionResult.metadata.fileId
      );

      // Simular prova on-chain
      await this.generateOnChainProof(message);

      this.notifyUploadProgress(100);

      // Adicionar à sessão
      this.currentSession.messages.push(message);
      this.currentSession.lastActivity = message.timestamp;

      // Notificar listeners
      this.notifyMessageListeners(message);

      console.log('✅ Arquivo criptografado enviado com sucesso!');
      console.log(`   CID: ${uploadResult.cid}`);
      console.log(`   Acesso: Apenas ${this.COMPANY_WALLET}`);

      return message;
    } catch (error) {
      console.error('❌ Erro no upload:', error);
      throw new Error(`Erro ao enviar arquivo: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Cria uma mensagem segura
   */
  private async createSecureMessage(
    content: string, 
    sender: string, 
    recipient: string, 
    type: 'text' | 'file'
  ): Promise<OnChainMessage> {
    const timestamp = new Date().toISOString();
    const id = this.generateMessageId();
    
    // Hash da mensagem para integridade
    const messageData = `${id}${content}${sender}${recipient}${timestamp}`;
    const messageHash = CryptoJS.SHA256(messageData).toString();
    
    const message: OnChainMessage = {
      id,
      content,
      sender,
      recipient,
      timestamp,
      messageHash,
      type,
      encryptionLevel: 'company',
      onChainProof: {
        confirmed: false
      }
    };

    return message;
  }

  /**
   * Cria uma mensagem de arquivo
   */
  private async createFileMessage(
    file: File,
    cid: string,
    sender: string,
    recipient: string,
    encryptionKey: string
  ): Promise<OnChainMessage> {
    const timestamp = new Date().toISOString();
    const id = this.generateMessageId();
    
    const content = `📁 ${file.name}`;
    const messageData = `${id}${content}${sender}${recipient}${timestamp}${cid}`;
    const messageHash = CryptoJS.SHA256(messageData).toString();
    
    const message: OnChainMessage = {
      id,
      content,
      sender,
      recipient,
      timestamp,
      messageHash,
      type: 'file',
      encryptionLevel: 'company',
      cid,
      fileMetadata: {
        originalName: file.name,
        fileType: file.type,
        fileSize: file.size,
        encryptionKey
      },
      onChainProof: {
        confirmed: false
      }
    };

    return message;
  }

  /**
   * Cria uma mensagem do sistema
   */
  private createSystemMessage(content: string, sender: string): OnChainMessage {
    const timestamp = new Date().toISOString();
    const id = this.generateMessageId();
    
    const messageData = `${id}${content}${sender}system${timestamp}`;
    const messageHash = CryptoJS.SHA256(messageData).toString();
    
    return {
      id,
      content,
      sender,
      recipient: 'system',
      timestamp,
      messageHash,
      type: 'system',
      encryptionLevel: 'company',
      onChainProof: {
        confirmed: true,
        blockHash: this.generateBlockHash(),
        txHash: this.generateTxHash(),
        gasUsed: 21000
      }
    };
  }

  /**
   * Gera prova on-chain (simulada)
   */
  private async generateOnChainProof(message: OnChainMessage): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        message.onChainProof = {
          confirmed: true,
          blockHash: this.generateBlockHash(),
          txHash: this.generateTxHash(),
          gasUsed: Math.floor(Math.random() * 50000) + 21000 // 21k-71k gas
        };
        resolve();
      }, 2000 + Math.random() * 3000); // 2-5 segundos para "confirmação"
    });
  }

  /**
   * Simula resposta da empresa
   */
  private simulateCompanyResponse(userMessage: OnChainMessage): void {
    const responses = [
      'Documento recebido e analisado. Nossa equipe entrará em contato em breve.',
      'Exame recebido com segurança. Agendaremos uma consulta para discussão.',
      'Arquivo criptografado armazenado com sucesso. Obrigado pela confiança.',
      'Documento confidencial processado. Retornaremos com a análise em 24h.'
    ];

    setTimeout(() => {
      const responseContent = responses[Math.floor(Math.random() * responses.length)];
      const response = this.createSystemMessage(
        responseContent,
        'did:key:z6MkpTMTCcMMKgRFPAvoAtgf9Sip8uk2KoF7LU2JTvqLDmjQ'
      );

      if (this.currentSession) {
        this.currentSession.messages.push(response);
        this.currentSession.lastActivity = response.timestamp;
      }

      this.notifyMessageListeners(response);
    }, 3000 + Math.random() * 4000); // 3-7 segundos
  }

  /**
   * Simula conexão blockchain
   */
  private async simulateBlockchainConnection(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('⛓️ Conectado à rede blockchain (simulado)');
        console.log('🔐 Controle de acesso configurado para:', this.COMPANY_WALLET);
        resolve();
      }, 1500);
    });
  }

  /**
   * Adiciona listener para novas mensagens
   */
  onMessage(listener: (message: OnChainMessage) => void): void {
    this.messageListeners.push(listener);
  }

  /**
   * Remove listener de mensagens
   */
  removeMessageListener(listener: (message: OnChainMessage) => void): void {
    this.messageListeners = this.messageListeners.filter(l => l !== listener);
  }

  /**
   * Adiciona listener para progresso de upload
   */
  onUploadProgress(listener: (progress: number) => void): void {
    this.uploadListeners.push(listener);
  }

  /**
   * Remove listener de upload
   */
  removeUploadListener(listener: (progress: number) => void): void {
    this.uploadListeners = this.uploadListeners.filter(l => l !== listener);
  }

  /**
   * Notifica listeners sobre novas mensagens
   */
  private notifyMessageListeners(message: OnChainMessage): void {
    this.messageListeners.forEach(listener => listener(message));
  }

  /**
   * Notifica listeners sobre progresso de upload
   */
  private notifyUploadProgress(progress: number): void {
    this.uploadListeners.forEach(listener => listener(progress));
  }

  /**
   * Obtém histórico de mensagens
   */
  getMessages(): OnChainMessage[] {
    return this.currentSession?.messages || [];
  }

  /**
   * Obtém informações da sessão atual
   */
  getCurrentSession(): SecureSession | null {
    return this.currentSession;
  }

  /**
   * Verifica se usuário pode descriptografar arquivo
   */
  canDecryptFile(message: OnChainMessage): boolean {
    // Apenas a empresa pode descriptografar
    return false; // Clientes não podem descriptografar
  }

  /**
   * Gera ID único para mensagem
   */
  private generateMessageId(): string {
    return `onchain_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Gera ID único para sessão
   */
  private generateSecureSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const hash = CryptoJS.SHA256(`${timestamp}_${random}_${this.COMPANY_WALLET}`).toString();
    return `session_${hash.substring(0, 16)}`;
  }

  /**
   * Gera hash de bloco (simulado)
   */
  private generateBlockHash(): string {
    return '0x' + CryptoJS.SHA256(`block_${Date.now()}_${Math.random()}`).toString().substring(0, 64);
  }

  /**
   * Gera hash de transação (simulado)
   */
  private generateTxHash(): string {
    return '0x' + CryptoJS.SHA256(`tx_${Date.now()}_${Math.random()}`).toString().substring(0, 64);
  }

  /**
   * Trunca DID para exibição
   */
  private truncateDID(did: string): string {
    return `${did.substring(0, 12)}...${did.substring(did.length - 8)}`;
  }

  /**
   * Extrai endereço da carteira do DID
   */
  private extractWalletFromDID(did: string): string {
    // DID format: did:ethr:0x1234567890123456789012345678901234567890
    if (did.startsWith('did:ethr:')) {
      return did.replace('did:ethr:', '');
    }
    // Se não for um DID ethr, retorna um endereço padrão ou gera um erro
    // Por enquanto, vamos retornar o próprio DID como fallback
    return did;
  }

  /**
   * Desconecta o serviço
   */
  disconnect(): void {
    this.messageListeners = [];
    this.uploadListeners = [];
    this.currentSession = null;
    this.userDID = null;
    console.log('🔌 Chat on-chain desconectado');
  }
}

// Singleton instance
export const onChainChatService = new OnChainChatService();
export default onChainChatService;