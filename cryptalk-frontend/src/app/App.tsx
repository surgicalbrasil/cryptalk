import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { Box, VStack, Heading, Text, Button, HStack, Badge } from '@chakra-ui/react';
import theme from './theme';

// Import the new modular system
import CrypTalk from '../index';

function App() {
  const [systemStatus, setSystemStatus] = React.useState<'loading' | 'ready' | 'error'>('loading');
  const [modules, setModules] = React.useState<any>(null);

  React.useEffect(() => {
    const initializeSystem = async () => {
      try {
        await CrypTalk.initialize();
        setModules(CrypTalk);
        setSystemStatus('ready');
      } catch (error) {
        console.error('Failed to initialize CrypTalk:', error);
        setSystemStatus('error');
      }
    };

    initializeSystem();
  }, []);

  const testModules = async () => {
    if (!modules) return;

    try {
      // Test overall system health
      const health = await CrypTalk.getHealth();
      console.log('System Health:', health);
    } catch (error) {
      console.error('Module test failed:', error);
    }
  };

  return (
    <ChakraProvider theme={theme}>
      <Box minH="100vh" bg="gray.50" p={8}>
        <VStack spacing={8} maxW="4xl" mx="auto">
          <VStack spacing={4} textAlign="center">
            <Heading size="2xl" color="blue.600">
              🎯 CrypTalk
            </Heading>
            <Text fontSize="xl" color="gray.600">
              Ultra-Modular Web3 Communication Platform
            </Text>
            <HStack>
              <Badge 
                colorScheme={systemStatus === 'ready' ? 'green' : systemStatus === 'error' ? 'red' : 'yellow'}
                size="lg"
              >
                {systemStatus === 'ready' ? '✅ System Ready' : 
                 systemStatus === 'error' ? '❌ System Error' : 
                 '⏳ Initializing...'}
              </Badge>
            </HStack>
          </VStack>

          {systemStatus === 'ready' && (
            <VStack spacing={6} w="full">
              <Heading size="lg">📦 Available Modules</Heading>
              
              <HStack spacing={8} justify="center" wrap="wrap">
                <VStack p={6} bg="white" rounded="lg" shadow="md" minW="200px">
                  <Text fontSize="2xl">💾</Text>
                  <Heading size="md">Storage</Heading>
                  <Text textAlign="center" color="gray.600">
                    Storacha (w3up) for decentralized file storage
                  </Text>
                </VStack>

                <VStack p={6} bg="white" rounded="lg" shadow="md" minW="200px">
                  <Text fontSize="2xl">💬</Text>
                  <Heading size="md">Chat</Heading>
                  <Text textAlign="center" color="gray.600">
                    CrypTalk SDK for timestamped messaging
                  </Text>
                </VStack>

                <VStack p={6} bg="white" rounded="lg" shadow="md" minW="200px">
                  <Text fontSize="2xl">💰</Text>
                  <Heading size="md">Payments</Heading>
                  <Text textAlign="center" color="gray.600">
                    MoonPay for fiat-to-crypto payments
                  </Text>
                </VStack>
              </HStack>

              <Button 
                colorScheme="blue" 
                size="lg" 
                onClick={testModules}
                leftIcon={<Text>🚀</Text>}
              >
                Test All Modules
              </Button>
            </VStack>
          )}

          {systemStatus === 'error' && (
            <VStack spacing={4}>
              <Text color="red.500" fontSize="lg">
                Failed to initialize the modular system.
              </Text>
              <Button 
                colorScheme="red" 
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </VStack>
          )}
        </VStack>
      </Box>
    </ChakraProvider>
  );
}

export default App;