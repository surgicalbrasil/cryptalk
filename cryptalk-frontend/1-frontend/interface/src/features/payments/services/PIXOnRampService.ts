import { 
  PIXPayment, 
  PaymentTransaction, 
  OnRampProvider, 
  PaymentCurrency,
  PIXStatus 
} from '../../../shared/types';

export interface BrazilianBankAccount {
  accountNumber: string;
  bankCode: string;
  branchCode: string;
  accountType: 'checking' | 'savings';
  accountHolder: string;
  document: string; // CPF or CNPJ
}

export interface PIXKey {
  type: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
  value: string;
  bankCode: string;
  accountHolder: string;
}

export interface ConversionQuote {
  id: string;
  fromCurrency: string;
  toCurrency: PaymentCurrency;
  rate: number;
  amount: number;
  estimatedOutput: number;
  fees: {
    fixed: number;
    percentage: number;
    total: number;
  };
  expiresAt: Date;
  provider: string;
}

export class PIXOnRampService {
  private apiEndpoint: string;
  private apiKey: string;
  private webhookUrl?: string;

  constructor(apiEndpoint: string, apiKey: string, webhookUrl?: string) {
    this.apiEndpoint = apiEndpoint;
    this.apiKey = apiKey;
    this.webhookUrl = webhookUrl;
  }

