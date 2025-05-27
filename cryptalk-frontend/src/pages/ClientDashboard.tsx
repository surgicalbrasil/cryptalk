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
  Badge,
  Icon,
  Divider,
  useColorModeValue,
  Avatar,
  Flex,
  SimpleGrid
} from '@chakra-ui/react';
import { FiMessageCircle, FiShield, FiClock, FiDollarSign } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

/**
 * Dashboard principal do cliente com dois tipos de chat
 * Segue o protocolo CrypTalk SDK para comunicação segura
 */
const ClientDashboard: React.FC = () => {
  const { did, isAuthenticated, walletAddress } = useAuth();
  const navigate = useNavigate();
  const [clientStats, setClientStats] = useState({
    offChainMessages: 0,
    onChainMessages: 0,
    pendingPayments: 0,
    documentsShared: 0
  });

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Simular carregamento de estatísticas do cliente
    // TODO: Integrar com CrypTalk SDK
    setClientStats({
      offChainMessages: 12,
      onChainMessages: 3,
      pendingPayments: 1,
      documentsShared: 5
    });
  }, [isAuthenticated, navigate]);


  const truncateDID = (did: string) => {
    if (!did) return '';
    return `${did.substring(0, 12)}...${did.substring(did.length - 8)}`;
  };

  return (
    <Box bg={bgColor} minH="100vh" py={8}>
      <Container maxW="4xl">
        <VStack spacing={8} align="stretch">
          
          {/* Header */}
          <Card bg={cardBg} shadow="sm">
            <CardBody>
              <Flex justify="space-between" align="center">
                <HStack spacing={4}>
                  <Avatar size="lg" name="Cliente" />
                  <VStack align="start" spacing={1}>
                    <Heading size="lg" color="teal.600">
                      CrypTalk
                    </Heading>
                    <Text fontSize="sm" color="gray.600">
                      Cliente: {truncateDID(did || '')}
                    </Text>
                    <Badge colorScheme="green" size="sm">
                      Conectado via MetaMask
                    </Badge>
                  </VStack>
                </HStack>
                <VStack align="end" spacing={1}>
                  <Text fontSize="xl" fontWeight="bold" color="teal.600">
                    Surgical Brasil
                  </Text>
                  <Badge colorScheme="blue" size="sm">
                    Profissional Verificado
                  </Badge>
                </VStack>
              </Flex>
            </CardBody>
          </Card>

          {/* Estatísticas Rápidas */}
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
            <Card bg={cardBg} size="sm">
              <CardBody textAlign="center">
                <Icon as={FiMessageCircle} w={6} h={6} color="blue.500" mb={2} />
                <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                  {clientStats.offChainMessages}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Mensagens Gerais
                </Text>
              </CardBody>
            </Card>

            <Card bg={cardBg} size="sm">
              <CardBody textAlign="center">
                <Icon as={FiShield} w={6} h={6} color="green.500" mb={2} />
                <Text fontSize="2xl" fontWeight="bold" color="green.500">
                  {clientStats.onChainMessages}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Docs Seguros
                </Text>
              </CardBody>
            </Card>

            <Card bg={cardBg} size="sm">
              <CardBody textAlign="center">
                <Icon as={FiDollarSign} w={6} h={6} color="orange.500" mb={2} />
                <Text fontSize="2xl" fontWeight="bold" color="orange.500">
                  {clientStats.pendingPayments}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Pagamento Pendente
                </Text>
              </CardBody>
            </Card>

            <Card bg={cardBg} size="sm">
              <CardBody textAlign="center">
                <Icon as={FiClock} w={6} h={6} color="purple.500" mb={2} />
                <Text fontSize="2xl" fontWeight="bold" color="purple.500">
                  {clientStats.documentsShared}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Docs Compartilhados
                </Text>
              </CardBody>
            </Card>
          </SimpleGrid>

          {/* Resumo de Atividades */}
          <VStack spacing={4} align="stretch">
            <Heading size="md" color="gray.700">
              Resumo de Atividades
            </Heading>
            
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <Card bg={cardBg} size="sm">
                <CardBody>
                  <VStack align="start" spacing={2}>
                    <HStack>
                      <Icon as={FiMessageCircle} w={5} h={5} color="blue.500" />
                      <Text fontWeight="bold" color="gray.700">Chat Geral</Text>
                    </HStack>
                    <Text fontSize="sm" color="gray.600">
                      {clientStats.offChainMessages} mensagens trocadas
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      Última mensagem: hoje às 14:30
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
              
              <Card bg={cardBg} size="sm">
                <CardBody>
                  <VStack align="start" spacing={2}>
                    <HStack>
                      <Icon as={FiShield} w={5} h={5} color="green.500" />
                      <Text fontWeight="bold" color="gray.700">Chat Médico</Text>
                    </HStack>
                    <Text fontSize="sm" color="gray.600">
                      {clientStats.onChainMessages} documentos seguros
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      Último documento: 20/01/2025
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
            </SimpleGrid>
          </VStack>

          <Divider />

          {/* Informações Importantes */}
          <Card bg={cardBg} size="sm">
            <CardBody>
              <VStack spacing={3} align="start">
                <Heading size="sm" color="gray.700">
                  📋 Status da Conta
                </Heading>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="full">
                  <HStack>
                    <Text fontSize="sm" color="gray.600">
                      📄 Documentos enviados:
                    </Text>
                    <Badge colorScheme="blue">
                      {clientStats.documentsShared}
                    </Badge>
                  </HStack>
                  <HStack>
                    <Text fontSize="sm" color="gray.600">
                      💳 Pagamentos pendentes:
                    </Text>
                    <Badge colorScheme={clientStats.pendingPayments > 0 ? "orange" : "green"}>
                      {clientStats.pendingPayments}
                    </Badge>
                  </HStack>
                  <HStack>
                    <Text fontSize="sm" color="gray.600">
                      📅 Última consulta:
                    </Text>
                    <Text fontSize="sm" fontWeight="semibold">
                      20/01/2025
                    </Text>
                  </HStack>
                  <HStack>
                    <Text fontSize="sm" color="gray.600">
                      🔐 Protocolo:
                    </Text>
                    <Badge colorScheme="purple">
                      CrypTalk SDK
                    </Badge>
                  </HStack>
                </SimpleGrid>
              </VStack>
            </CardBody>
          </Card>

          {/* Admin Access Button - Only for company wallet */}
          {walletAddress && walletAddress.toLowerCase() === '0x650687ad5f50e2df6763f300bcac9e03b4b4fcb6' && (
            <Card bg="purple.50" borderColor="purple.200" borderWidth={2}>
              <CardBody>
                <VStack spacing={3}>
                  <HStack>
                    <Icon as={FiShield} w={6} h={6} color="purple.600" />
                    <Heading size="md" color="purple.700">
                      Acesso Administrativo
                    </Heading>
                  </HStack>
                  <Text fontSize="sm" color="gray.600" textAlign="center">
                    Você está logado com a conta administrativa da Surgical Brasil
                  </Text>
                  <Button
                    colorScheme="purple"
                    size="lg"
                    onClick={() => navigate('/admin')}
                    w="full"
                  >
                    Acessar Painel Administrativo
                  </Button>
                </VStack>
              </CardBody>
            </Card>
          )}

        </VStack>
      </Container>
    </Box>
  );
};

export default ClientDashboard;