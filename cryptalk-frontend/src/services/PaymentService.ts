import { ethers } from 'ethers';
import web3StorageService from './Web3StorageService';
import mcpService from './MCPService';
import { Message } from './MessagingService';
import AppConfig from '../config/AppConfig';

/**
 * Interface for payment transactions
 */
export interface PaymentTransaction {
  id?: string;
  amount: number;
  sender: string;
  recipient: string;
  timestamp: string;
  status: 'pending' | 'completed' | 'failed';
  txHash?: string;
}

/**
 * PaymentService for CrypTalk
 * This service handles payment functionality
 */
class PaymentService {
  private wallet: ethers.Wallet | null = null;
  private provider: ethers.Provider | null = null;
  private transactions: PaymentTransaction[] = [];
  private mcpIntegrationEnabled: boolean = false;
  /**
   * Initialize the payment service with a wallet
   * Note: In a real app, this would be more secure
   */
  async initialize(privateKey?: string, useMCP: boolean = false): Promise<boolean> {
    try {
      this.mcpIntegrationEnabled = useMCP;
      
      // Create a provider (for testnet in this case)
      this.provider = new ethers.JsonRpcProvider('https://rpc-mumbai.maticvigil.com');
        // Create a wallet if privateKey is provided, otherwise create a random wallet
      if (privateKey) {
        this.wallet = new ethers.Wallet(privateKey, this.provider) as any;
      } else {
        this.wallet = ethers.Wallet.createRandom().connect(this.provider) as any;
      }
      
      // If MCP integration is enabled, set up MCP payment server connection
      if (useMCP) {
        console.log('Initializing payment service with MCP integration');
        const did = web3StorageService.getUserDID();
        if (did) {
          await mcpService.connectToPaymentServer(did);
        }
      }
      
      console.log('Payment service initialized with address:', this.wallet?.address);
      return true;
    } catch (error) {
      console.error('Error initializing payment service:', error);
      return false;
    }
  }

  /**
   * Get the current wallet address
   */
  getWalletAddress(): string | null {
    return this.wallet ? this.wallet.address : null;
  }

