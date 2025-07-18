import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Select,
  Progress,
  useToast,
  Divider,
  IconButton,
  Badge,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Textarea,
  Input,
  FormControl,
  FormLabel,
  List,
  ListItem,
  ListIcon,
  Spinner,
  CloseButton,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
} from '@chakra-ui/react';
import { 
  FiUpload, 
  FiDownload, 
  FiTrash2, 
  FiFileText, 
  FiMessageCircle,
  FiSend,
  FiFile,
  FiCheckCircle,
  FiAlertCircle,
  FiClock
} from 'react-icons/fi';

interface FileInfo {
  name: string;
  size: number;
  modified: string;
  path: string;
}

interface ChatMessage {
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

const DocumentAnalysis: React.FC = () => {
  const [clientId, setClientId] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Configuração da API
  const API_BASE = 'http://localhost:3000/api';
  const WS_URL = 'ws://localhost:8080';

  // Efeito para scroll automático das mensagens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Inicializar cliente e WebSocket
  useEffect(() => {
    initializeClient();
    return () => {
      if (wsConnection) {
        wsConnection.close();
      }
    };
  }, []);

  const initializeClient = async () => {
    try {
      const response = await fetch(`${API_BASE}/client/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setClientId(data.clientId);
        connectWebSocket(data.clientId);
        loadFiles(data.clientId);
        
        addMessage('system', 'Sessão iniciada. Você pode fazer upload de documentos para análise.');
      } else {
        throw new Error(data.error || 'Erro ao criar sessão');
      }
    } catch (error) {
      console.error('Erro ao inicializar cliente:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível inicializar a sessão',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const connectWebSocket = (clientId: string) => {
    setConnectionStatus('connecting');
    
    const ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
      setConnectionStatus('connected');
      ws.send(JSON.stringify({ type: 'register', clientId }));
      addMessage('system', 'Conectado ao sistema de análise em tempo real.');
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'analysis_started':
            setAnalyzing(true);
            setProgress(10);
            addMessage('system', 'Análise iniciada...');
            break;
            
          case 'analysis_chunk':
            setProgress(prev => Math.min(prev + 10, 90));
            addMessage('assistant', data.content);
            break;
            
          case 'analysis_complete':
            setAnalyzing(false);
            setProgress(100);
            addMessage('system', 'Análise concluída com sucesso!');
            setTimeout(() => setProgress(0), 2000);
            break;
            
          case 'analysis_error':
            setAnalyzing(false);
            setProgress(0);
            addMessage('system', `Erro na análise: ${data.error}`);
            break;
        }
      } catch (error) {
        console.error('Erro ao processar mensagem WebSocket:', error);
      }
    };
    
    ws.onclose = () => {
      setConnectionStatus('disconnected');
      addMessage('system', 'Conexão perdida. Tentando reconectar...');
      
      // Tentar reconectar após 3 segundos
      setTimeout(() => {
        if (clientId) {
          connectWebSocket(clientId);
        }
      }, 3000);
    };
    
    ws.onerror = (error) => {
      console.error('Erro WebSocket:', error);
      setConnectionStatus('disconnected');
    };
    
    setWsConnection(ws);
  };

  const addMessage = (type: ChatMessage['type'], content: string) => {
    setMessages(prev => [...prev, {
      type,
      content,
      timestamp: new Date()
    }]);
  };

  const loadFiles = async (clientId: string) => {
    try {
      const response = await fetch(`${API_BASE}/client/${clientId}/files`);
      const data = await response.json();
      
      if (response.ok) {
        setFiles(data.files);
      }
    } catch (error) {
      console.error('Erro ao carregar arquivos:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      onOpen();
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentType || !clientId) {
      toast({
        title: 'Erro',
        description: 'Selecione um arquivo e o tipo de documento',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setUploading(true);
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('clientId', clientId);
    formData.append('documentType', documentType);

    try {
      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Sucesso',
          description: 'Arquivo enviado com sucesso',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });

        addMessage('user', `Arquivo enviado: ${selectedFile.name} (${documentType})`);
        loadFiles(clientId);
        
        // Iniciar análise automaticamente
        startAnalysis(data.filePath, documentType);
        
        setSelectedFile(null);
        setDocumentType('');
        onClose();
      } else {
        throw new Error(data.error || 'Erro no upload');
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao enviar arquivo',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setUploading(false);
    }
  };

  const startAnalysis = async (filePath: string, docType: string) => {
    try {
      const response = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId,
          filePath,
          documentType: docType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao iniciar análise');
      }
    } catch (error) {
      console.error('Erro ao iniciar análise:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao iniciar análise',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleDownload = async (fileName: string) => {
    try {
      const response = await fetch(`${API_BASE}/download/${clientId}/${fileName}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: 'Sucesso',
          description: 'Arquivo baixado com sucesso',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error('Erro ao baixar arquivo');
      }
    } catch (error) {
      console.error('Erro no download:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao baixar arquivo',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    addMessage('user', newMessage);
    setNewMessage('');
    
    // Aqui você pode implementar interação adicional com Claude
    // Por exemplo, perguntas sobre o documento analisado
  };

  const cleanupSession = async () => {
    try {
      const response = await fetch(`${API_BASE}/client/${clientId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        toast({
          title: 'Sessão encerrada',
          description: 'Todos os arquivos foram removidos',
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
        
        setFiles([]);
        setMessages([]);
        initializeClient();
      }
    } catch (error) {
      console.error('Erro ao limpar sessão:', error);
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'green';
      case 'connecting': return 'yellow';
      case 'disconnected': return 'red';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Conectado';
      case 'connecting': return 'Conectando...';
      case 'disconnected': return 'Desconectado';
    }
  };

  return (
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between" align="center">
          <Heading size="lg">Análise de Documentos</Heading>
          <HStack>
            <Badge colorScheme={getConnectionStatusColor()}>
              {getConnectionStatusText()}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={cleanupSession}
              leftIcon={<FiTrash2 />}
            >
              Limpar Sessão
            </Button>
          </HStack>
        </HStack>

        {/* Upload Area */}
        <Card>
          <CardHeader>
            <Heading size="md">Upload de Documento</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4}>
              <Button
                leftIcon={<FiUpload />}
                onClick={() => fileInputRef.current?.click()}
                isLoading={uploading}
                size="lg"
                colorScheme="blue"
              >
                Selecionar Arquivo
              </Button>
              <Input
                ref={fileInputRef}
                type="file"
                display="none"
                accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx"
                onChange={handleFileSelect}
              />
              <Text fontSize="sm" color="gray.600">
                Formatos suportados: PDF, DOC, DOCX, TXT, PPT, PPTX, XLS, XLSX
              </Text>
            </VStack>
          </CardBody>
        </Card>

        {/* Progress Bar */}
        {analyzing && (
          <Card>
            <CardBody>
              <VStack>
                <Text>Analisando documento...</Text>
                <Progress value={progress} size="lg" colorScheme="blue" width="100%" />
                <Text fontSize="sm" color="gray.600">{progress}%</Text>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Files List */}
        {files.length > 0 && (
          <Card>
            <CardHeader>
              <Heading size="md">Arquivos na Sessão</Heading>
            </CardHeader>
            <CardBody>
              <List spacing={2}>
                {files.map((file, index) => (
                  <ListItem key={index}>
                    <HStack justify="space-between">
                      <HStack>
                        <ListIcon as={FiFileText} color="blue.500" />
                        <Text>{file.name}</Text>
                        <Text fontSize="sm" color="gray.600">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </Text>
                      </HStack>
                      <IconButton
                        aria-label="Download"
                        icon={<FiDownload />}
                        size="sm"
                        onClick={() => handleDownload(file.name)}
                      />
                    </HStack>
                  </ListItem>
                ))}
              </List>
            </CardBody>
          </Card>
        )}

        {/* Chat Interface */}
        <Card>
          <CardHeader>
            <Heading size="md">Chat da Análise</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              {/* Messages */}
              <Box 
                height="400px" 
                overflowY="auto" 
                border="1px solid" 
                borderColor="gray.200" 
                borderRadius="md" 
                p={4}
              >
                {messages.map((message, index) => (
                  <Box key={index} mb={3}>
                    <HStack align="start" spacing={3}>
                      {message.type === 'user' && <FiMessageCircle color="blue" />}
                      {message.type === 'assistant' && <FiCheckCircle color="green" />}
                      {message.type === 'system' && <FiAlertCircle color="orange" />}
                      <VStack align="start" spacing={1} flex={1}>
                        <Text fontSize="sm" color="gray.600">
                          {message.timestamp.toLocaleTimeString()}
                        </Text>
                        <Text whiteSpace="pre-wrap">{message.content}</Text>
                      </VStack>
                    </HStack>
                  </Box>
                ))}
                <div ref={messagesEndRef} />
              </Box>

              {/* Message Input */}
              <HStack>
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Digite uma mensagem..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <IconButton
                  aria-label="Enviar"
                  icon={<FiSend />}
                  onClick={handleSendMessage}
                  isDisabled={!newMessage.trim()}
                />
              </HStack>
            </VStack>
          </CardBody>
        </Card>
      </VStack>

      {/* Upload Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Configurar Upload</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Text>Arquivo selecionado: {selectedFile?.name}</Text>
              
              <FormControl>
                <FormLabel>Tipo de Documento</FormLabel>
                <Select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  placeholder="Selecione o tipo"
                >
                  <option value="pitch-deck">Pitch Deck</option>
                  <option value="patente">Patente</option>
                  <option value="projecao">Projeção Financeira</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={handleUpload}
              isLoading={uploading}
              isDisabled={!documentType}
            >
              Enviar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default DocumentAnalysis;