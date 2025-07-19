import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  Avatar,
  Card,
  CardBody,
  Spinner,
  Alert,
  AlertIcon,
  Badge,
  Divider,
  IconButton,
  useToast
} from '@chakra-ui/react';
import { FiSend, FiRefreshCw, FiTrash2 } from 'react-icons/fi';
import { ChatMessage, AIAgent, DocumentFile } from '../types';
import { formatTimeAgo } from '../../../shared/utils/formatters';

interface DocumentChatProps {
  messages: ChatMessage[];
  selectedAgent: AIAgent | null;
  selectedDocument: DocumentFile | null;
  onSendMessage: (message: string, documentId?: string) => Promise<void>;
  onClearChat: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export const DocumentChat: React.FC<DocumentChatProps> = ({
  messages,
  selectedAgent,
  selectedDocument,
  onSendMessage,
  onClearChat,
  isLoading = false,
  disabled = false
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSending) return;

    if (!selectedAgent) {
      toast({
        title: 'No Agent Selected',
        description: 'Please select an AI agent to chat with.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsSending(true);
      await onSendMessage(inputMessage.trim(), selectedDocument?.id);
      setInputMessage('');
    } catch (error) {
      toast({
        title: 'Failed to Send Message',
        description: 'There was an error sending your message. Please try again.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getMessageAvatar = (message: ChatMessage) => {
    if (message.type === 'user') {
      return <Avatar size="sm" name="User" bg="blue.500" color="white" />;
    } else {
      const agent = selectedAgent;
      return (
        <Avatar
          size="sm"
          name={agent?.name || 'AI'}
          bg="purple.500"
          color="white"
        />
      );
    }
  };

  return (
    <VStack spacing={4} align="stretch" h="600px">
      {/* Chat Header */}
      <HStack justify="space-between" p={4} bg="gray.50" borderRadius="md">
        <VStack align="start" spacing={1}>
          <Text fontSize="lg" fontWeight="semibold">
            Document Chat
          </Text>
          <HStack spacing={2}>
            {selectedAgent && (
              <Badge colorScheme="purple" size="sm">
                {selectedAgent.icon} {selectedAgent.name}
              </Badge>
            )}
            {selectedDocument && (
              <Badge colorScheme="blue" size="sm">
                📄 {selectedDocument.name}
              </Badge>
            )}
          </HStack>
        </VStack>
        
        <HStack>
          <IconButton
            aria-label="Clear chat"
            icon={<FiTrash2 />}
            size="sm"
            variant="ghost"
            onClick={onClearChat}
            disabled={messages.length === 0}
          />
          <IconButton
            aria-label="Refresh"
            icon={<FiRefreshCw />}
            size="sm"
            variant="ghost"
            onClick={() => window.location.reload()}
          />
        </HStack>
      </HStack>

      {/* Messages Area */}
      <Box flex="1" overflowY="auto" p={4} bg="white" borderRadius="md" border="1px" borderColor="gray.200">
        {messages.length === 0 ? (
          <VStack spacing={4} justify="center" h="100%">
            <Text fontSize="xl">💬</Text>
            <Text textAlign="center" color="gray.500">
              {!selectedAgent
                ? 'Select an AI agent to start chatting'
                : 'Start a conversation about your documents'}
            </Text>
            {selectedAgent && (
              <VStack spacing={2}>
                <Text fontSize="sm" color="gray.600" textAlign="center">
                  Try asking:
                </Text>
                <VStack spacing={1}>
                  <Text fontSize="sm" color="blue.600">
                    "What are the key insights from this document?"
                  </Text>
                  <Text fontSize="sm" color="blue.600">
                    "What recommendations do you have?"
                  </Text>
                  <Text fontSize="sm" color="blue.600">
                    "Can you summarize the main points?"
                  </Text>
                </VStack>
              </VStack>
            )}
          </VStack>
        ) : (
          <VStack spacing={4} align="stretch">
            {messages.map((message) => (
              <HStack
                key={message.id}
                align="start"
                spacing={3}
                justify={message.type === 'user' ? 'flex-end' : 'flex-start'}
              >
                {message.type === 'assistant' && getMessageAvatar(message)}
                
                <Card
                  maxW="70%"
                  bg={message.type === 'user' ? 'blue.500' : 'gray.50'}
                  color={message.type === 'user' ? 'white' : 'black'}
                >
                  <CardBody p={3}>
                    <VStack align="start" spacing={2}>
                      <Text fontSize="sm" whiteSpace="pre-wrap">
                        {message.content}
                      </Text>
                      <Text
                        fontSize="xs"
                        color={message.type === 'user' ? 'blue.100' : 'gray.500'}
                      >
                        {formatTimeAgo(message.timestamp)}
                      </Text>
                    </VStack>
                  </CardBody>
                </Card>
                
                {message.type === 'user' && getMessageAvatar(message)}
              </HStack>
            ))}
            
            {(isSending || isLoading) && (
              <HStack align="start" spacing={3}>
                <Avatar size="sm" name="AI" bg="purple.500" color="white" />
                <Card bg="gray.50" maxW="70%">
                  <CardBody p={3}>
                    <HStack>
                      <Spinner size="sm" />
                      <Text fontSize="sm" color="gray.600">
                        Thinking...
                      </Text>
                    </HStack>
                  </CardBody>
                </Card>
              </HStack>
            )}
            
            <div ref={messagesEndRef} />
          </VStack>
        )}
      </Box>

      {/* Input Area */}
      <Box p={4} bg="gray.50" borderRadius="md">
        {!selectedAgent ? (
          <Alert status="warning" size="sm">
            <AlertIcon />
            <Text fontSize="sm">
              Please select an AI agent to start chatting.
            </Text>
          </Alert>
        ) : (
          <HStack spacing={3}>
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Ask ${selectedAgent.name} about your documents...`}
              disabled={disabled || isSending}
              bg="white"
              border="1px"
              borderColor="gray.300"
              _focus={{
                borderColor: 'blue.500',
                boxShadow: '0 0 0 1px blue.500'
              }}
            />
            <Button
              colorScheme="blue"
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isSending || disabled}
              isLoading={isSending}
              leftIcon={<FiSend />}
            >
              Send
            </Button>
          </HStack>
        )}
      </Box>
    </VStack>
  );
};