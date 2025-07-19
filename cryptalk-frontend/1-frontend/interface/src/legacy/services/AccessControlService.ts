/**
 * Serviço de Controle de Acesso para Chat On-Chain
 * Gerencia permissões de acesso baseadas em pagamento
 */

interface ClientAccess {
  walletAddress: string;
  hasOnChainAccess: boolean;
  paymentStatus: 'paid' | 'pending' | 'overdue';
  lastPaymentDate?: Date;
  expiryDate?: Date;
  blockReason?: string;
}

class AccessControlService {
  private static instance: AccessControlService;
  private accessList: Map<string, ClientAccess> = new Map();

  private constructor() {
    // Inicializar com dados de exemplo
    this.initializeMockData();
  }

  static getInstance(): AccessControlService {
    if (!AccessControlService.instance) {
      AccessControlService.instance = new AccessControlService();
    }
    return AccessControlService.instance;
  }

  private initializeMockData() {
    // Dados de exemplo para demonstração
    const mockClients: ClientAccess[] = [
      {
        walletAddress: '0x1234567890123456789012345678901234567890',
        hasOnChainAccess: true,
        paymentStatus: 'paid',
        lastPaymentDate: new Date('2025-01-15'),
        expiryDate: new Date('2025-02-15')
      },
      {
        walletAddress: '0x2345678901234567890123456789012345678901',
        hasOnChainAccess: false,
        paymentStatus: 'overdue',
        lastPaymentDate: new Date('2024-12-15'),
        blockReason: 'Pagamento em atraso'
      },
      {
        walletAddress: '0x3456789012345678901234567890123456789012',
        hasOnChainAccess: true,
        paymentStatus: 'paid',
        lastPaymentDate: new Date('2025-01-20'),
        expiryDate: new Date('2025-02-20')
      }
    ];

    mockClients.forEach(client => {
      this.accessList.set(client.walletAddress.toLowerCase(), client);
    });
  }

  // Verificar se um cliente tem acesso ao chat on-chain
  async checkAccess(walletAddress: string): Promise<boolean> {
    const client = this.accessList.get(walletAddress.toLowerCase());
    if (!client) {
      // Novo cliente - sem acesso por padrão
      return false;
    }

    // Verificar se o acesso expirou
    if (client.expiryDate && new Date() > client.expiryDate) {
      client.hasOnChainAccess = false;
      client.paymentStatus = 'overdue';
      client.blockReason = 'Acesso expirado';
    }

    return client.hasOnChainAccess;
  }

  // Obter todos os clientes
  async getAllClients(): Promise<ClientAccess[]> {
    return Array.from(this.accessList.values());
  }

  // Obter informações de um cliente específico
  async getClientInfo(walletAddress: string): Promise<ClientAccess | null> {
    return this.accessList.get(walletAddress.toLowerCase()) || null;
  }

  // Bloquear acesso de um cliente
  async blockAccess(walletAddress: string, reason: string): Promise<void> {
    const client = this.accessList.get(walletAddress.toLowerCase());
    if (client) {
      client.hasOnChainAccess = false;
      client.blockReason = reason;
      client.paymentStatus = 'overdue';
    } else {
      // Adicionar novo cliente bloqueado
      this.accessList.set(walletAddress.toLowerCase(), {
        walletAddress: walletAddress.toLowerCase(),
        hasOnChainAccess: false,
        paymentStatus: 'overdue',
        blockReason: reason
      });
    }
  }

  // Desbloquear acesso de um cliente
  async unblockAccess(walletAddress: string, daysValid: number = 30): Promise<void> {
    const client = this.accessList.get(walletAddress.toLowerCase());
    const now = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysValid);

    if (client) {
      client.hasOnChainAccess = true;
      client.paymentStatus = 'paid';
      client.lastPaymentDate = now;
      client.expiryDate = expiryDate;
      delete client.blockReason;
    } else {
      // Adicionar novo cliente com acesso
      this.accessList.set(walletAddress.toLowerCase(), {
        walletAddress: walletAddress.toLowerCase(),
        hasOnChainAccess: true,
        paymentStatus: 'paid',
        lastPaymentDate: now,
        expiryDate: expiryDate
      });
    }
  }

  // Atualizar status de pagamento
  async updatePaymentStatus(
    walletAddress: string, 
    status: 'paid' | 'pending' | 'overdue'
  ): Promise<void> {
    const client = this.accessList.get(walletAddress.toLowerCase());
    if (client) {
      client.paymentStatus = status;
      if (status === 'paid') {
        client.hasOnChainAccess = true;
        delete client.blockReason;
      }
    }
  }

  // Obter estatísticas de acesso
  async getAccessStats(): Promise<{
    totalClients: number;
    activeClients: number;
    blockedClients: number;
    pendingPayments: number;
  }> {
    const clients = Array.from(this.accessList.values());
    return {
      totalClients: clients.length,
      activeClients: clients.filter(c => c.hasOnChainAccess).length,
      blockedClients: clients.filter(c => !c.hasOnChainAccess).length,
      pendingPayments: clients.filter(c => c.paymentStatus === 'pending').length
    };
  }
}

export default AccessControlService;
export type { ClientAccess };