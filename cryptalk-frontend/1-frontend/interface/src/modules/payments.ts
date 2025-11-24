// 💰 Payments Module - Everything payment-related in one file

import { Module, Services, EventBus, Config } from '../system';

// ============= INTERFACES =============

export interface PaymentAmount {
  value: number;
  currency: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_transfer' | 'crypto';
  name: string;
}

export interface Payment {
  id: string;
  amount: PaymentAmount;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  method?: PaymentMethod;
  createdAt: Date;
  updatedAt: Date;
  description?: string;
  transactionHash?: string;
}

export interface PaymentIntent {
  id: string;
  amount: PaymentAmount;
  description?: string;
  expiresAt?: Date;
}

export interface IPaymentProvider {
  createIntent(amount: PaymentAmount, description?: string): Promise<PaymentIntent>;
  processPayment(intentId: string, method: PaymentMethod): Promise<Payment>;
  getPayment(paymentId: string): Promise<Payment>;
  listPayments(limit?: number): Promise<Payment[]>;
  refundPayment(paymentId: string): Promise<Payment>;
  getSupportedCurrencies(): Promise<string[]>;
  getProviderName(): string;
  isHealthy(): Promise<boolean>;
}

// ============= MOONPAY PROVIDER =============

export class MoonPayProvider implements IPaymentProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = Config.payments.moonpay.apiKey || '';
    this.baseUrl = Config.payments.moonpay.sandboxMode 
      ? 'https://api.moonpay.com' 
      : 'https://api.moonpay.com';
  }

  async initialize() {
    if (!this.apiKey) {
      throw new Error('MoonPay API key required for production');
    }
    
    // Test API connection
    try {
      await this.makeRequest('GET', '/v1/currencies');
      console.log('MoonPay API connected');
    } catch (error) {
      console.warn('MoonPay API connection failed, using fallback');
      // Could fallback to mock behavior
    }
  }

  async createIntent(amount: PaymentAmount, description?: string): Promise<PaymentIntent> {
    const data = {
      baseCurrencyAmount: amount.value,
      baseCurrencyCode: amount.currency.toUpperCase(),
      description
    };

    const response = await this.makeRequest('POST', '/v1/transactions', data);
    
    return {
      id: response.id,
      amount,
      description,
      expiresAt: response.expiresAt ? new Date(response.expiresAt) : undefined
    };
  }

  async processPayment(intentId: string, method: PaymentMethod): Promise<Payment> {
    const data = {
      transactionId: intentId,
      paymentMethod: method.type
    };

    const response = await this.makeRequest('POST', `/v1/transactions/${intentId}/execute`, data);
    
    return {
      id: response.id,
      amount: {
        value: response.baseCurrencyAmount,
        currency: response.baseCurrencyCode.toLowerCase()
      },
      status: this.mapStatus(response.status),
      method,
      createdAt: new Date(response.createdAt),
      updatedAt: new Date(response.updatedAt),
      description: response.description,
      transactionHash: response.cryptoTransactionId
    };
  }

  async getPayment(paymentId: string): Promise<Payment> {
    const response = await this.makeRequest('GET', `/v1/transactions/${paymentId}`);
    
    return {
      id: response.id,
      amount: {
        value: response.baseCurrencyAmount,
        currency: response.baseCurrencyCode.toLowerCase()
      },
      status: this.mapStatus(response.status),
      createdAt: new Date(response.createdAt),
      updatedAt: new Date(response.updatedAt),
      description: response.description,
      transactionHash: response.cryptoTransactionId
    };
  }

  async listPayments(limit = 20): Promise<Payment[]> {
    const response = await this.makeRequest('GET', `/v1/transactions?limit=${limit}`);
    
    return response.data.map((tx: any) => ({
      id: tx.id,
      amount: {
        value: tx.baseCurrencyAmount,
        currency: tx.baseCurrencyCode.toLowerCase()
      },
      status: this.mapStatus(tx.status),
      createdAt: new Date(tx.createdAt),
      updatedAt: new Date(tx.updatedAt),
      description: tx.description,
      transactionHash: tx.cryptoTransactionId
    }));
  }

  async refundPayment(paymentId: string): Promise<Payment> {
    const response = await this.makeRequest('POST', `/v1/transactions/${paymentId}/refund`);
    
    return {
      id: response.id,
      amount: {
        value: response.baseCurrencyAmount,
        currency: response.baseCurrencyCode.toLowerCase()
      },
      status: 'refunded',
      createdAt: new Date(response.createdAt),
      updatedAt: new Date(response.updatedAt)
    };
  }

  async getSupportedCurrencies(): Promise<string[]> {
    const response = await this.makeRequest('GET', '/v1/currencies');
    return response.map((currency: any) => currency.code.toLowerCase());
  }

  getProviderName() { return 'MoonPay'; }
  
  async isHealthy(): Promise<boolean> {
    try {
      await this.makeRequest('GET', '/v1/currencies', null, { timeout: 5000 });
      return true;
    } catch { return false; }
  }

  private async makeRequest(method: string, endpoint: string, data?: any, options?: { timeout?: number }) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Authorization': `Api-Key ${this.apiKey}`,
      'Content-Type': 'application/json'
    };

    const requestOptions: RequestInit = {
      method,
      headers,
      signal: options?.timeout ? AbortSignal.timeout(options.timeout) : undefined
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      requestOptions.body = JSON.stringify(data);
    }

    const response = await fetch(url, requestOptions);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  private mapStatus(status: string): Payment['status'] {
    switch (status.toLowerCase()) {
      case 'pending': return 'pending';
      case 'waitingpayment':
      case 'processing': return 'processing';
      case 'completed': return 'completed';
      case 'failed': return 'failed';
      case 'cancelled': return 'cancelled';
      case 'refunded': return 'refunded';
      default: return 'pending';
    }
  }
}

