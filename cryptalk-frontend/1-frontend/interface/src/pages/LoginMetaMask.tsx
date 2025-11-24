import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  VStack,
  Text,
  Heading,
  useToast,
  Container,
  Alert,
  AlertIcon,
  Divider,
  Center,
  Flex,
  Image
} from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import AppConfig from '../config/AppConfig';

// For TypeScript - MetaMask window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

const LoginMetaMask: React.FC = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const { login, isLoading, loginError } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  // Check if MetaMask is installed
  useEffect(() => {
    if (window.ethereum) {
      setIsMetaMaskInstalled(true);
      
      // Check if already connected
      window.ethereum.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
          }
        })
        .catch(console.error);
    }
  }, []);

  // Handle MetaMask connection
  const connectMetaMask = async () => {
    if (!window.ethereum) {
      toast({
        title: 'MetaMask not found',
        description: 'Please install MetaMask extension to continue',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsConnecting(true);
      
      // Request account access using eth_requestAccounts method
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }
      
      const address = accounts[0];
      setWalletAddress(address);

      // Generate a DID from the Ethereum address (just for our system's use)
      const did = `did:eth:${address}`;
      
      // Get chain ID to verify we're on the correct network
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      console.log(`Connected to chain ID: ${chainId}`);
      
      // Login with the generated DID
      const result = await login(did, false);
      
      if (result.success) {
        toast({
          title: 'Login successful',
          description: 'You have successfully logged in with MetaMask',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        navigate('/workflow');
      } else {
        throw new Error(result.error || 'Failed to login');
      }
    } catch (error) {
      console.error('MetaMask login error:', error);
      toast({
        title: 'Login failed',
        description: error instanceof Error ? error.message : 'Failed to connect MetaMask',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Container maxW="md" py={12}>
      <VStack spacing={8} align="stretch">
        <VStack spacing={3} textAlign="center">
          <Heading>Welcome to CrypTalk</Heading>
          <Text color="gray.600">
            Secure messaging for {AppConfig.serviceProvider.name}
          </Text>
        </VStack>

        <Box p={6} borderWidth={1} borderRadius="lg" bg="white" boxShadow="sm">
          <VStack spacing={6}>
            <Box textAlign="center" w="full">
              <Heading size="md" mb={2}>Login with MetaMask</Heading>
              <Text fontSize="sm" color="gray.600">
                Connect your MetaMask wallet to access secure messaging and file transfers.
              </Text>
            </Box>
            
            <Flex direction="column" align="center" justify="center" w="full">
              {/* MetaMask logo would go here */}
              <Box p={4} borderRadius="full" bg="orange.50" mb={4}>
                <Text fontSize="2xl">🦊</Text>
              </Box>
            </Flex>

            <Button
              colorScheme="orange"
              size="lg"
              width="full"
              onClick={connectMetaMask}
              isLoading={isConnecting || isLoading}
              loadingText="Connecting..."
              disabled={!isMetaMaskInstalled}
            >
              {isMetaMaskInstalled ? 'Connect MetaMask' : 'Install MetaMask'}
            </Button>

            {!isMetaMaskInstalled && (
              <Alert status="warning">
                <AlertIcon />
                <Box>
                  <Text>MetaMask is not installed or not detected in your browser.</Text>
                  <Button 
                    as="a" 
                    href="https://metamask.io" 
                    target="_blank"
                    size="sm" 
                    colorScheme="blue" 
                    variant="link" 
                    mt={1}
                  >
                    Install MetaMask
                  </Button>
                </Box>
              </Alert>
            )}

            {loginError && (
              <Alert status="error">
                <AlertIcon />
                <Text>{loginError}</Text>
              </Alert>
            )}
          </VStack>
        </Box>
        
        <Divider />
        
        <Text textAlign="center" fontSize="sm" color="gray.500">
          © {new Date().getFullYear()} {AppConfig.serviceProvider.name}. All rights reserved.
        </Text>
      </VStack>
    </Container>
  );
};

export default LoginMetaMask;
