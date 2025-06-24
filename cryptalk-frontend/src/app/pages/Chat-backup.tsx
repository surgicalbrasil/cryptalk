import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Grid, 
  Flex, 
  Text, 
  Input, 
  Button, 
  VStack, 
  HStack, 
  Avatar, 
  Divider,
  Heading,
  useToast,
  InputGroup,
  InputRightElement,
  Badge,
  IconButton
} from '@chakra-ui/react';
import { ArrowBackIcon, AttachmentIcon } from '@chakra-ui/icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import messagingService from '../services/MessagingService';
import type { Message } from '../services/MessagingService';
import offChainChatService from '../services/OffChainChatService';
import type { OffChainMessage } from '../services/OffChainChatService';
import web3StorageService from '../services/Web3StorageService';
import AppConfig from '../config/AppConfig';

interface ChatProps {
  chatType?: 'off-chain' | 'on-chain';
}

const Chat: React.FC<ChatProps> = ({ chatType = 'on-chain' }) => {
  const { did } = useAuth();
  const navigate = useNavigate();
  
  // Estados para mensagens on-chain (existente)
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Estados para mensagens off-chain (novo)
  const [offChainMessages, setOffChainMessages] = useState<OffChainMessage[]>([]);
  const [isOffChainConnected, setIsOffChainConnected] = useState(false);
  
  // Estados comuns
  const [newMessage, setNewMessage] = useState('');
  const [recipientDID, setRecipientDID] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();  // Example conversation for demo purposes
  const setupDemoConversation = () => {
    // Use the configured Surgical Brasil DID from AppConfig
    const surgicalBrasilDID = AppConfig.serviceProvider.did;
    const surgicalBrasilAddress = AppConfig.serviceProvider.walletAddress;
    
    // Set the recipient to Surgical Brasil
    setRecipientDID(surgicalBrasilDID);
    
    // Add sample messages
    const exampleMessages: Message[] = [
      {
        content: `Welcome to CrypTalk! You can securely message with ${AppConfig.serviceProvider.name}.`,
        sender: surgicalBrasilDID,
        recipient: did || '',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        type: 'text'
      },
      {
        content: `Send messages to Surgical Brasil at wallet address: ${surgicalBrasilAddress}`,
        sender: surgicalBrasilDID,
        recipient: did || '',
        timestamp: new Date(Date.now() - 3000000).toISOString(),
        type: 'text'
      }
    ];
    
    setMessages(exampleMessages);
  };
  useEffect(() => {
    if (did) {
      if (chatType === 'off-chain') {
        // Inicializar chat off-chain
        initializeOffChainChat();
      } else {
        // Configurar chat on-chain (existente)
        setupDemoConversation();
        
        // Check if using MetaMask (did:eth) or Web3.Storage (did:key)
        const isMetaMaskDid = did.startsWith('did:eth:');
        console.log(`Using ${isMetaMaskDid ? 'MetaMask' : 'Web3.Storage'} authentication`);
      }
    }

    // Cleanup ao desmontar componente
    return () => {
      if (chatType === 'off-chain') {
        offChainChatService.disconnect();
      }
    };
  }, [did, chatType]);

  /**
   * Inicializa o chat off-chain com protocolo CrypTalk
   */
  const initializeOffChainChat = async () => {
    try {
      console.log('🔄 Inicializando chat off-chain...');
      
      // Configurar recipient para Surgical Brasil
      setRecipientDID(AppConfig.serviceProvider.did);
      
      // Inicializar serviço
      const success = await offChainChatService.initialize(did!);
      
      if (success) {
        // Configurar listeners
        offChainChatService.onMessage((message: OffChainMessage) => {
          setOffChainMessages(prev => [...prev, message]);
        });

        offChainChatService.onConnectionChange((connected: boolean) => {
          setIsOffChainConnected(connected);
        });

        // Carregar mensagens existentes
        const existingMessages = offChainChatService.getMessages();
        setOffChainMessages(existingMessages);

        toast({
          title: 'Chat conectado',
          description: 'Chat off-chain inicializado com segurança',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error('Falha ao inicializar serviço');
      }
    } catch (error) {
      console.error('❌ Erro ao inicializar chat off-chain:', error);
      toast({
        title: 'Erro de conexão',
        description: 'Não foi possível conectar ao chat off-chain',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      toast({
        title: 'Erro',
        description: 'Digite uma mensagem',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      if (chatType === 'off-chain') {
        // Enviar mensagem off-chain
        await offChainChatService.sendMessage(newMessage, recipientDID);
        setNewMessage('');
        
        toast({
          title: 'Mensagem enviada',
          description: 'Mensagem enviada com timestamp seguro',
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
      } else {
        // Enviar mensagem on-chain (existente)
        const message = await messagingService.sendMessage(newMessage, recipientDID);
        
        if (message) {
          setMessages(prev => [...prev, message]);
          setNewMessage('');
          
          toast({
            title: 'Message sent',
            description: 'Your message has been encrypted and stored on Web3.Storage',
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
          
          // Simulate a reply after a short delay (for demo purposes)
          // Check for any recipient DID belonging to Surgical Brasil
          const isServiceProvider = recipientDID === AppConfig.serviceProvider.did; 
          
          if (isServiceProvider) {
            setTimeout(() => {
              const replyMessage: Message = {
                content: `Thank you for your message to ${AppConfig.serviceProvider.name}. We'll respond shortly.`,
                sender: recipientDID,
                recipient: did || '',
                timestamp: new Date().toISOString(),
                type: 'text'
              };
              
              setMessages(prev => [...prev, replyMessage]);
            }, 2000);
          }
        } else {
          throw new Error('Failed to send message');
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Check your connection and try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      
      // Allowed file types
      const allowedTypes = [
        'application/pdf',
        'text/plain',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/gif'
      ];
      
      const allowedExtensions = ['.pdf', '.txt', '.xls', '.xlsx', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      // Check file type
      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
        toast({
          title: 'Invalid file type',
          description: 'Allowed: PDF, TXT, Excel, Word, Images (JPG, PNG, GIF)',
          status: 'error',
          duration: 4000,
          isClosable: true,
        });
        return;
      }
      
      // Check file size (max 100MB)
      const maxSize = AppConfig.storage.maxFileSize;
      if (file.size > maxSize) {
        toast({
          title: 'File too large',
          description: `Maximum file size is ${Math.floor(maxSize / (1024 * 1024))}MB`,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      
      // Get file type for display
      let fileTypeDisplay = 'File';
      if (file.type.includes('pdf')) fileTypeDisplay = 'PDF';
      else if (file.type.includes('text')) fileTypeDisplay = 'Text';
      else if (file.type.includes('excel') || file.type.includes('spreadsheet')) fileTypeDisplay = 'Excel';
      else if (file.type.includes('word')) fileTypeDisplay = 'Word';
      else if (file.type.includes('image')) fileTypeDisplay = 'Image';
      
      setSelectedFile(file);
      toast({
        title: `${fileTypeDisplay} selected`,
        description: `${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB) ready to send`,
        status: 'info',
        duration: 2000,
        isClosable: true,
      });
    }
  };

  // Handle file upload
  const handleFileUpload = async () => {
    if (!selectedFile || !recipientDID) {
      toast({
        title: 'Error',
        description: 'Please select a file and recipient',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsUploadingFile(true);
      
      // Upload the file (any type)
      const result = await web3StorageService.uploadEncryptedFile(selectedFile, recipientDID);
      
      if (result.success && result.cid) {
        // Get file type for message
        let fileTypeLabel = 'File';
        if (selectedFile.type.includes('pdf')) fileTypeLabel = 'PDF';
        else if (selectedFile.type.includes('text')) fileTypeLabel = 'Text';
        else if (selectedFile.type.includes('excel') || selectedFile.type.includes('spreadsheet')) fileTypeLabel = 'Excel';
        else if (selectedFile.type.includes('word')) fileTypeLabel = 'Word Document';
        else if (selectedFile.type.includes('image')) fileTypeLabel = 'Image';
        
        // Create a file message
        const fileMessage: Message = {
          content: `${fileTypeLabel}: ${selectedFile.name}`,
          sender: did || '',
          recipient: recipientDID,
          timestamp: new Date().toISOString(),
          type: 'file',
          cid: result.cid
        };
        
        setMessages(prev => [...prev, fileMessage]);
        
        // Clear file selection
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        toast({
          title: 'File sent',
          description: 'Your PDF has been encrypted and sent successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error(result.error || 'Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload file',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsUploadingFile(false);
    }
  };

  /**
   * Renderiza uma mensagem baseado no tipo (off-chain ou on-chain)
   */
  const renderMessage = (message: OffChainMessage | Message, index: number) => {
    const isOffChain = chatType === 'off-chain';
    const offChainMsg = message as OffChainMessage;
    const onChainMsg = message as Message;
    
    const messageContent = isOffChain ? offChainMsg.content : onChainMsg.content;
    const messageSender = isOffChain ? offChainMsg.sender : onChainMsg.sender;
    const messageTimestamp = isOffChain ? offChainMsg.timestamp : onChainMsg.timestamp;
    const isFromUser = messageSender === did;

    return (
      <Box 
        key={isOffChain ? offChainMsg.id : index}
        alignSelf={isFromUser ? 'flex-end' : 'flex-start'}
        bg={isFromUser ? (isOffChain ? 'blue.100' : 'blue.100') : (isOffChain ? 'green.50' : 'gray.100')}
        py={3}
        px={4}
        maxW="70%"
        borderRadius="lg"
        boxShadow="sm"
        border={isOffChain ? '1px solid' : 'none'}
        borderColor={isOffChain ? (isFromUser ? 'blue.200' : 'green.200') : 'transparent'}
      >
        <VStack align="stretch" spacing={2}>
          {/* Message content */}
          <Text fontWeight="medium">{messageContent}</Text>
          
          {/* Security info baseado no tipo */}
          <Box 
            bg={isFromUser ? (isOffChain ? 'blue.50' : 'blue.50') : (isOffChain ? 'green.25' : 'gray.50')} 
            p={2} 
            borderRadius="md"
            fontSize="xs"
          >
            <VStack align="start" spacing={1}>
              <HStack>
                <Text fontWeight="bold" color={isOffChain ? 'green.600' : 'blue.600'}>
                  {isOffChain ? '⚡ Timestamp Verificado:' : '🔒 Secured Timestamp:'}
                </Text>
                <Text>{new Date(messageTimestamp).toLocaleString()}</Text>
              </HStack>
              
              {isOffChain && (
                <>
                  <HStack>
                    <Text fontWeight="bold" color="purple.600">🔐 Hash:</Text>
                    <Text fontFamily="mono" fontSize="10px">
                      {offChainMsg.messageHash.substring(0, 16)}...
                    </Text>
                  </HStack>
                  <HStack>
                    <Text fontWeight="bold" color="orange.600">✍️ Assinatura:</Text>
                    <Text fontFamily="mono" fontSize="10px">
                      {offChainMsg.signature.substring(0, 16)}...
                    </Text>
                  </HStack>
                  <HStack>
                    <Text fontWeight="bold" color="gray.600">📊 Protocolo:</Text>
                    <Badge colorScheme="green" size="xs">CrypTalk Off-Chain</Badge>
                  </HStack>
                </>
              )}
              
              {!isOffChain && (
                <HStack>
                  <Text fontWeight="bold" color="gray.600">📊 Protocolo:</Text>
                  <Badge colorScheme="blue" size="xs">CrypTalk On-Chain</Badge>
                </HStack>
              )}
            </VStack>
          </Box>
          
          {/* Sender info */}
          <Text fontSize="xs" color="gray.500" textAlign={isFromUser ? 'right' : 'left'}>
            {isFromUser ? 'Você' : (isOffChain ? 'Surgical Brasil' : 'Destinatário')}
          </Text>
        </VStack>
      </Box>
    );
  };

  const getChatTitle = () => {
    if (chatType === 'off-chain') {
      return '💬 Chat Geral - Surgical Brasil';
    }
    return '🔒 Chat Médico - Surgical Brasil';
  };

  const getChatSubtitle = () => {
    if (chatType === 'off-chain') {
      return 'Dúvidas gerais, agendamentos e informações • Resposta instantânea • Sem custos';
    }
    return 'Exames, pagamentos e documentos confidenciais • Criptografado • Verificado na blockchain';
  };

  return (
    <Box maxW="1200px" mx="auto" p={5}>
      <VStack align="start" mb={4} spacing={1}>
        <HStack align="center" spacing={3} w="full">
          <IconButton
            aria-label="Voltar ao Dashboard"
            icon={<ArrowBackIcon />}
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            size="lg"
          />
          <Heading size="lg" color={chatType === 'off-chain' ? 'blue.600' : 'green.600'}>
            {getChatTitle()}
          </Heading>
          <Badge colorScheme={chatType === 'off-chain' ? 'blue' : 'green'} size="lg">
            {chatType === 'off-chain' ? 'OFF-CHAIN' : 'ON-CHAIN'}
          </Badge>
        </HStack>
        <Text fontSize="sm" color="gray.600" ml={12}>
          {getChatSubtitle()}
        </Text>
      </VStack>
      
      <Grid templateColumns={{ base: "1fr", md: "1fr 3fr" }} gap={4} h="70vh">
        {/* Sidebar - Contacts would go here in a real app */}
        <Box borderWidth={1} borderRadius="md" p={3} bg="white" height="100%">
          <Heading size="md" mb={4}>Conversations</Heading>
          
          <VStack align="stretch" spacing={2}>
            <Box 
              p={2} 
              borderRadius="md" 
              bg="blue.50" 
              cursor="pointer"
            >
              <HStack>
                <Avatar size="sm" name="Demo User" bg="blue.500" />
                <Box>
                  <Text fontWeight="bold">Demo User</Text>
                  <Text fontSize="xs" color="gray.500" noOfLines={1}>
                    {recipientDID.substring(0, 20)}...
                  </Text>
                </Box>
              </HStack>
            </Box>
          </VStack>
        </Box>

        {/* Chat area */}
        <Flex 
          direction="column" 
          borderWidth={1} 
          borderRadius="md" 
          height="100%" 
          overflow="hidden"
          bg="white"
        >
          {/* Recipient header */}
          <Box p={3} borderBottomWidth={1} bg="gray.50">
            <HStack>
              <Avatar size="sm" name="Recipient" bg="green.500" />
              <Box>
                <Text fontWeight="bold">Demo User</Text>
                <Text fontSize="xs" color="gray.500" noOfLines={1}>
                  {recipientDID || 'Select a recipient'}
                </Text>
              </Box>
            </HStack>
          </Box>
          
          {/* Messages */}
          <VStack 
            flex="1" 
            p={4} 
            spacing={4} 
            align="stretch" 
            overflowY="auto"
            sx={{
              '&::-webkit-scrollbar': {
                width: '4px',
              },
              '&::-webkit-scrollbar-track': {
                width: '6px',
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'gray.300',
                borderRadius: '24px',
              },
            }}
          >
            {(chatType === 'off-chain' ? offChainMessages : messages).length > 0 ? (
              (chatType === 'off-chain' ? offChainMessages : messages).map((message, index) => 
                renderMessage(message, index)
              )
            ) : (
              <Text color="gray.500" textAlign="center" mt={8}>
                No messages yet. Start a conversation!
              </Text>
            )}
          </VStack>
          
          {/* Input area */}
          <Box p={3} borderTopWidth={1}>
            {!recipientDID && (
              <Input
                placeholder="Enter recipient DID"
                value={recipientDID}
                onChange={(e) => setRecipientDID(e.target.value)}
                mb={2}
              />
            )}
            
            {/* File selection area */}
            {selectedFile && (
              <Box mb={2} p={2} bg="blue.50" borderRadius="md">
                <HStack justify="space-between">
                  <Text fontSize="sm">Selected: {selectedFile.name}</Text>
                  <Button 
                    size="xs" 
                    variant="ghost" 
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    Remove
                  </Button>
                </HStack>
              </Box>
            )}
            
            <HStack spacing={2}>
              <InputGroup size="md" flex="1">
                <Input
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  pr="4.5rem"
                  onKeyPress={(e) => e.key === 'Enter' && !selectedFile && handleSendMessage()}
                />
                <InputRightElement width="4.5rem">
                  <Button 
                    h="1.75rem" 
                    size="sm" 
                    colorScheme="blue" 
                    onClick={handleSendMessage}
                    isDisabled={!newMessage.trim() || !!selectedFile}
                  >
                    Send
                  </Button>
                </InputRightElement>
              </InputGroup>
              
              {/* File input (hidden) */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.xls,.xlsx,.doc,.docx,.jpg,.jpeg,.png,.gif"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              
              {/* File attachment button */}
              <Button
                size="md"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                isDisabled={isUploadingFile}
                leftIcon={<AttachmentIcon />}
                title="Upload PDF, TXT, Excel, Word, or Image files"
              >
                File
              </Button>
              
              {/* Send file button */}
              {selectedFile && (
                <Button
                  size="md"
                  colorScheme="green"
                  onClick={handleFileUpload}
                  isLoading={isUploadingFile}
                  loadingText="Sending..."
                >
                  Send File
                </Button>
              )}
            </HStack>
          </Box>
        </Flex>
      </Grid>
    </Box>
  );
};

export default Chat;