// ============= MOCK PROVIDER =============

export class MockPaymentProvider implements IPaymentProvider {
  private payments = new Map<string, Payment>();
  private intents = new Map<string, PaymentIntent>();
  private idCounter = 1;

  async createIntent(amount: PaymentAmount, description?: string): Promise<PaymentIntent> {
    await this.delay(200);

    const intentId = `mock_intent_${this.idCounter++}`;
    const intent: PaymentIntent = {
      id: intentId,
      amount,
      description,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    };

    this.intents.set(intentId, intent);
    return intent;
  }

  async processPayment(intentId: string, method: PaymentMethod): Promise<Payment> {
    await this.delay(1000); // Simulate processing time

    const intent = this.intents.get(intentId);
    if (!intent) throw new Error('Payment intent not found');

    const paymentId = `mock_payment_${this.idCounter++}`;
    const status = this.simulateStatus();
    const payment: Payment = {
      id: paymentId,
      amount: intent.amount,
      status,
      method,
      createdAt: new Date(),
      updatedAt: new Date(),
      description: intent.description,
      transactionHash: status === 'completed' 
        ? `0x${Math.random().toString(16).substring(2, 66)}` 
        : undefined
    };

    this.payments.set(paymentId, payment);
    return payment;
  }

  async getPayment(paymentId: string): Promise<Payment> {
    await this.delay(100);
    
    const payment = this.payments.get(paymentId);
    if (!payment) throw new Error('Payment not found');
    return payment;
  }

  async listPayments(limit = 20): Promise<Payment[]> {
    await this.delay(150);
    
    return Array.from(this.payments.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async refundPayment(paymentId: string): Promise<Payment> {
    await this.delay(500);
    
    const payment = this.payments.get(paymentId);
    if (!payment) throw new Error('Payment not found');
    if (payment.status !== 'completed') throw new Error('Only completed payments can be refunded');

    payment.status = 'refunded';
    payment.updatedAt = new Date();
    
    return payment;
  }

  async getSupportedCurrencies(): Promise<string[]> {
    await this.delay(100);
    return ['usd', 'eur', 'gbp', 'btc', 'eth'];
  }

  getProviderName() { return 'Mock Payments'; }
  async isHealthy() { return true; }

  private delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

  private simulateStatus(): Payment['status'] {
    const random = Math.random();
    if (random < 0.8) return 'completed';
    if (random < 0.9) return 'pending';
    return 'failed';
  }

  // Testing utilities
  clear() {
    this.payments.clear();
    this.intents.clear();
    this.idCounter = 1;
  }

  getPaymentCount() { return this.payments.size; }
  
  setPaymentStatus(paymentId: string, status: Payment['status']) {
    const payment = this.payments.get(paymentId);
    if (payment) {
      payment.status = status;
      payment.updatedAt = new Date();
      return true;
    }
    return false;
  }
}

// ============= PAYMENTS MODULE =============

export class PaymentModule implements Module {
  name = 'payments';
  private provider: IPaymentProvider | null = null;
  private events = EventBus.getInstance();

  async initialize() {
    // Create provider based on config
    if (Config.payments.provider === 'moonpay' && Config.isProd) {
      this.provider = new MoonPayProvider();
      if (typeof (this.provider as any).initialize === 'function') {
        await (this.provider as any).initialize();
      }
    } else {
      this.provider = new MockPaymentProvider();
    }

    // Register service
    Services.register('payments', {
      createIntent: this.createIntent.bind(this),
      processPayment: this.processPayment.bind(this),
      getPayment: this.getPayment.bind(this),
      listPayments: this.listPayments.bind(this),
      refundPayment: this.refundPayment.bind(this),
      getSupportedCurrencies: this.getSupportedCurrencies.bind(this),
      provider: this.provider
    });

    console.log(`Payments: ${this.provider.getProviderName()}`);
  }

  async isHealthy() {
    return this.provider ? await this.provider.isHealthy() : false;
  }

  private async createIntent(amount: PaymentAmount, description?: string) {
    if (!this.provider) throw new Error('Payments not initialized');
    
    try {
      const result = await this.provider.createIntent(amount, description);
      this.events.emit('payments:intent_created', { intent: result });
      return result;
    } catch (error) {
      this.events.emit('payments:error', { error: String(error), operation: 'create_intent' });
      throw error;
    }
  }

  private async processPayment(intentId: string, method: PaymentMethod) {
    if (!this.provider) throw new Error('Payments not initialized');
    
    try {
      const result = await this.provider.processPayment(intentId, method);
      
      if (result.status === 'completed') {
        this.events.emit('payments:completed', { payment: result });
      } else if (result.status === 'failed') {
        this.events.emit('payments:failed', { payment: result });
      }
      
      return result;
    } catch (error) {
      this.events.emit('payments:error', { error: String(error), operation: 'process_payment' });
      throw error;
    }
  }

  private async getPayment(paymentId: string) {
    if (!this.provider) throw new Error('Payments not initialized');
    return await this.provider.getPayment(paymentId);
  }

  private async listPayments(limit?: number) {
    if (!this.provider) throw new Error('Payments not initialized');
    return await this.provider.listPayments(limit);
  }

  private async refundPayment(paymentId: string) {
    if (!this.provider) throw new Error('Payments not initialized');
    
    try {
      const result = await this.provider.refundPayment(paymentId);
      this.events.emit('payments:refunded', { payment: result });
      return result;
    } catch (error) {
      this.events.emit('payments:error', { error: String(error), operation: 'refund' });
      throw error;
    }
  }

  private async getSupportedCurrencies() {
    if (!this.provider) throw new Error('Payments not initialized');
    return await this.provider.getSupportedCurrencies();
  }
}