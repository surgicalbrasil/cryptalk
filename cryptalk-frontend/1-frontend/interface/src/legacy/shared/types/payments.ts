// Payment Types
export interface PaymentTransaction {
  id: string;
  amount: number;
  currency: PaymentCurrency;
  from: string;
  to: string;
  status: PaymentStatus;
  method: PaymentMethod;
  createdAt: Date;
  processedAt?: Date;
  txHash?: string;
  blockNumber?: number;
  gasPrice?: number;
  gasUsed?: number;
  metadata?: PaymentMetadata;
}

export interface PaymentMetadata {
  description?: string;
  invoiceId?: string;
  orderId?: string;
  tags?: string[];
  exchangeRate?: number;
  fiatAmount?: number;
  fiatCurrency?: string;
}

export interface PIXPayment {
  id: string;
  pixKey: string;
  amount: number;
  description: string;
  qrCode: string;
  expiresAt: Date;
  status: PIXStatus;
  txId?: string;
  paidAt?: Date;
}

export interface OnRampProvider {
  name: string;
  type: 'pix' | 'credit-card' | 'bank-transfer';
  supportedCurrencies: string[];
  fees: OnRampFees;
  limits: OnRampLimits;
  processingTime: string;
}

export interface OnRampFees {
  fixed: number;
  percentage: number;
  currency: string;
}

export interface OnRampLimits {
  min: number;
  max: number;
  daily: number;
  monthly: number;
  currency: string;
}

export interface CryptoPrice {
  symbol: string;
  price: number;
  currency: string;
  change24h: number;
  lastUpdated: Date;
}

export type PaymentCurrency = 'ETH' | 'MATIC' | 'USDC' | 'USDT' | 'BRL';
export type PaymentMethod = 'wallet' | 'pix' | 'credit-card' | 'bank-transfer';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type PIXStatus = 'pending' | 'paid' | 'expired' | 'cancelled';