  async createPIXPayment(
    amountBRL: number,
    targetCurrency: PaymentCurrency,
    targetWallet: string,
    description: string = 'Crypto purchase via PIX'
  ): Promise<PIXPayment> {
    try {
      const response = await this.makeAPICall('/pix/create', 'POST', {
        amount: amountBRL,
        currency: 'BRL',
        targetCurrency,
        targetWallet,
        description,
        webhookUrl: this.webhookUrl,
        expiresIn: 30 * 60 // 30 minutes
      });

      const pixPayment: PIXPayment = {
        id: response.id,
        pixKey: response.pixKey,
        amount: amountBRL,
        description,
        qrCode: response.qrCode,
        expiresAt: new Date(response.expiresAt),
        status: 'pending'
      };

      return pixPayment;
    } catch (error) {
      throw new Error(`Failed to create PIX payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getConversionQuote(
    amountBRL: number,
    targetCurrency: PaymentCurrency
  ): Promise<ConversionQuote> {
    try {
      const response = await this.makeAPICall('/quote', 'POST', {
        fromCurrency: 'BRL',
        toCurrency: targetCurrency,
        amount: amountBRL
      });

      return {
        id: response.quoteId,
        fromCurrency: 'BRL',
        toCurrency: targetCurrency,
        rate: response.rate,
        amount: amountBRL,
        estimatedOutput: response.estimatedOutput,
        fees: response.fees,
        expiresAt: new Date(response.expiresAt),
        provider: response.provider
      };
    } catch (error) {
      throw new Error(`Failed to get conversion quote: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async checkPIXStatus(pixId: string): Promise<PIXPayment> {
    try {
      const response = await this.makeAPICall(`/pix/${pixId}/status`);
      
      return {
        id: response.id,
        pixKey: response.pixKey,
        amount: response.amount,
        description: response.description,
        qrCode: response.qrCode,
        expiresAt: new Date(response.expiresAt),
        status: response.status,
        txId: response.txId,
        paidAt: response.paidAt ? new Date(response.paidAt) : undefined
      };
    } catch (error) {
      throw new Error(`Failed to check PIX status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async processOnRampTransaction(
    pixPayment: PIXPayment,
    quote: ConversionQuote,
    targetWallet: string
  ): Promise<PaymentTransaction> {
    try {
      // Verify PIX payment is completed
      const currentStatus = await this.checkPIXStatus(pixPayment.id);
      if (currentStatus.status !== 'paid') {
        throw new Error('PIX payment not completed yet');
      }

      // Process conversion and transfer
      const response = await this.makeAPICall('/onramp/process', 'POST', {
        pixPaymentId: pixPayment.id,
        quoteId: quote.id,
        targetWallet,
        targetCurrency: quote.toCurrency
      });

      const transaction: PaymentTransaction = {
        id: response.transactionId,
        amount: quote.estimatedOutput,
        currency: quote.toCurrency,
        from: 'pix-onramp',
        to: targetWallet,
        status: 'processing',
        method: 'pix',
        createdAt: new Date(),
        metadata: {
          description: `PIX on-ramp: ${pixPayment.amount} BRL → ${quote.estimatedOutput} ${quote.toCurrency}`,
          pixPaymentId: pixPayment.id,
          quoteId: quote.id,
          exchangeRate: quote.rate,
          fiatAmount: pixPayment.amount,
          fiatCurrency: 'BRL'
        }
      };

      return transaction;
    } catch (error) {
      throw new Error(`Failed to process on-ramp transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getTransactionHistory(
    walletAddress: string,
    limit: number = 50
  ): Promise<PaymentTransaction[]> {
    try {
      const response = await this.makeAPICall(`/transactions/${walletAddress}?limit=${limit}`);
      
      return response.transactions.map((tx: any) => ({
        id: tx.id,
        amount: tx.amount,
        currency: tx.currency,
        from: tx.from,
        to: tx.to,
        status: tx.status,
        method: tx.method,
        createdAt: new Date(tx.createdAt),
        processedAt: tx.processedAt ? new Date(tx.processedAt) : undefined,
        txHash: tx.txHash,
        blockNumber: tx.blockNumber,
        metadata: tx.metadata
      }));
    } catch (error) {
      throw new Error(`Failed to get transaction history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAvailableProviders(): Promise<OnRampProvider[]> {
    return [
      {
        name: 'PIX Instant',
        type: 'pix',
        supportedCurrencies: ['BRL'],
        fees: { fixed: 2.99, percentage: 1.5, currency: 'BRL' },
        limits: { min: 50, max: 50000, daily: 50000, monthly: 200000, currency: 'BRL' },
        processingTime: 'Instant to 15 minutes'
      },
      {
        name: 'Bank Transfer',
        type: 'bank-transfer',
        supportedCurrencies: ['BRL'],
        fees: { fixed: 5.99, percentage: 0.8, currency: 'BRL' },
        limits: { min: 100, max: 100000, daily: 100000, monthly: 500000, currency: 'BRL' },
        processingTime: '1-3 business days'
      }
    ];
  }

  async validatePIXKey(pixKey: string, type: PIXKey['type']): Promise<boolean> {
    try {
      const response = await this.makeAPICall('/pix/validate', 'POST', {
        pixKey,
        type
      });
      
      return response.valid;
    } catch (error) {
      return false;
    }
  }

  async estimateNetworkFees(currency: PaymentCurrency): Promise<{
    slow: number;
    standard: number;
    fast: number;
  }> {
    try {
      const response = await this.makeAPICall(`/fees/${currency}`);
      return response.networkFees;
    } catch (error) {
      // Return default estimates if API fails
      const defaults = {
        'ETH': { slow: 0.002, standard: 0.005, fast: 0.01 },
        'MATIC': { slow: 0.001, standard: 0.002, fast: 0.005 },
        'USDC': { slow: 0.001, standard: 0.002, fast: 0.005 },
        'USDT': { slow: 0.001, standard: 0.002, fast: 0.005 }
      };
      
      return defaults[currency] || { slow: 0.001, standard: 0.002, fast: 0.005 };
    }
  }

  async cancelPIXPayment(pixId: string): Promise<boolean> {
    try {
      await this.makeAPICall(`/pix/${pixId}/cancel`, 'POST');
      return true;
    } catch (error) {
      console.error('Failed to cancel PIX payment:', error);
      return false;
    }
  }

  // Webhook handler for PIX payment confirmations
  async handleWebhook(payload: any): Promise<void> {
    try {
      switch (payload.event) {
        case 'pix.payment.confirmed':
          await this.handlePIXConfirmation(payload.data);
          break;
        case 'transaction.completed':
          await this.handleTransactionCompletion(payload.data);
          break;
        case 'transaction.failed':
          await this.handleTransactionFailure(payload.data);
          break;
        default:
          console.log('Unknown webhook event:', payload.event);
      }
    } catch (error) {
      console.error('Webhook handling error:', error);
      throw error;
    }
  }

  private async handlePIXConfirmation(data: any): Promise<void> {
    // Handle PIX payment confirmation
    console.log('PIX payment confirmed:', data);
    // This would typically trigger the crypto conversion process
  }

  private async handleTransactionCompletion(data: any): Promise<void> {
    // Handle successful crypto transaction
    console.log('Transaction completed:', data);
    // This would update the UI and notify the user
  }

  private async handleTransactionFailure(data: any): Promise<void> {
    // Handle failed transaction
    console.log('Transaction failed:', data);
    // This would refund the PIX payment or retry the transaction
  }

  private async makeAPICall(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<any> {
    const url = `${this.apiEndpoint}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-API-Version': '2024-01'
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API call failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error occurred');
    }
  }
}