  /**
   * Get wallet balance
   */
  async getBalance(): Promise<string> {
    try {
      if (!this.wallet || !this.provider) {
        throw new Error('Wallet not initialized');
      }
      
      const balance = await this.provider.getBalance(this.wallet.address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting balance:', error);
      return '0.0';
    }
  }  /**
   * Send a payment - automatically chooses between MetaMask and internal wallet based on availability
   * @param recipientAddress Recipient's wallet address
   * @param amount Amount to send (in ETH)
   * @param recipientDID Optional recipient's DID for storing in Web3.Storage
   */
  async sendPayment(
    recipientAddress: string,
    amount: number,
    recipientDID?: string
  ): Promise<PaymentTransaction | null> {
    try {
      // Check if MetaMask is available and connected
      if (window.ethereum && window.ethereum.selectedAddress) {
        console.log('Using MetaMask for payment');
        return this.sendPaymentWithMetaMask(recipientAddress, amount, recipientDID);
      }
      
      // Fall back to internal wallet if MetaMask is not available
      console.log('Using internal wallet for payment');
      
      if (!this.wallet || !this.provider) {
        throw new Error('Wallet not initialized');
      }
      
      // Convert the amount to wei
      const amountWei = ethers.parseEther(amount.toString());
      
      // Create transaction object
      const tx = await this.wallet.sendTransaction({
        to: recipientAddress,
        value: amountWei
      });
      
      console.log('Transaction sent:', tx.hash);
      
      // Create a transaction record
      const transaction: PaymentTransaction = {
        amount,
        sender: this.wallet.address,
        recipient: recipientAddress,
        timestamp: new Date().toISOString(),
        status: 'pending',
        txHash: tx.hash
      };
      
      // Wait for the transaction to be mined
      const receipt = await tx.wait();
      transaction.status = receipt && receipt.status === 1 ? 'completed' : 'failed';
      
      // Add to local storage
      this.transactions.push(transaction);
        // If recipientDID is provided, store the transaction in Web3.Storage
      if (recipientDID) {
        await this.storePaymentTransaction(transaction, recipientDID);
        
        // If MCP integration is enabled, send payment info through MCP
        if (this.mcpIntegrationEnabled) {
          console.log('Sending payment info through MCP...');
          await mcpService.sendPaymentThroughMCP({
            amount: transaction.amount,
            sender: transaction.sender,
            recipient: transaction.recipient,
            timestamp: transaction.timestamp
          });
        }
      }
      
      return transaction;
    } catch (error) {
      console.error('Error sending payment:', error);
      return null;
    }
  }

  /**
   * Send a payment using MetaMask
   * @param recipientAddress Recipient's wallet address
   * @param amount Amount to send (in ETH)
   * @param recipientDID Optional recipient's DID for storing in Web3.Storage
   */
  async sendPaymentWithMetaMask(
    recipientAddress: string,
    amount: number,
    recipientDID?: string
  ): Promise<PaymentTransaction | null> {
    try {
      if (!window.ethereum || !window.ethereum.selectedAddress) {
        throw new Error('MetaMask is not available or not connected');
      }
      
      // Check if the recipient address is valid
      if (!recipientAddress.startsWith('0x') || recipientAddress.length !== 42) {
        throw new Error('Invalid recipient address');
      }
      
      // Convert amount to hex string for MetaMask
      const amountWei = ethers.parseEther(amount.toString());
      const amountHex = `0x${amountWei.toString(16)}`;
      
      // Request transaction from MetaMask
      console.log('Requesting transaction from MetaMask...');
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: window.ethereum.selectedAddress,
          to: recipientAddress,
          value: amountHex,
        }],
      });
      
      console.log('MetaMask transaction sent:', txHash);
      
      // Create a transaction record
      const transaction: PaymentTransaction = {
        amount,
        sender: window.ethereum.selectedAddress,
        recipient: recipientAddress,
        timestamp: new Date().toISOString(),
        status: 'completed', // Assume completed for now since MetaMask handles confirmations
        txHash: txHash
      };
      
      // Add to local storage
      this.transactions.push(transaction);
      
      // If recipientDID is provided, store the transaction in Web3.Storage
      if (recipientDID) {
        await this.storePaymentTransaction(transaction, recipientDID);
        
        // If MCP integration is enabled, send payment info through MCP
        if (this.mcpIntegrationEnabled) {
          console.log('Sending payment info through MCP...');
          await mcpService.sendPaymentThroughMCP({
            amount: transaction.amount,
            sender: transaction.sender,
            recipient: transaction.recipient,
            timestamp: transaction.timestamp
          });
        }
      }
      
      return transaction;
    } catch (error) {
      console.error('Error sending payment with MetaMask:', error);
      return null;
    }
  }

  /**
   * Get all transactions
   */
  getTransactions(): PaymentTransaction[] {
    return this.transactions;
  }

  /**
   * Get transactions by recipient address
   * @param recipientAddress The recipient's address to filter by
   */
  getTransactionsByRecipient(recipientAddress: string): PaymentTransaction[] {
    if (!recipientAddress) {
      return [];
    }

    // Filter transactions for the specified recipient
    return this.transactions.filter(tx => 
      tx.recipient.toLowerCase() === recipientAddress.toLowerCase()
    );
  }  /**
   * Store a payment transaction in Web3.Storage
   */
  private async storePaymentTransaction(
    transaction: PaymentTransaction,
    recipientDID: string
  ): Promise<string | null> {
    try {
      const senderDID = web3StorageService.getUserDID();
      if (!senderDID) {
        throw new Error('User not authenticated');
      }

      // Include recipient DID in transaction metadata
      const transactionWithMeta = {
        ...transaction,
        recipientDID
      };

      // Store the transaction in Web3.Storage
      const result = await web3StorageService.storeContent(
        JSON.stringify(transactionWithMeta),
        { 
          encrypted: true, 
          name: `payment-${transaction.timestamp}.json` 
        }
      );
      
      return result.success ? result.cid : null;
    } catch (error) {
      console.error('Error storing payment transaction:', error);
      return null;
    }
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
export default paymentService;
