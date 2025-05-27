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
import onChainChatService from '../services/OnChainChatService';
import type { OnChainMessage } from '../services/OnChainChatService';
import web3StorageService from '../services/Web3StorageService';
import backendUploadService from '../services/BackendUploadService';
import AppConfig from '../config/AppConfig';

interface ChatProps {
  chatType?: 'off-chain' | 'on-chain';
}

const Chat: React.FC<ChatProps> = ({ chatType = 'on-chain' }) => {
  const { did } = useAuth();
  const navigate = useNavigate();
  
  // Estados para mensagens on-chain (existente)
  const [messages, setMessages] = useState<Message[]>([]);
  const [onChainMessages, setOnChainMessages] = useState<OnChainMessage[]>([]);
  
  // Estados para mensagens off-chain (novo)
  const [offChainMessages, setOffChainMessages] = useState<OffChainMessage[]>([]);
  const [isOffChainConnected, setIsOffChainConnected] = useState(false);
  
  // Estados comuns
  const [newMessage, setNewMessage] = useState('');
  const [recipientDID, setRecipientDID] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // Example conversation for demo purposes
  const checkUploadServer = async () => {
    try {
      const isOnline = await backendUploadService.checkHealth();
      setServerStatus(isOnline ? 'online' : 'offline');
      
      if (!isOnline && chatType === 'on-chain') {
        toast({
          title: 'Servidor de Upload Offline',
          description: 'O envio de arquivos pode não funcionar. Entre em contato com o suporte.',
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      setServerStatus('offline');
    }
  };

  const setupDemoConversation = () => {
    // Use the configured Surgical Brasil DID from AppConfig
    const surgicalBrasilDID = AppConfig.serviceProvider.did;
    
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
        content: 'This is an example encrypted message stored on Web3.Storage with cryptographic timestamping.',
        sender: did || '',
        recipient: surgicalBrasilDID,
        timestamp: new Date(Date.now() - 1800000).toISOString(),
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
        // Inicializar chat on-chain com novo serviço
        initializeOnChainChat();
        
        // Check if using MetaMask (did:eth) or Web3.Storage (did:key)
        const isMetaMaskDid = did.startsWith('did:eth:');
        console.log(`Using ${isMetaMaskDid ? 'MetaMask' : 'Web3.Storage'} authentication`);
        
        // Check upload server status
        checkUploadServer();
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
   * Inicializa o chat on-chain com criptografia controlada pela empresa
   */
  const initializeOnChainChat = async () => {
    try {
      console.log('🔒 Inicializando chat on-chain...');
      
      // Configurar recipient para Surgical Brasil
      setRecipientDID(AppConfig.serviceProvider.did);
      
      // Inicializar serviço on-chain
      const success = await onChainChatService.initialize(did!);
      
      if (success) {
        // Carregar mensagens existentes
        const existingMessages = onChainChatService.getMessages();
        setOnChainMessages(existingMessages);

        toast({
          title: 'Chat seguro conectado',
          description: 'Chat on-chain inicializado com criptografia da empresa',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error('Falha ao inicializar serviço on-chain');
      }
    } catch (error) {
      console.error('❌ Erro ao inicializar chat on-chain:', error);
      toast({
        title: 'Erro de conexão',
        description: 'Não foi possível conectar ao chat on-chain',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  /**
   * Inicializa o chat off-chain com protocolo CrypTalk
   */
  const initializeOffChainChat = async () => {
    try {
      console.log('🔄 Inicializando chat off-chain...');
      
      // Configurar recipient para Surgical Brasil
      setRecipientDID(AppConfig.serviceProvider.did);
      
      // Limpar listeners antigos antes de inicializar
      offChainChatService.disconnect();
      
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
        // Enviar mensagem on-chain com novo serviço
        const message = await onChainChatService.sendMessage(newMessage, recipientDID);
        
        if (message) {
          setOnChainMessages(prev => [...prev, message]);
          setNewMessage('');
          
          toast({
            title: 'Mensagem enviada',
            description: 'Sua mensagem foi criptografada e armazenada no Web3.Storage',
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
          
          // Simular resposta após um breve delay
          const isServiceProvider = recipientDID === AppConfig.serviceProvider.did; 
          
          if (isServiceProvider) {
            setTimeout(() => {
              const replyMessage: OnChainMessage = {
                id: `reply-${Date.now()}`,
                content: `Obrigado pela sua mensagem para ${AppConfig.serviceProvider.name}. Responderemos em breve.`,
                sender: recipientDID,
                recipient: did || '',
                timestamp: new Date().toISOString(),
                type: 'text',
                encrypted: true,
                signature: 'simulated-reply-signature',
                messageHash: 'simulated-reply-hash',
                blockchainConfirmed: true
              };
              
              setOnChainMessages(prev => [...prev, replyMessage]);
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

  /**
   * Gerencia o upload de arquivos criptografados no chat on-chain
   */
  const handleFileUpload = async (file: File) => {
    if (!file || chatType !== 'on-chain') return;

    setIsUploadingFile(true);
    setUploadProgress(0);

    try {
      console.log('📤 Iniciando upload de arquivo criptografado...');
      
      // Simular progresso de upload
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Enviar arquivo criptografado usando OnChainChatService
      const message = await onChainChatService.sendEncryptedFile(file, recipientDID);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (message) {
        setOnChainMessages(prev => [...prev, message]);
        setSelectedFile(null);
        
        toast({
          title: 'Arquivo enviado com segurança',
          description: `${file.name} foi criptografado e enviado. Apenas a Surgical Brasil pode descriptografar.`,
          status: 'success',
          duration: 4000,
          isClosable: true,
        });
      } else {
        throw new Error('Falha ao enviar arquivo');
      }
    } catch (error) {
      console.error('❌ Erro no upload do arquivo:', error);
      toast({
        title: 'Erro no upload',
        description: 'Não foi possível enviar o arquivo. Tente novamente.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsUploadingFile(false);
      setUploadProgress(0);
    }
  };

  /**
   * Renderiza uma mensagem baseado no tipo (off-chain ou on-chain)
   */
  const renderMessage = (message: OffChainMessage | OnChainMessage | Message, index: number) => {
    const isOffChain = chatType === 'off-chain';
    const offChainMsg = message as OffChainMessage;
    const onChainMsg = message as OnChainMessage;
    
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
          {/* Message content ou arquivo */}
          {!isOffChain && onChainMsg.type === 'file' ? (
            <Box p={3} bg="purple.50" borderRadius="md" border="1px solid purple.200">
              <HStack>
                <Text fontSize="lg">📎</Text>
                <VStack align="start" spacing={1}>
                  <Text fontWeight="bold" color="purple.700">
                    Arquivo Criptografado: {onChainMsg.fileName}
                  </Text>
                  <Text fontSize="sm" color="purple.600">
                    Tamanho: {onChainMsg.fileSize ? `${(onChainMsg.fileSize / 1024 / 1024).toFixed(2)} MB` : 'N/A'}
                  </Text>
                  <Badge colorScheme="purple" size="sm">
                    🔐 Apenas Surgical Brasil pode descriptografar
                  </Badge>
                </VStack>
              </HStack>
            </Box>
          ) : (
            <Text fontWeight="medium">{messageContent}</Text>
          )}
          
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
                  {isOffChain ? '⚡ Timestamp Verificado:' : '🔒 Timestamp Criptográfico:'}
                </Text>
                <Text>{new Date(messageTimestamp).toLocaleString()}</Text>
              </HStack>
              
              {isOffChain && (
                <>
                  <HStack>
                    <Text fontWeight="bold" color="purple.600">🔐 Hash:</Text>
                    <Text fontFamily="mono" fontSize="10px">
                      {offChainMsg.messageHash?.substring(0, 16) || 'N/A'}...
                    </Text>
                  </HStack>
                  <HStack>
                    <Text fontWeight="bold" color="orange.600">✍️ Assinatura:</Text>
                    <Text fontFamily="mono" fontSize="10px">
                      {offChainMsg.signature?.substring(0, 16) || 'N/A'}...
                    </Text>
                  </HStack>
                  <HStack>
                    <Text fontWeight="bold" color="gray.600">📊 Protocolo:</Text>
                    <Badge colorScheme="green" size="xs">CrypTalk Off-Chain</Badge>
                  </HStack>
                </>
              )}
              
              {!isOffChain && (
                <>
                  <HStack>
                    <Text fontWeight="bold" color="purple.600">🔐 Hash:</Text>
                    <Text fontFamily="mono" fontSize="10px">
                      {onChainMsg.messageHash?.substring(0, 16) || 'N/A'}...
                    </Text>
                  </HStack>
                  <HStack>
                    <Text fontWeight="bold" color="orange.600">✍️ Assinatura:</Text>
                    <Text fontFamily="mono" fontSize="10px">
                      {onChainMsg.signature?.substring(0, 16) || 'N/A'}...
                    </Text>
                  </HStack>
                  <HStack>
                    <Text fontWeight="bold" color="gray.600">📊 Protocolo:</Text>
                    <Badge colorScheme="blue" size="xs">CrypTalk On-Chain</Badge>
                  </HStack>
                  <HStack>
                    <Text fontWeight="bold" color="green.600">⛓️ Blockchain:</Text>
                    <Badge colorScheme={onChainMsg.blockchainConfirmed ? 'green' : 'yellow'} size="xs">
                      {onChainMsg.blockchainConfirmed ? 'Confirmado' : 'Pendente'}
                    </Badge>
                  </HStack>
                </>
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
          {chatType === 'off-chain' && (
            <Badge colorScheme={isOffChainConnected ? 'green' : 'red'} size="sm">
              {isOffChainConnected ? '🟢 CONECTADO' : '🔴 DESCONECTADO'}
            </Badge>
          )}
          {chatType === 'on-chain' && serverStatus !== 'checking' && (
            <Badge colorScheme={serverStatus === 'online' ? 'green' : 'orange'} size="sm">
              {serverStatus === 'online' ? '🟢 Upload Disponível' : '⚠️ Upload Offline'}
            </Badge>
          )}
        </HStack>
        <Text fontSize="sm" color="gray.600" ml={12}>
          {getChatSubtitle()}
        </Text>
      </VStack>
      
      <Grid templateColumns={{ base: "1fr", md: "1fr 3fr" }} gap={4} h="70vh">
        {/* Sidebar - Contacts would go here in a real app */}
        <Box borderWidth={1} borderRadius="md" p={3} bg="white" height="100%">
          <Heading size="md" mb={4}>Conversas</Heading>
          
          <VStack align="stretch" spacing={2}>
            <Box 
              p={2} 
              borderRadius="md" 
              bg={chatType === 'off-chain' ? 'blue.50' : 'green.50'}
              cursor="pointer"
            >
              <HStack>
                <Avatar size="sm" name="Surgical Brasil" bg={chatType === 'off-chain' ? 'blue.500' : 'green.500'} />
                <Box>
                  <Text fontWeight="bold">Surgical Brasil</Text>
                  <Text fontSize="xs" color="gray.500" noOfLines={1}>
                    {recipientDID?.substring(0, 20) || 'No recipient'}...
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
              <Avatar size="sm" name="Surgical Brasil" bg={chatType === 'off-chain' ? 'blue.500' : 'green.500'} />
              <Box>
                <Text fontWeight="bold">Surgical Brasil</Text>
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
            {(chatType === 'off-chain' ? offChainMessages : onChainMessages).length > 0 ? (
              (chatType === 'off-chain' ? offChainMessages : onChainMessages).map((message, index) => 
                renderMessage(message, index)
              )
            ) : (
              <Box textAlign="center" color="gray.500" mt={8}>
                <Text>
                  {chatType === 'off-chain' 
                    ? 'Nenhuma mensagem ainda. Inicie uma conversa!' 
                    : 'No messages yet. Start a conversation!'
                  }
                </Text>
              </Box>
            )}
          </VStack>

          {/* Message input */}
          <Box p={3} borderTopWidth={1}>
            <VStack spacing={2}>
              <HStack w="full">
                <InputGroup>
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={chatType === 'off-chain' ? 'Digite sua mensagem...' : 'Type your message...'}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <InputRightElement>
                    {chatType === 'on-chain' && (
                      <IconButton
                        aria-label="Attach file"
                        icon={<AttachmentIcon />}
                        size="sm"
                        variant="ghost"
                        onClick={() => fileInputRef.current?.click()}
                      />
                    )}
                  </InputRightElement>
                </InputGroup>
                <Button 
                  colorScheme={chatType === 'off-chain' ? 'blue' : 'green'} 
                  onClick={handleSendMessage}
                  minW="80px"
                >
                  {chatType === 'off-chain' ? 'Enviar' : 'Send'}
                </Button>
              </HStack>

              {/* File upload for on-chain only */}
              {chatType === 'on-chain' && (
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept=".pdf,.txt,.xls,.xlsx,.doc,.docx,.jpg,.jpeg,.png,.gif"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSelectedFile(file);
                      }
                    }}
                  />
                  
                  {selectedFile && (
                    <HStack w="full" p={2} bg="blue.50" borderRadius="md">
                      <Text fontSize="sm" flex="1">
                        📎 {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </Text>
                      <Button 
                        size="sm" 
                        colorScheme="blue" 
                        isLoading={isUploadingFile}
                        loadingText={`Enviando... ${uploadProgress}%`}
                        onClick={() => handleFileUpload(selectedFile!)}
                      >
                        Upload Seguro
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => setSelectedFile(null)}
                      >
                        ✕
                      </Button>
                    </HStack>
                  )}
                </>
              )}
            </VStack>
          </Box>
        </Flex>
      </Grid>
    </Box>
  );
};

export default Chat;