// Chat Types
export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderAddress?: string;
  timestamp: Date;
  type: MessageType;
  channel: ChatChannel;
  attachments?: MessageAttachment[];
  metadata?: MessageMetadata;
  signature?: string;
  blockchainTx?: string;
}

export interface MessageAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  cid: string;
  encrypted: boolean;
  thumbnail?: string;
}

export interface MessageMetadata {
  edited: boolean;
  editedAt?: Date;
  replyTo?: string;
  reactions?: MessageReaction[];
  readBy?: string[];
  priority?: MessagePriority;
}

export interface MessageReaction {
  emoji: string;
  userId: string;
  timestamp: Date;
}

export interface ChatChannel {
  id: string;
  name: string;
  type: ChannelType;
  participants: string[];
  createdAt: Date;
  lastActivity: Date;
  isEncrypted: boolean;
  onChain: boolean;
}

export interface TimestampProof {
  messageId: string;
  blockNumber: number;
  txHash: string;
  timestamp: Date;
  networkId: number;
  gasUsed: number;
}

export type MessageType = 'text' | 'file' | 'image' | 'document' | 'system';
export type ChannelType = 'general' | 'medical' | 'private' | 'group';
export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';
export type ChatStatus = 'online' | 'offline' | 'away' | 'busy';