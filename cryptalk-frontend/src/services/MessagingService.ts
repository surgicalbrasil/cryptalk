import web3StorageService from './Web3StorageService';
import mcpService from './MCPService';

/**
 * Types for messages
 */
export interface Message {
  id?: string;
  content: string;
  sender: string;
  recipient: string;
  timestamp: string;
  cid?: string;
  type: 'text' | 'file' | 'payment';
}

/**
 * MessagingService for CrypTalk
 * This service handles off-chain messaging functionality
 */
class MessagingService {
  private messages: Record<string, Message[]> = {};
  private mcpIntegrationEnabled: boolean = false;
  /**
   * Initialize the messaging service
   * @param useMCP Optional flag to enable MCP integration
   */
  async initialize(useMCP: boolean = false): Promise<boolean> {
    try {
      this.mcpIntegrationEnabled = useMCP;
      
      if (useMCP) {
        console.log('Initializing messaging service with MCP integration');
        // In a real implementation, you would connect to the MCP server here
        const did = web3StorageService.getUserDID();
        if (did) {
          await mcpService.connectToMessagingServer(did);
        }
      } else {
        console.log('Messaging service initialized (without MCP)');
      }
      
      return true;
    } catch (error) {
      console.error('Error initializing messaging service:', error);
      return false;
    }
  }
  /**
   * Send a message to a recipient
   * @param content The message content
   * @param recipientDID The recipient's DID
   * @returns The sent message
   */  async sendMessage(content: string, recipientDID: string): Promise<Message | null> {
    try {
      const senderDID = web3StorageService.getUserDID();
      if (!senderDID) {
        throw new Error('User not authenticated');
      }

      // Validate recipient DID format (allow both did:key: and did:eth: formats)
      if (!recipientDID || !(recipientDID.startsWith('did:key:') || recipientDID.startsWith('did:eth:'))) {
        throw new Error('Invalid recipient DID format. DID should start with did:key: or did:eth:');
      }
      
      // Store the message in Web3.Storage
      const cid = await web3StorageService.storeMessage(content, recipientDID);
      if (!cid) {
        throw new Error('Failed to store message');
      }

      const message: Message = {
        content,
        sender: senderDID,
        recipient: recipientDID,
        timestamp: new Date().toISOString(),
        cid,
        type: 'text',
      };

      // Add message to local storage
      this.addMessageToConversation(recipientDID, message);
      
      // If MCP integration is enabled, also send through MCP
      if (this.mcpIntegrationEnabled) {
        console.log('Sending message through MCP...');
        await mcpService.sendMessageThroughMCP(message);
      }

      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  }

  /**
   * Get messages for a conversation
   * @param participantDID The DID of the conversation participant
   * @returns The messages in the conversation
   */
  getMessages(participantDID: string): Message[] {
    return this.messages[participantDID] || [];
  }

  /**
   * Add a message to a conversation
   * @param participantDID The DID of the conversation participant
   * @param message The message to add
   */
  private addMessageToConversation(participantDID: string, message: Message): void {
    if (!this.messages[participantDID]) {
      this.messages[participantDID] = [];
    }
    this.messages[participantDID].push(message);
  }

  /**
   * Send a file message
   * @param file The file to send
   * @param recipientDID The recipient's DID
   * @returns The sent message
   */
  async sendFileMessage(file: File, recipientDID: string): Promise<Message | null> {
    try {
      const senderDID = web3StorageService.getUserDID();
      if (!senderDID) {
        throw new Error('User not authenticated');
      }

      // TODO: Implement file upload with Web3.Storage
      // For now, just create a placeholder message
      const message: Message = {
        content: `File: ${file.name}`,
        sender: senderDID,
        recipient: recipientDID,
        timestamp: new Date().toISOString(),
        type: 'file',
      };

      // Add message to local storage
      this.addMessageToConversation(recipientDID, message);

      return message;
    } catch (error) {
      console.error('Error sending file message:', error);
      return null;
    }
  }
}

// Export singleton instance
export const messagingService = new MessagingService();
export default messagingService;
