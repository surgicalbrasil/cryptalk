import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Heading,
  Text,
  Divider,
  VStack,
  useToast,
  Badge,
  HStack
} from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import mcpService from '../services/MCPService';
import MCPMessageLog from './MCPMessageLog';

/**
 * MCPTestPanel component
 * This component provides a UI for testing MCP integration
 */
const MCPTestPanel: React.FC = () => {
  const { did } = useAuth();
  const [output, setOutput] = useState<string[]>([]);
  const [isMessagingConnected, setIsMessagingConnected] = useState(false);
  const [isPaymentConnected, setIsPaymentConnected] = useState(false);
  const [isTestingMessaging, setIsTestingMessaging] = useState(false);
  const [isTestingPayment, setIsTestingPayment] = useState(false);
  const toast = useToast();

  /**
   * Connect to messaging server
   */
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

    try {
      setIsTestingMessaging(true);
      addOutput('Connecting to MCP messaging server...');
      const success = await mcpService.connectToMessagingServer(did);
      
      if (success) {
        setIsMessagingConnected(true);
        addOutput('✅ Successfully connected to MCP messaging server');
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
      addOutput('❌ Error connecting to MCP messaging server');
      toast({
        title: 'Connection failed',
        description: 'Failed to connect to the MCP messaging server',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsTestingMessaging(false);
    }
  };

  /**
   * Test sending a message through MCP
   */
  const testSendMessage = async () => {
    if (!isMessagingConnected) {
      addOutput('❌ Please connect to the messaging server first');
      return;
    }

    try {
      setIsTestingMessaging(true);
      addOutput('Testing message sending through MCP...');
      
      const testMessage = {
        content: 'This is a test message from CrypTalk',
        sender: did || 'unknown',
        recipient: 'did:key:test-recipient',
        timestamp: new Date().toISOString(),
        type: 'text' as const
      };
      
      const success = await mcpService.sendMessageThroughMCP(testMessage);
      
      if (success) {
        addOutput('✅ Test message sent successfully through MCP');
        addOutput(`Message: "${testMessage.content}"`);
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error testing message sending:', error);
      addOutput('❌ Error sending test message through MCP');
    } finally {
      setIsTestingMessaging(false);
    }
  };

  /**
   * Connect to payment server
   */
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

    try {
      setIsTestingPayment(true);
      addOutput('Connecting to MCP payment server...');
      const success = await mcpService.connectToPaymentServer(did);
      
      if (success) {
        setIsPaymentConnected(true);
        addOutput('✅ Successfully connected to MCP payment server');
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
      addOutput('❌ Error connecting to MCP payment server');
      toast({
        title: 'Connection failed',
        description: 'Failed to connect to the MCP payment server',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsTestingPayment(false);
    }
  };

  /**
   * Test sending a payment through MCP
   */
  const testSendPayment = async () => {
    if (!isPaymentConnected) {
      addOutput('❌ Please connect to the payment server first');
      return;
    }

    try {
      setIsTestingPayment(true);
      addOutput('Testing payment sending through MCP...');
      
      const testPayment = {
        amount: 0.01,
        sender: '0x1234567890abcdef',
        recipient: '0xabcdef1234567890',
        timestamp: new Date().toISOString()
      };
      
      const success = await mcpService.sendPaymentThroughMCP(testPayment);
      
      if (success) {
        addOutput('✅ Test payment sent successfully through MCP');
        addOutput(`Amount: ${testPayment.amount} ETH`);
        addOutput(`Recipient: ${testPayment.recipient}`);
      } else {
        throw new Error('Failed to send payment');
      }
    } catch (error) {
      console.error('Error testing payment sending:', error);
      addOutput('❌ Error sending test payment through MCP');
    } finally {
      setIsTestingPayment(false);
    }
  };

  /**
   * Add output to the console
   */
  const addOutput = (message: string) => {
    setOutput(prev => [...prev, message]);
  };

  /**
   * Clear console output
   */
  const clearConsole = () => {
    setOutput([]);
  };

  return (
    <Card>
      <CardHeader pb={0}>
        <Heading size="md">MCP Integration Test</Heading>
      </CardHeader>
      <CardBody>
        <HStack mb={4}>
          <Box>
            <Text fontSize="sm" fontWeight="bold" mr={2} display="inline">
              Messaging:
            </Text>
            <Badge colorScheme={isMessagingConnected ? 'green' : 'red'}>
              {isMessagingConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </Box>
          
          <Box>
            <Text fontSize="sm" fontWeight="bold" mr={2} display="inline">
              Payments:
            </Text>
            <Badge colorScheme={isPaymentConnected ? 'green' : 'red'}>
              {isPaymentConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </Box>
        </HStack>

        <VStack gap={4} align="stretch">
          <Box>
            <Heading size="sm" mb={2}>Test Messaging</Heading>
            <HStack>
              <Button 
                size="sm" 
                colorScheme={isMessagingConnected ? 'red' : 'blue'}
                onClick={connectMessagingServer}
                isLoading={isTestingMessaging}
                loadingText="Connecting..."
                isDisabled={isMessagingConnected}
              >
                {isMessagingConnected ? 'Disconnect' : 'Connect'}
              </Button>
              <Button 
                size="sm" 
                colorScheme="green"
                onClick={testSendMessage}
                isLoading={isTestingMessaging}
                loadingText="Testing..."
                isDisabled={!isMessagingConnected}
              >
                Test Send Message
              </Button>
            </HStack>
          </Box>

          <Box>
            <Heading size="sm" mb={2}>Test Payments</Heading>
            <HStack>
              <Button 
                size="sm" 
                colorScheme={isPaymentConnected ? 'red' : 'blue'}
                onClick={connectPaymentServer}
                isLoading={isTestingPayment}
                loadingText="Connecting..."
                isDisabled={isPaymentConnected}
              >
                {isPaymentConnected ? 'Disconnect' : 'Connect'}
              </Button>
              <Button 
                size="sm" 
                colorScheme="green"
                onClick={testSendPayment}
                isLoading={isTestingPayment}
                loadingText="Testing..."
                isDisabled={!isPaymentConnected}
              >
                Test Send Payment
              </Button>
            </HStack>
          </Box>          <Box>
            <Heading size="sm" mb={2}>Console Output</Heading>
            <Box 
              bg="gray.800" 
              color="green.300" 
              p={3} 
              borderRadius="md" 
              fontFamily="monospace"
              height="200px"
              overflowY="auto"
            >
              {output.length > 0 ? (
                output.map((line, index) => (
                  <Text key={index} fontSize="xs">
                    {line}
                  </Text>
                ))
              ) : (
                <Text fontSize="xs" color="gray.500">No output yet...</Text>
              )}
            </Box>
          </Box>
          
          <Divider my={4} />
          
          {/* MCP Communication Log */}
          <MCPMessageLog />
        </VStack>
      </CardBody>
      <CardFooter pt={0}>
        <Button size="sm" onClick={clearConsole} variant="outline">
          Clear Console
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MCPTestPanel;
