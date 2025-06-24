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
  Input,
  FormControl,
  FormLabel,
  Divider,
  Flex,
  HStack,
  Card,
  CardBody,
  CardHeader,
  Grid,
  Badge
} from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import AppConfig from '../config/AppConfig';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMetaMaskLoading, setIsMetaMaskLoading] = useState(false);
  const { loginWithEmail, isEmailAuthenticated, isInitialized, connectWallet } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  // Redirect if already authenticated
  useEffect(() => {
    if (isInitialized && isEmailAuthenticated) {
      navigate('/dashboard');
    }
  }, [isInitialized, isEmailAuthenticated, navigate]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: 'Email required',
        description: 'Please enter your email address',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsLoading(true);
      const result = await loginWithEmail(email);
      
      if (result.success) {
        toast({
          title: 'Check your email',
          description: 'We sent you a magic link to sign in. Click the link in your email to complete authentication.',
          status: 'success',
          duration: 10000,
          isClosable: true,
        });
        // Note: The user will be redirected when they click the magic link in their email
        // and return to the application
      } else {
        toast({
          title: 'Login failed',
          description: result.error || 'Failed to send magic link',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Email login error:', error);
      toast({
        title: 'Login failed',
        description: error instanceof Error ? error.message : 'Failed to send magic link',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMetaMaskConnect = async () => {
    try {
      setIsMetaMaskLoading(true);
      
      // Check if MetaMask is installed
      if (!window.ethereum) {
        toast({
          title: 'MetaMask not found',
          description: 'Please install MetaMask extension to connect your wallet.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        toast({
          title: 'No accounts found',
          description: 'Please unlock your MetaMask wallet and try again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      const walletAddress = accounts[0];
      
      toast({
        title: 'Wallet Connected',
        description: `Connected to ${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Navigate to dashboard
      navigate('/dashboard');
      
    } catch (error) {
      console.error('MetaMask connection error:', error);
      toast({
        title: 'Connection failed',
        description: error instanceof Error ? error.message : 'Failed to connect to MetaMask',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsMetaMaskLoading(false);
    }
  };

  return (
    <Box maxW="1200px" mx="auto" p={6} bg="gray.50" minH="calc(100vh - 64px)">
      {/* Header */}
      <VStack spacing={4} mb={8} textAlign="center">
        <Heading size="2xl" color="gray.800">
          Welcome to CrypTalk Platform
        </Heading>
        <Text fontSize="lg" color="gray.600" maxW="2xl">
          Choose your preferred authentication method to access secure document sharing and blockchain features
        </Text>
      </VStack>

      {/* Main Authentication Options */}
      <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={8} mb={8}>
        {/* Email Authentication Card */}
        <Card>
          <CardHeader bg="blue.50">
            <VStack spacing={2}>
              <Text fontSize="3xl">📧</Text>
              <Heading size="md">Email Authentication</Heading>
            </VStack>
          </CardHeader>
          <CardBody>
            <VStack spacing={6} align="stretch">
              <Alert status="info">
                <AlertIcon />
                <Box>
                  <Text fontWeight="bold">Magic Link Login</Text>
                  <Text fontSize="sm">Secure, passwordless authentication via email</Text>
                </Box>
              </Alert>

              <VStack spacing={4} align="start">
                <Text fontWeight="bold">Why Use Email Login?</Text>
                <VStack spacing={2} align="start" pl={4}>
                  <Text fontSize="sm">• 🔒 No passwords to remember</Text>
                  <Text fontSize="sm">• ⚡ Instant access via magic link</Text>
                  <Text fontSize="sm">• 📁 Full access to Off Chain features</Text>
                  <Text fontSize="sm">• 🔗 Can connect wallet later for On Chain features</Text>
                </VStack>
              </VStack>

              <form onSubmit={handleEmailLogin} style={{ width: '100%' }}>
                <VStack spacing={4} w="full">
                  <FormControl isRequired>
                    <FormLabel fontWeight="bold">Email Address</FormLabel>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      size="lg"
                      bg="white"
                    />
                  </FormControl>

                  <Button
                    type="submit"
                    colorScheme="blue"
                    size="lg"
                    width="full"
                    isLoading={isLoading}
                    loadingText="Sending magic link..."
                    leftIcon={<Text>📧</Text>}
                  >
                    Send Magic Link
                  </Button>
                </VStack>
              </form>

              <Divider />
              
              {/* Email authentication status */}
              <VStack spacing={4} align="stretch" p={4} bg="blue.50" borderRadius="md">
                <Text fontWeight="bold" color="blue.700">📱 How It Works</Text>
                <Text color="blue.600" fontSize="sm">
                  1. Enter your email address above<br/>
                  2. Check your inbox for the magic link<br/>
                  3. Click the link to instantly sign in<br/>
                  4. Access your secure data room
                </Text>
              </VStack>
            </VStack>
          </CardBody>
        </Card>

        {/* Wallet Authentication Card */}
        <Card>
          <CardHeader bg="orange.50">
            <VStack spacing={2}>
              <Text fontSize="3xl">🦊</Text>
              <Heading size="md">Wallet Authentication</Heading>
            </VStack>
          </CardHeader>
          <CardBody>
            <VStack spacing={6} align="stretch">
              <Alert status="warning">
                <AlertIcon />
                <Box>
                  <Text fontWeight="bold">MetaMask Required</Text>
                  <Text fontSize="sm">Connect your wallet for blockchain features</Text>
                </Box>
              </Alert>

              <VStack spacing={4} align="start">
                <Text fontWeight="bold">Why Use Wallet Login?</Text>
                <VStack spacing={2} align="start" pl={4}>
                  <Text fontSize="sm">• 🔗 Direct blockchain access</Text>
                  <Text fontSize="sm">• 💰 Cryptocurrency payments</Text>
                  <Text fontSize="sm">• ⏰ Timestamped secure chat</Text>
                  <Text fontSize="sm">• 🔐 Ultimate security & privacy</Text>
                </VStack>
              </VStack>

              <Button
                onClick={handleMetaMaskConnect}
                colorScheme="orange"
                size="lg"
                width="full"
                isLoading={isMetaMaskLoading}
                loadingText="Connecting MetaMask..."
                leftIcon={<Text>🦊</Text>}
              >
                Connect MetaMask Wallet
              </Button>

              <Divider />
              
              {/* Wallet authentication info */}
              <VStack spacing={4} align="stretch" p={4} bg="orange.50" borderRadius="md">
                <Text fontWeight="bold" color="orange.700">⚡ Instant Access</Text>
                <Text color="orange.600" fontSize="sm">
                  • Connect your MetaMask wallet<br/>
                  • Sign the authentication message<br/>
                  • Access all platform features<br/>
                  • Use blockchain capabilities
                </Text>
              </VStack>

              {!window.ethereum && (
                <Alert status="error" size="sm">
                  <AlertIcon />
                  <VStack align="start" spacing={1} w="full">
                    <Text fontSize="sm" fontWeight="bold">MetaMask Not Detected</Text>
                    <Text fontSize="xs">
                      Please install MetaMask extension to use wallet authentication
                    </Text>
                  </VStack>
                </Alert>
              )}
            </VStack>
          </CardBody>
        </Card>
      </Grid>

      {/* Feature Comparison */}
      <Card>
        <CardHeader bg="gray.50">
          <Heading size="md" textAlign="center">🔍 Choose Your Authentication Method</Heading>
        </CardHeader>
        <CardBody>
          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }} gap={6}>
            <VStack spacing={3}>
              <Text fontWeight="bold" color="blue.600">📧 Email Login</Text>
              <Badge colorScheme="blue">Recommended for Most Users</Badge>
              <VStack spacing={1} fontSize="sm">
                <Text>✅ Off Chain Data Room</Text>
                <Text>✅ NDA Creation & AI Review</Text>
                <Text>✅ Document Upload & Management</Text>
                <Text>🔗 Connect wallet later for payments</Text>
              </VStack>
            </VStack>

            <VStack spacing={3}>
              <Text fontWeight="bold" color="orange.600">🦊 Wallet Login</Text>
              <Badge colorScheme="orange">For Blockchain Features</Badge>
              <VStack spacing={1} fontSize="sm">
                <Text>✅ All Email Login Features</Text>
                <Text>✅ Cryptocurrency Payments</Text>
                <Text>✅ Timestamped Secure Chat</Text>
                <Text>✅ Blockchain Verification</Text>
              </VStack>
            </VStack>

            <VStack spacing={3}>
              <Text fontWeight="bold" color="purple.600">🔗 Hybrid Approach</Text>
              <Badge colorScheme="purple">Maximum Flexibility</Badge>
              <VStack spacing={1} fontSize="sm">
                <Text>1. Start with Email Login</Text>
                <Text>2. Explore Off Chain features</Text>
                <Text>3. Connect wallet when needed</Text>
                <Text>4. Access all capabilities</Text>
              </VStack>
            </VStack>
          </Grid>
        </CardBody>
      </Card>

      {/* Footer */}
      <Text textAlign="center" fontSize="sm" color="gray.500" mt={8}>
        © {new Date().getFullYear()} {AppConfig.serviceProvider.name}. All rights reserved.
      </Text>
    </Box>
  );
};

export default Login;