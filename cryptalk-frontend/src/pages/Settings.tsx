import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Switch,
  FormControl,
  FormLabel,
  Alert,
  AlertIcon,
  Divider,
  Badge,
  useToast
} from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import mcpService from '../services/MCPService';
import MCPTestPanel from '../components/MCPTestPanel';

// Note: In a web application, we can't directly start Node.js servers
// This page would interact with already-running MCP servers in a real implementation
const Settings: React.FC = () => {
  const { did } = useAuth();
  const [messagingConnected, setMessagingConnected] = useState(false);
  const [paymentConnected, setPaymentConnected] = useState(false);
  const [isConnectingMessaging, setIsConnectingMessaging] = useState(false);
  const [isConnectingPayment, setIsConnectingPayment] = useState(false);
  const toast = useToast();

  // Connect to messaging server
  const connectMessagingServer = async () => {
    if (!did) {
      toast({
        title: 'Authentication required',
        description: 'You need to be authenticated to connect to the MCP server',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsConnectingMessaging(true);
    
    try {
      const success = await mcpService.connectToMessagingServer(did);
      
      if (success) {
        setMessagingConnected(true);
        toast({
          title: 'Connected',
          description: 'Successfully connected to the MCP messaging server',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error('Failed to connect');
      }
    } catch (error) {
      console.error('Error connecting to messaging server:', error);
      toast({
        title: 'Connection failed',
        description: 'Failed to connect to the MCP messaging server',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsConnectingMessaging(false);
    }
  };

  // Connect to payment server
  const connectPaymentServer = async () => {
    if (!did) {
      toast({
        title: 'Authentication required',
        description: 'You need to be authenticated to connect to the MCP server',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsConnectingPayment(true);
    
    try {
      const success = await mcpService.connectToPaymentServer(did);
      
      if (success) {
        setPaymentConnected(true);
        toast({
          title: 'Connected',
          description: 'Successfully connected to the MCP payment server',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error('Failed to connect');
      }
    } catch (error) {
      console.error('Error connecting to payment server:', error);
      toast({
        title: 'Connection failed',
        description: 'Failed to connect to the MCP payment server',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsConnectingPayment(false);
    }
  };

  return (
    <Box maxW="1200px" mx="auto" p={5}>
      <Heading mb={4} size="lg">Settings</Heading>

      <Alert status="info" mb={6} borderRadius="md">
        <AlertIcon />
        <Box>
          <Text fontWeight="bold">MCP Integration Demo</Text>
          <Text>Connect to the MCP extension demo servers to enable off-chain messaging and payment functionality</Text>
        </Box>
      </Alert>
      
      <VStack gap={4} align="stretch">
        {/* Messaging Server Connection */}
        <Card>
          <CardHeader pb={0}>
            <Heading size="md">MCP Messaging Server</Heading>
          </CardHeader>
          <CardBody>
            <Text mb={4}>
              Connect to the MCP messaging server to enable off-chain messaging functionality.
            </Text>
            <HStack>
              <Text>Status:</Text>
              <Badge colorScheme={messagingConnected ? 'green' : 'red'}>
                {messagingConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </HStack>
          </CardBody>
          <CardFooter pt={0}>
            <Button
              colorScheme={messagingConnected ? 'red' : 'green'}
              onClick={connectMessagingServer}
              isLoading={isConnectingMessaging}
              loadingText="Connecting..."
              isDisabled={messagingConnected}
            >
              {messagingConnected ? 'Disconnect' : 'Connect'}
            </Button>
          </CardFooter>
        </Card>

        {/* Payment Server Connection */}
        <Card>
          <CardHeader pb={0}>
            <Heading size="md">MCP Payment Server</Heading>
          </CardHeader>
          <CardBody>
            <Text mb={4}>
              Connect to the MCP payment server to enable cryptocurrency payment functionality.
            </Text>
            <HStack>
              <Text>Status:</Text>
              <Badge colorScheme={paymentConnected ? 'green' : 'red'}>
                {paymentConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </HStack>
          </CardBody>
          <CardFooter pt={0}>
            <Button
              colorScheme={paymentConnected ? 'red' : 'green'}
              onClick={connectPaymentServer}
              isLoading={isConnectingPayment}
              loadingText="Connecting..."
              isDisabled={paymentConnected}
            >
              {paymentConnected ? 'Disconnect' : 'Connect'}
            </Button>
          </CardFooter>
        </Card>        {/* Web3.Storage Settings */}
        <Card>
          <CardHeader pb={0}>
            <Heading size="md">Web3.Storage Settings</Heading>
          </CardHeader>
          <CardBody>
            <Text mb={4}>
              Your data is stored on Web3.Storage using decentralized storage with your DID authentication.
            </Text>
            <HStack>
              <Text>Your DID:</Text>
              <Text fontWeight="bold" fontSize="sm" wordBreak="break-all">
                {did || 'Not authenticated'}
              </Text>
            </HStack>
          </CardBody>
        </Card>

        {/* MCP Test Panel */}
        <Box mt={6}>
          <Heading size="md" mb={4}>MCP Integration Testing</Heading>
          <MCPTestPanel />
        </Box>
      </VStack>
    </Box>
  );
};

export default Settings;
