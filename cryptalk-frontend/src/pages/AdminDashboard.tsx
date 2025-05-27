import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useToast,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Divider,
  Alert,
  AlertIcon,
  Spinner,
  Flex
} from '@chakra-ui/react';
import { FiDownload, FiEye, FiLock, FiUnlock, FiFileText, FiMessageSquare, FiActivity } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import adminService from '../services/AdminService';
import AccessControlService, { ClientAccess } from '../services/AccessControlService';
import AppConfig from '../config/AppConfig';

interface AdminMessage {
  id: string;
  sender: string;
  recipient: string;
  content: string;
  timestamp: string;
  type: 'text' | 'file';
  cid?: string;
  decrypted?: boolean;
  metadata?: {
    fileName?: string;
    fileType?: string;
    fileSize?: number;
  };
}

const AdminDashboard: React.FC = () => {
  const { walletAddress } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const accessControlService = AccessControlService.getInstance();
  
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<AdminMessage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [clientAccessList, setClientAccessList] = useState<ClientAccess[]>([]);
  const [isUpdatingAccess, setIsUpdatingAccess] = useState(false);
  const [stats, setStats] = useState({
    totalMessages: 0,
    encryptedFiles: 0,
    pendingDecryption: 0,
    recentActivity: [] as any[]
  });

  // Check admin access
  useEffect(() => {
    if (!walletAddress || !adminService.isAdmin(walletAddress)) {
      toast({
        title: 'Acesso Negado',
        description: 'Área restrita para administradores',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      navigate('/dashboard');
    }
  }, [walletAddress, navigate, toast]);

  // Load messages and stats
  useEffect(() => {
    loadAdminData();
    loadClientAccessData();
  }, []);

  const loadAdminData = async () => {
    try {
      setIsLoading(true);
      
      // Load messages
      const companyMessages = await adminService.getCompanyMessages();
      setMessages(companyMessages);
      
      // Load stats
      const adminStats = await adminService.getAdminStats();
      setStats(adminStats);
      
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar dados administrativos',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadClientAccessData = async () => {
    try {
      const clients = await accessControlService.getAllClients();
      setClientAccessList(clients);
    } catch (error) {
      console.error('Error loading client access data:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar dados de controle de acesso',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleDecryptMessage = async (message: AdminMessage) => {
    try {
      setIsDecrypting(true);
      const decrypted = await adminService.decryptMessage(message);
      
      // Update message in list
      setMessages(prev => 
        prev.map(m => m.id === message.id ? decrypted : m)
      );
      
      toast({
        title: 'Mensagem Descriptografada',
        description: 'Conteúdo acessível com sucesso',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error decrypting message:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao descriptografar mensagem',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleViewFile = async (message: AdminMessage) => {
    setSelectedMessage(message);
    onOpen();
  };

  const handleDownloadFile = async () => {
    if (!selectedMessage?.cid || !selectedMessage.metadata?.fileName) return;
    
    try {
      setIsDecrypting(true);
      
      const result = await adminService.decryptFile(
        selectedMessage.cid,
        selectedMessage.metadata.fileName
      );
      
      if (result.success && result.blob) {
        // Create download link
        const url = window.URL.createObjectURL(result.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = selectedMessage.metadata.fileName.replace('.pdf', '_decrypted.txt');
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: 'Download Completo',
          description: 'Arquivo descriptografado baixado com sucesso',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        onClose();
      } else {
        throw new Error(result.error || 'Download failed');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: 'Erro no Download',
        description: 'Falha ao baixar arquivo descriptografado',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleBlockAccess = async (walletAddress: string) => {
    try {
      setIsUpdatingAccess(true);
      await accessControlService.blockAccess(walletAddress, 'Bloqueado pelo administrador');
      await loadClientAccessData();
      
      toast({
        title: 'Acesso Bloqueado',
        description: `Cliente ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)} foi bloqueado`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error blocking access:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao bloquear acesso do cliente',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsUpdatingAccess(false);
    }
  };

  const handleUnblockAccess = async (walletAddress: string) => {
    try {
      setIsUpdatingAccess(true);
      await accessControlService.unblockAccess(walletAddress, 30); // 30 dias de acesso
      await loadClientAccessData();
      
      toast({
        title: 'Acesso Liberado',
        description: `Cliente ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)} foi desbloqueado`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error unblocking access:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao desbloquear acesso do cliente',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsUpdatingAccess(false);
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const getPaymentStatusColor = (status: string): string => {
    switch (status) {
      case 'paid':
        return 'green';
      case 'pending':
        return 'orange';
      case 'overdue':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getAccessStatusColor = (hasAccess: boolean): string => {
    return hasAccess ? 'green' : 'red';
  };

  const formatDate = (date?: Date): string => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return (
      <Container maxW="container.xl" py={10}>
        <Flex justify="center" align="center" minH="50vh">
          <Spinner size="xl" color="blue.500" />
        </Flex>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={10}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Box>
          <Heading size="lg" mb={2}>
            Painel Administrativo - Surgical Brasil
          </Heading>
          <Text color="gray.600">
            Gerenciamento de mensagens e arquivos criptografados
          </Text>
        </Box>

        {/* Stats */}
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Total de Mensagens</StatLabel>
                <StatNumber>{stats.totalMessages}</StatNumber>
                <StatHelpText>
                  <HStack>
                    <FiMessageSquare />
                    <Text>Recebidas</Text>
                  </HStack>
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Arquivos Criptografados</StatLabel>
                <StatNumber>{stats.encryptedFiles}</StatNumber>
                <StatHelpText>
                  <HStack>
                    <FiFileText />
                    <Text>PDFs e Documentos</Text>
                  </HStack>
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Pendentes</StatLabel>
                <StatNumber>{stats.pendingDecryption}</StatNumber>
                <StatHelpText>
                  <HStack>
                    <FiLock />
                    <Text>Para descriptografar</Text>
                  </HStack>
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Messages Table */}
        <Card>
          <CardHeader>
            <Heading size="md">Mensagens Recebidas</Heading>
          </CardHeader>
          <CardBody>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Data/Hora</Th>
                  <Th>Remetente</Th>
                  <Th>Tipo</Th>
                  <Th>Conteúdo</Th>
                  <Th>Status</Th>
                  <Th>Ações</Th>
                </Tr>
              </Thead>
              <Tbody>
                {messages.map((message) => (
                  <Tr key={message.id}>
                    <Td>
                      {new Date(message.timestamp).toLocaleString('pt-BR')}
                    </Td>
                    <Td>
                      <Text fontSize="xs" fontFamily="mono" isTruncated maxW="150px">
                        {message.sender}
                      </Text>
                    </Td>
                    <Td>
                      <Badge colorScheme={message.type === 'file' ? 'purple' : 'blue'}>
                        {message.type === 'file' ? 'Arquivo' : 'Texto'}
                      </Badge>
                    </Td>
                    <Td>
                      {message.type === 'file' ? (
                        <VStack align="start" spacing={0}>
                          <Text fontSize="sm">{message.content}</Text>
                          <Text fontSize="xs" color="gray.500">
                            {message.metadata?.fileName} ({formatFileSize(message.metadata?.fileSize)})
                          </Text>
                        </VStack>
                      ) : (
                        <Text fontSize="sm" isTruncated maxW="300px">
                          {message.decrypted ? message.content : '🔒 [Mensagem Criptografada]'}
                        </Text>
                      )}
                    </Td>
                    <Td>
                      <Badge colorScheme={message.decrypted ? 'green' : 'orange'}>
                        {message.decrypted ? 'Descriptografado' : 'Criptografado'}
                      </Badge>
                    </Td>
                    <Td>
                      <HStack spacing={2}>
                        {message.type === 'text' && !message.decrypted && (
                          <IconButton
                            aria-label="Descriptografar"
                            icon={<FiUnlock />}
                            size="sm"
                            colorScheme="blue"
                            onClick={() => handleDecryptMessage(message)}
                            isLoading={isDecrypting}
                          />
                        )}
                        {message.type === 'file' && (
                          <IconButton
                            aria-label="Visualizar arquivo"
                            icon={<FiEye />}
                            size="sm"
                            colorScheme="purple"
                            onClick={() => handleViewFile(message)}
                          />
                        )}
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardBody>
        </Card>

        {/* Access Control Section */}
        <Card>
          <CardHeader>
            <Heading size="md">Controle de Acesso - Chat On-Chain</Heading>
          </CardHeader>
          <CardBody>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Carteira do Cliente</Th>
                  <Th>Status Pagamento</Th>
                  <Th>Status Acesso</Th>
                  <Th>Último Pagamento</Th>
                  <Th>Data Expiração</Th>
                  <Th>Ações</Th>
                </Tr>
              </Thead>
              <Tbody>
                {clientAccessList.map((client) => (
                  <Tr key={client.walletAddress}>
                    <Td>
                      <Text fontSize="xs" fontFamily="mono" isTruncated maxW="150px">
                        {client.walletAddress}
                      </Text>
                    </Td>
                    <Td>
                      <Badge colorScheme={getPaymentStatusColor(client.paymentStatus)}>
                        {client.paymentStatus === 'paid' && 'Pago'}
                        {client.paymentStatus === 'pending' && 'Pendente'}
                        {client.paymentStatus === 'overdue' && 'Em Atraso'}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge colorScheme={getAccessStatusColor(client.hasOnChainAccess)}>
                        {client.hasOnChainAccess ? 'Ativo' : 'Bloqueado'}
                      </Badge>
                    </Td>
                    <Td>{formatDate(client.lastPaymentDate)}</Td>
                    <Td>{formatDate(client.expiryDate)}</Td>
                    <Td>
                      {client.hasOnChainAccess ? (
                        <Button
                          size="sm"
                          colorScheme="red"
                          leftIcon={<FiLock />}
                          onClick={() => handleBlockAccess(client.walletAddress)}
                          isLoading={isUpdatingAccess}
                        >
                          Bloquear
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          colorScheme="green"
                          leftIcon={<FiUnlock />}
                          onClick={() => handleUnblockAccess(client.walletAddress)}
                          isLoading={isUpdatingAccess}
                        >
                          Desbloquear
                        </Button>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardBody>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <HStack>
              <FiActivity />
              <Heading size="md">Atividade Recente</Heading>
            </HStack>
          </CardHeader>
          <CardBody>
            <VStack align="stretch" spacing={3}>
              {stats.recentActivity.map((activity, index) => (
                <HStack key={index} justify="space-between">
                  <HStack>
                    <Badge colorScheme="blue">{activity.type}</Badge>
                    <Text fontSize="sm">{activity.description}</Text>
                  </HStack>
                  <Text fontSize="xs" color="gray.500">
                    {new Date(activity.timestamp).toLocaleString('pt-BR')}
                  </Text>
                </HStack>
              ))}
            </VStack>
          </CardBody>
        </Card>
      </VStack>

      {/* File View Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Detalhes do Arquivo Criptografado</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedMessage && (
              <VStack align="stretch" spacing={4}>
                <Alert status="info">
                  <AlertIcon />
                  Este arquivo está criptografado e só pode ser acessado pela Surgical Brasil.
                </Alert>
                
                <Box>
                  <Text fontWeight="bold">Nome do Arquivo:</Text>
                  <Text>{selectedMessage.metadata?.fileName}</Text>
                </Box>
                
                <Box>
                  <Text fontWeight="bold">Tamanho:</Text>
                  <Text>{formatFileSize(selectedMessage.metadata?.fileSize)}</Text>
                </Box>
                
                <Box>
                  <Text fontWeight="bold">CID (Web3Storage):</Text>
                  <Text fontSize="xs" fontFamily="mono">{selectedMessage.cid}</Text>
                </Box>
                
                <Box>
                  <Text fontWeight="bold">Remetente:</Text>
                  <Text fontSize="xs" fontFamily="mono">{selectedMessage.sender}</Text>
                </Box>
                
                <Box>
                  <Text fontWeight="bold">Data de Envio:</Text>
                  <Text>{new Date(selectedMessage.timestamp).toLocaleString('pt-BR')}</Text>
                </Box>
                
                <Divider />
                
                <Alert status="warning">
                  <AlertIcon />
                  <Text fontSize="sm">
                    Ao baixar, o arquivo será descriptografado usando a chave privada da empresa.
                  </Text>
                </Alert>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              colorScheme="blue" 
              leftIcon={<FiDownload />}
              onClick={handleDownloadFile}
              isLoading={isDecrypting}
              loadingText="Descriptografando..."
            >
              Baixar Descriptografado
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
};

export default AdminDashboard;