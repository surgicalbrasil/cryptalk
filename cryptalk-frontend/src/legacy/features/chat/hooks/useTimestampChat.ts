import { useState, useEffect, useCallback } from 'react';
import { Message, ChatChannel, MessageType } from '../../../shared/types';
import { TimestampChatService } from '../services/TimestampChatService';

export interface UseTimestampChatReturn {
  messages: Message[];
  channels: ChatChannel[];
  currentChannel: ChatChannel | null;
  isLoading: boolean;
  isSending: boolean;
  sendMessage: (content: string, type?: MessageType, attachments?: File[]) => Promise<Message>;
  createChannel: (name: string, participants: string[]) => Promise<ChatChannel>;
  switchChannel: (channelId: string) => void;
  exportChannelHistory: (format?: 'json' | 'pdf' | 'csv') => Promise<Blob>;
  verifyMessage: (messageId: string) => Promise<boolean>;
  refreshMessages: () => Promise<void>;
}

export const useTimestampChat = (contractAddress: string): UseTimestampChatReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [currentChannel, setCurrentChannel] = useState<ChatChannel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [chatService] = useState(() => new TimestampChatService(contractAddress));

  // Load initial data
  useEffect(() => {
    initializeChat();
  }, []);

  // Load messages when channel changes
  useEffect(() => {
    if (currentChannel) {
      loadChannelMessages(currentChannel.id);
    }
  }, [currentChannel]);

  const initializeChat = async () => {
    setIsLoading(true);
    try {
      // Load available channels
      // This would typically fetch from an API or local storage
      const defaultChannel: ChatChannel = {
        id: 'general',
        name: 'General Medical Chat',
        type: 'medical',
        participants: ['current-user'],
        createdAt: new Date(),
        lastActivity: new Date(),
        isEncrypted: true,
        onChain: true
      };
      
      setChannels([defaultChannel]);
      setCurrentChannel(defaultChannel);
    } catch (error) {
      console.error('Failed to initialize chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadChannelMessages = async (channelId: string) => {
    setIsLoading(true);
    try {
      const channelMessages = await chatService.getChannelMessages(channelId);
      setMessages(channelMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = useCallback(async (
    content: string,
    type: MessageType = 'text',
    attachments?: File[]
  ): Promise<Message> => {
    if (!currentChannel) {
      throw new Error('No active channel');
    }

    setIsSending(true);
    try {
      const message = await chatService.sendTimestampedMessage(
        content,
        currentChannel.id,
        type,
        attachments
      );

      // Add message to local state immediately for better UX
      setMessages(prev => [...prev, message]);

      // Update channel last activity
      setChannels(prev =>
        prev.map(ch =>
          ch.id === currentChannel.id
            ? { ...ch, lastActivity: new Date() }
            : ch
        )
      );

      return message;
    } catch (error) {
      throw new Error(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSending(false);
    }
  }, [currentChannel, chatService]);

  const createChannel = useCallback(async (
    name: string,
    participants: string[]
  ): Promise<ChatChannel> => {
    try {
      const channel = await chatService.createSecureChannel(name, participants, true);
      setChannels(prev => [...prev, channel]);
      return channel;
    } catch (error) {
      throw new Error(`Failed to create channel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [chatService]);

  const switchChannel = useCallback((channelId: string) => {
    const channel = channels.find(ch => ch.id === channelId);
    if (channel) {
      setCurrentChannel(channel);
    }
  }, [channels]);

  const exportChannelHistory = useCallback(async (
    format: 'json' | 'pdf' | 'csv' = 'json'
  ): Promise<Blob> => {
    if (!currentChannel) {
      throw new Error('No active channel to export');
    }

    try {
      return await chatService.exportChannelHistory(currentChannel.id, format);
    } catch (error) {
      throw new Error(`Failed to export channel history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [currentChannel, chatService]);

  const verifyMessage = useCallback(async (messageId: string): Promise<boolean> => {
    try {
      return await chatService.verifyMessageIntegrity(messageId);
    } catch (error) {
      console.error('Failed to verify message:', error);
      return false;
    }
  }, [chatService]);

  const refreshMessages = useCallback(async () => {
    if (currentChannel) {
      await loadChannelMessages(currentChannel.id);
    }
  }, [currentChannel]);

  return {
    messages,
    channels,
    currentChannel,
    isLoading,
    isSending,
    sendMessage,
    createChannel,
    switchChannel,
    exportChannelHistory,
    verifyMessage,
    refreshMessages
  };
};