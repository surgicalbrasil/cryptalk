import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Input,
  Button,
  Text,
  Badge,
  Avatar,
  Divider,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
  Alert,
  AlertIcon,
  Tooltip,
  Spinner
} from '@chakra-ui/react';
import { FiSend, FiPaperclip, FiMoreVertical, FiShield, FiClock, FiDownload } from 'react-icons/fi';
import { useTimestampChat } from '../hooks/useTimestampChat';
import { Message } from '../../../shared/types';

interface TimestampChatInterfaceProps {
  contractAddress: string;
  className?: string;
}

export const TimestampChatInterface: React.FC<TimestampChatInterfaceProps> = ({
  contractAddress,
  className
}) => {
  const [messageInput, setMessageInput] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const {
    messages,
    currentChannel,
    isLoading,
    isSending,
    sendMessage,
    exportChannelHistory,
    verifyMessage,
    refreshMessages
  } = useTimestampChat(contractAddress);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() && selectedFiles.length === 0) return;

    try {
      await sendMessage(
        messageInput.trim(),
        selectedFiles.length > 0 ? 'file' : 'text',
        selectedFiles.length > 0 ? selectedFiles : undefined
      );

      setMessageInput('');
      setSelectedFiles([]);
      
      toast({
        title: 'Message sent',
        description: 'Your message has been timestamped on the blockchain',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Failed to send message',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleVerifyMessage = async (messageId: string) => {
    try {
      const isValid = await verifyMessage(messageId);
      toast({
        title: 'Message Verification',
        description: isValid ? 'Message integrity verified ✓' : 'Message verification failed ✗',
        status: isValid ? 'success' : 'error',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Verification failed',
        description: 'Could not verify message integrity',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleExportHistory = async (format: 'json' | 'pdf' | 'csv') => {
    try {
      const blob = await exportChannelHistory(format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-history-${currentChannel?.id}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export successful',
        description: `Chat history exported as ${format.toUpperCase()}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    }).format(date);
  };

  if (!currentChannel) {
    return (
      <Alert status="warning">
        <AlertIcon />
        <Text>No active channel. Please create or select a channel to start chatting.</Text>
      </Alert>
    );
  }

  return (
    <VStack spacing={0} h="600px" className={className} border="1px" borderColor="gray.200" borderRadius="lg">
      {/* Header */}
      <HStack
        w="full"
        p={4}
        bg="blue.50"
        borderTopRadius="lg"
        justify="space-between"
        borderBottom="1px"
        borderColor="gray.200"
      >
        <VStack align="start" spacing={1}>
          <HStack>
            <Text fontWeight="bold">{currentChannel.name}</Text>
            <Badge colorScheme="purple" size="sm">
              <HStack spacing={1}>
                <FiShield size={12} />
                <Text>Blockchain Secured</Text>
              </HStack>
            </Badge>
          </HStack>
          <Text fontSize="sm" color="gray.600">
            {currentChannel.participants.length} participant(s) • Encrypted & Timestamped
          </Text>
        </VStack>

        <Menu>
          <MenuButton
            as={IconButton}
            icon={<FiMoreVertical />}
            variant="ghost"
            size="sm"
          />
          <MenuList>
            <MenuItem icon={<FiDownload />} onClick={() => handleExportHistory('json')}>
              Export as JSON
            </MenuItem>
            <MenuItem icon={<FiDownload />} onClick={() => handleExportHistory('pdf')}>
              Export as PDF
            </MenuItem>
            <MenuItem icon={<FiDownload />} onClick={() => handleExportHistory('csv')}>
              Export as CSV
            </MenuItem>
            <Divider />
            <MenuItem onClick={refreshMessages}>
              Refresh Messages
            </MenuItem>
          </MenuList>
        </Menu>
      </HStack>

      {/* Messages */}
      <VStack
        flex={1}
        w="full"
        overflowY="auto"
        spacing={3}
        p={4}
        align="stretch"
      >
        {isLoading ? (
          <HStack justify="center" p={8}>
            <Spinner />
            <Text>Loading messages...</Text>
          </HStack>
        ) : messages.length === 0 ? (
          <VStack spacing={4} justify="center" h="full" color="gray.500">
            <Text>No messages yet</Text>
            <Text fontSize="sm">Start a conversation to create timestamped records</Text>
          </VStack>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onVerify={() => handleVerifyMessage(message.id)}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </VStack>

      {/* File attachments preview */}
      {selectedFiles.length > 0 && (
        <Box w="full" p={2} bg="gray.50" borderTop="1px" borderColor="gray.200">
          <HStack spacing={2} overflowX="auto">
            {selectedFiles.map((file, index) => (
              <Badge key={index} colorScheme="blue" p={1} borderRadius="md">
                📎 {file.name}
              </Badge>
            ))}
            <Button size="xs" variant="outline" onClick={() => setSelectedFiles([])}>
              Clear
            </Button>
          </HStack>
        </Box>
      )}

      {/* Input */}
      <HStack w="full" p={4} spacing={2} bg="gray.50" borderBottomRadius="lg">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        
        <IconButton
          icon={<FiPaperclip />}
          variant="ghost"
          size="sm"
          onClick={handleFileSelect}
          aria-label="Attach file"
        />
        
        <Input
          placeholder="Type your message... (Enter to send)"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyPress={handleKeyPress}
          bg="white"
          isDisabled={isSending}
        />
        
        <Button
          leftIcon={<FiSend />}
          colorScheme="blue"
          onClick={handleSendMessage}
          isLoading={isSending}
          loadingText="Sending"
          isDisabled={!messageInput.trim() && selectedFiles.length === 0}
        >
          Send
        </Button>
      </HStack>
    </VStack>
  );
};

interface MessageBubbleProps {
  message: Message;
  onVerify: () => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onVerify }) => {
  const isCurrentUser = true; // This should come from auth context

  return (
    <HStack
      align="start"
      justify={isCurrentUser ? 'flex-end' : 'flex-start'}
      w="full"
    >
      {!isCurrentUser && (
        <Avatar size="sm" name={message.senderId} />
      )}
      
      <VStack
        align={isCurrentUser ? 'end' : 'start'}
        spacing={1}
        maxW="70%"
      >
        <Box
          bg={isCurrentUser ? 'blue.500' : 'gray.200'}
          color={isCurrentUser ? 'white' : 'black'}
          p={3}
          borderRadius="lg"
          borderBottomRightRadius={isCurrentUser ? 'sm' : 'lg'}
          borderBottomLeftRadius={isCurrentUser ? 'lg' : 'sm'}
        >
          <Text fontSize="sm" whiteSpace="pre-wrap">
            {message.content}
          </Text>
          
          {message.attachments && message.attachments.length > 0 && (
            <VStack spacing={1} mt={2} align="start">
              {message.attachments.map((attachment) => (
                <Badge key={attachment.id} colorScheme="blue" size="sm">
                  📎 {attachment.name}
                </Badge>
              ))}
            </VStack>
          )}
        </Box>
        
        <HStack spacing={2} fontSize="xs" color="gray.500">
          <HStack spacing={1}>
            <FiClock size={10} />
            <Text>{formatTimestamp(message.timestamp)}</Text>
          </HStack>
          
          {message.blockchainTx && (
            <Tooltip label="Verified on blockchain">
              <HStack spacing={1} cursor="pointer" onClick={onVerify}>
                <FiShield size={10} color="green" />
                <Text color="green.500">Verified</Text>
              </HStack>
            </Tooltip>
          )}
        </HStack>
      </VStack>
      
      {isCurrentUser && (
        <Avatar size="sm" name={message.senderId} />
      )}
    </HStack>
  );
};

function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  }).format(date);
}